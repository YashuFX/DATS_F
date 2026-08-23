"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The power-on health check.
 *
 * Walks the subsystem list one at a time, marking each OK before starting the
 * next, and reports a percentage that the console uses for two things: to draw
 * the gauge, and to decide how much of the schedule has finished loading.
 *
 * Ported from the standalone Initialize page. The logic is the same walk; what
 * changed is that the percentage is now derived from a monotonic step count
 * rather than from a re-scan of the list, so it can only ever go forward, and
 * that the smoothing runs off the same `requestAnimationFrame` loop the source
 * used.
 */

export type SubsystemStatus = "ok" | "testing" | "pending";

export interface Subsystem {
  id: string;
  name: string;
  status: SubsystemStatus;
  detail: string;
}

/** Milliseconds per subsystem. Eleven of them, so a full check runs about 7s. */
const STEP_MS = 620;

const SUBSYSTEMS: readonly Omit<Subsystem, "status">[] = [
  {
    id: "rf-frontend",
    name: "RF Frontend Module",
    detail: "Verifying frontend gain and noise figure…",
  },
  {
    id: "rf-gain",
    name: "RF Gain Module",
    detail: "Calibrating amplifier gain stages…",
  },
  {
    id: "fiber",
    name: "Fiber Optical Network",
    detail: "Testing optical link throughput and latency…",
  },
  {
    id: "antenna",
    name: "Antenna System (8×8 tile)",
    detail: "Running phased-array beam pattern diagnostics…",
  },
  {
    id: "calibration",
    name: "Calibration Module",
    detail: "Aligning frequency reference oscillators…",
  },
  {
    id: "beamforming",
    name: "Beamforming Engine",
    detail: "Verifying response and subsystem integrity…",
  },
  {
    id: "signal",
    name: "Signal Processing Module",
    detail: "Testing DSP vector math and FFT cores…",
  },
  {
    id: "data",
    name: "Data Handling Unit",
    detail: "Checking DMA buffer transfer channels…",
  },
  {
    id: "scheduler",
    name: "Scheduler Module",
    detail: "Validating real-time task queue execution…",
  },
  {
    id: "monitoring",
    name: "Monitoring & Control",
    detail: "Polling telemetry sensors and alerts…",
  },
  {
    id: "storage",
    name: "Storage System",
    detail: "Testing NVMe flash array write throughput…",
  },
];

const listAt = (step: number): Subsystem[] =>
  SUBSYSTEMS.map((item, i) => ({
    ...item,
    status: i < step ? "ok" : i === step ? "testing" : "pending",
  }));

export interface HealthCheck {
  subsystems: Subsystem[];
  /** Whole percent, for the numeral. */
  percent: number;
  /** Sub-percent, for the arc — an arc that steps in whole percent looks broken. */
  smoothPercent: number;
  active: Subsystem | null;
  isComplete: boolean;
  isCancelled: boolean;
  cancel: () => void;
  restart: () => void;
}

export function useHealthCheck({ running }: { running: boolean }): HealthCheck {
  const [step, setStep] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  const total = SUBSYSTEMS.length;
  const isComplete = step >= total;

  /* Walk the list. */
  useEffect(() => {
    if (!running || cancelled || isComplete) return;
    const id = window.setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => window.clearInterval(id);
  }, [running, cancelled, isComplete]);

  /**
   * Ease the arc toward the step's target instead of snapping to it.
   *
   * Held in a ref and mirrored into state so the rAF loop can read the latest
   * value without restarting itself on every frame.
   */
  const target = cancelled
    ? (step / total) * 100
    : isComplete
      ? 100
      : ((step + 0.5) / total) * 100;
  const smoothRef = useRef(0);
  const [smooth, setSmooth] = useState(0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const gap = target - smoothRef.current;
      if (Math.abs(gap) < 0.05) {
        smoothRef.current = target;
      } else {
        smoothRef.current += gap * 0.08;
      }
      setSmooth(smoothRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const restart = useCallback(() => {
    smoothRef.current = 0;
    setSmooth(0);
    setStep(0);
    setCancelled(false);
  }, []);

  const subsystems = cancelled
    ? listAt(step).map((s) =>
        s.status === "testing" ? { ...s, status: "pending" as const } : s,
      )
    : listAt(step);

  return {
    subsystems,
    percent: Math.round(smooth),
    smoothPercent: smooth,
    active: step < total ? (subsystems[step] ?? null) : null,
    isComplete,
    isCancelled: cancelled,
    cancel: useCallback(() => setCancelled(true), []),
    restart,
  };
}
