"use client";

import { useEffect, useState } from "react";
import { archivalConfig } from "../config";

/**
 * Demo timeline clock.
 *
 * Returns `archivalConfig.demoEpoch` on the server and on first client render —
 * identical strings on both sides, so hydration never mismatches — then starts
 * advancing in real time after mount. The board therefore stays anchored to the
 * approved design's date (20 May 2025) while still visibly ticking.
 *
 * Ticking pauses while the tab is hidden so a demo left open overnight does not
 * wake up hours ahead of its own data.
 */
export function useDemoClock(intervalMs: number = archivalConfig.tickMs): number {
  const [now, setNow] = useState(archivalConfig.demoEpoch);

  useEffect(() => {
    let mountedAt = Date.now();
    let elapsedBefore = 0;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setNow(archivalConfig.demoEpoch + elapsedBefore + (Date.now() - mountedAt));
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        mountedAt = Date.now();
      } else {
        elapsedBefore += Date.now() - mountedAt;
      }
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
