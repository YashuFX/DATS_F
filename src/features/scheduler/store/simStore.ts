"use client";

import { create } from "zustand";
import type { LogEntry } from "../types";

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

interface SimState {
  /** Seconds of simulated time since the runtime started. */
  elapsedSec: number;
  paused: boolean;
  /** Simulated seconds per real second. */
  speed: number;
  /** Operator actions, which are events rather than functions of the clock. */
  operatorLog: LogEntry[];

  advance: (deltaSec: number) => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  logEvent: (entry: LogEntry) => void;
}

export const useSimStore = create<SimState>()((set) => ({
  // Starts at zero on the server and on the first client render, so hydration
  // matches before anything moves.
  elapsedSec: 0,
  paused: false,
  // A pass runs 6-19 minutes, so at 1x its bar advances about a tenth of a
  // percent per second — real, but indistinguishable from frozen. The console
  // opens at 20x, where a pass plays out in well under a minute.
  speed: 20,
  operatorLog: [],

  advance: (deltaSec) =>
    set((state) => ({ elapsedSec: state.elapsedSec + deltaSec })),
  setPaused: (paused) => set({ paused }),
  setSpeed: (speed) => set({ speed }),
  logEvent: (entry) =>
    set((state) => ({ operatorLog: [entry, ...state.operatorLog] })),
}));
