"use client";

import { useEffect, useState } from "react";

/**
 * The scheduler's simulated clock.
 *
 * Returns seconds elapsed since the screen mounted, advanced by `speed`
 * simulated seconds per real second and frozen while `paused`. Everything
 * time-dependent on this screen derives from it: how far each task has slid
 * toward the playhead, whether a pass has become live or finished, and how full
 * its progress bar is.
 *
 * Ticks at 20 Hz rather than once a second, because a one-second step moves
 * every task a full second's worth of distance at once and that reads as a
 * stutter.
 *
 * Ticking pauses while the tab is hidden, so a console left open overnight does
 * not wake up hours ahead of its own schedule, and the value starts at 0 on the
 * server and on first client render so hydration matches before anything moves.
 */
export function useSimClock({ paused, speed }: { paused: boolean; speed: number }): number {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (paused) return;

    // 20 Hz. A one-second tick moved every task a whole second's worth of
    // distance at once, which reads as a stutter — most visibly at 20x, where
    // each jump was twenty seconds of travel. Fifty milliseconds is well past
    // the point where motion stops reading as a step, and unlike
    // requestAnimationFrame it keeps running under a headless virtual clock,
    // so this behaviour stays testable.
    const STEP_MS = 50;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsedSec((previous) => previous + (STEP_MS / 1000) * speed);
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [paused, speed]);

  return elapsedSec;
}
