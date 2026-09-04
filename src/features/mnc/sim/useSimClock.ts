"use client";

import { useEffect, useRef } from "react";
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
 */
export function useSimClock() {
  const running = useSimStore((s) => s.running);
  const last = useRef(0);

  // Paint the sky once on mount, before anything is running. Without this the
  // panel opens on an empty globe and the operator has to press Start to
  // discover there is a catalogue at all — the static sky is the resting
  // state, not a blank one.
  useEffect(() => {
    if (useSimStore.getState().states.length === 0) useSimStore.getState().reset();
  }, []);

  useEffect(() => {
    if (!running) return;
    last.current = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last.current;
      last.current = now;
      useSimStore.getState().advance(delta);
    }, 250);

    return () => window.clearInterval(id);
  }, [running]);
}
