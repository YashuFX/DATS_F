"use client";

import { useEffect } from "react";
import { useSimStore } from "./simStore";

/**
 * Drives the simulation clock while it is running.
 *
 * `setInterval` at 4 Hz, not `requestAnimationFrame`. rAF would tie the
 * propagation rate to the display's refresh — 120 Hz on a good monitor, where
 * re-propagating 70 spacecraft and re-planning 416 beams 120 times a second is
 * pure waste for a picture that cannot change meaningfully between frames. A
 * fixed 4 Hz keeps the readouts live and the cost predictable, and rAF also
 * stops entirely in a background tab, which would silently freeze the clock
 * rather than let it run on.
 *
 * Elapsed REAL time is measured per tick rather than assumed to be the
 * interval: a busy main thread delivers late timers, and assuming 250 ms would
 * make the simulated clock drift slower than the wall clock under load.
 *
 * ---- one interval, however many mounts ----
 *
 * `advance` is fed the MEASURED elapsed time since the last tick, so two
 * intervals would each hand it a full interval's worth and the simulated clock
 * would run at double speed — silently, and only on whichever screen happened
 * to mount two displays. That became a live risk the moment the tracking
 * display was shared between the board and the tracking console, so the
 * invariant is enforced here rather than left as a rule for callers to keep.
 */

let clockRefs = 0;
let clockTimer: number | undefined;
let clockLast = 0;

function acquireClock(): () => void {
  clockRefs += 1;
  if (clockRefs === 1) {
    clockLast = performance.now();
    clockTimer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - clockLast;
      clockLast = now;
      useSimStore.getState().advance(delta);
    }, 250);
  }
  return () => {
    clockRefs -= 1;
    if (clockRefs === 0 && clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

export function useSimClock() {
  const running = useSimStore((s) => s.running);

  // Paint the sky once on mount, before anything is running. Without this the
  // panel opens on an empty globe and the operator has to press Start to
  // discover there is a catalogue at all — the static sky is the resting
  // state, not a blank one.
  useEffect(() => {
    if (useSimStore.getState().states.length === 0) useSimStore.getState().reset();
  }, []);

  useEffect(() => {
    if (!running) return;
    return acquireClock();
  }, [running]);
}
