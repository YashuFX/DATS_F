"use client";

import { create } from "zustand";
import type { LogEntry, SatellitePass } from "../types";

/**
 * The simulation clock, as a store rather than component state.
 *
 * It moved out of `SchedulerScreen` for one reason: the archive has to keep
 * filling while you are reading Task History. If the clock lives in the
 * scheduler screen it stops the moment you navigate away, and history only ever
 * gains records when you happen to be watching the timeline — which is exactly
 * backwards.
 *
 * A store also solves the cost of a 20 Hz tick. Components subscribe with
 * selectors, so the timeline re-renders on every tick because it reads
 * `elapsedSec`, while the history table does not read it and therefore never
 * re-renders at all.
 *
 * Deliberately not persisted: the clock is session state, and a console that
 * resumed four hours into its own schedule after a reload would be a bug.
 */

/**
 * Where the console is in its power-on sequence.
 *
 * `idle` is a cold console: no schedule, no clock. Nothing is booked until the
 * health check has run, which is the honest state — a ground station does not
 * have a task list before its subsystems have answered.
 */
export type InitState = "idle" | "running" | "ready";

interface SimState {
  initState: InitState;
  /**
   * How many of the shipped passes have finished loading.
   *
   * Driven by the health check's progress, so the schedule fills in as the
   * subsystems come up rather than appearing all at once at the end.
   */
  loadedPassCount: number;

  /** Seconds of simulated time since the runtime started. */
  elapsedSec: number;
  paused: boolean;
  /** Simulated seconds per real second. */
  speed: number;
  /** Operator actions, which are events rather than functions of the clock. */
  operatorLog: LogEntry[];
  /**
   * Tasks committed from the New Task dialog during this run, kept apart from
   * the shipped schedule so Initialize can drop them without touching it.
   */
  addedPasses: SatellitePass[];

  advance: (deltaSec: number) => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  logEvent: (entry: LogEntry) => void;
  addPass: (pass: SatellitePass) => void;

  /** Begin the health check. Clears the run so the schedule reloads from cold. */
  beginInitialize: (log: LogEntry[]) => void;
  /** Report health-check progress as a fraction, 0–1. */
  setLoadProgress: (fraction: number, totalPasses: number) => void;
  /** Health check passed: the console is live. */
  completeInitialize: (log: LogEntry) => void;
  /** Health check stopped. The console stays cold. */
  abortInitialize: (log: LogEntry) => void;
}

export const useSimStore = create<SimState>()((set) => ({
  // Starts at zero on the server and on the first client render, so hydration
  // matches before anything moves.
  initState: "idle",
  loadedPassCount: 0,
  elapsedSec: 0,
  paused: false,
  // A pass runs 6-19 minutes, so at 1x its bar advances about a tenth of a
  // percent per second — real, but indistinguishable from frozen. The console
  // opens at 20x, where a pass plays out in well under a minute.
  speed: 20,
  operatorLog: [],
  addedPasses: [],

  advance: (deltaSec) =>
    set((state) => ({ elapsedSec: state.elapsedSec + deltaSec })),
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  logEvent: (entry) =>
    set((state) => ({ operatorLog: [entry, ...state.operatorLog] })),

  addPass: (pass) =>
    set((state) => ({ addedPasses: [...state.addedPasses, pass] })),

  beginInitialize: (log) =>
    set({
      initState: "running",
      loadedPassCount: 0,
      elapsedSec: 0,
      paused: false,
      addedPasses: [],
      operatorLog: log,
    }),

  setLoadProgress: (fraction, totalPasses) =>
    set((state) => {
      const loaded = Math.round(
        Math.max(0, Math.min(1, fraction)) * totalPasses,
      );
      // Monotonic, and a no-op when nothing changed — this is called on every
      // animation frame of the gauge.
      return loaded > state.loadedPassCount
        ? { loadedPassCount: loaded }
        : state;
    }),

  completeInitialize: (log) =>
    set((state) => ({
      initState: "ready",
      elapsedSec: 0,
      operatorLog: [log, ...state.operatorLog],
    })),

  abortInitialize: (log) =>
    set((state) => ({
      initState: "idle",
      loadedPassCount: 0,
      operatorLog: [log, ...state.operatorLog],
    })),
}));
