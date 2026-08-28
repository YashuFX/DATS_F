"use client";

import { useEffect, useState } from "react";

/** A clock tick for components that need to re-evaluate elapsed time (data
 *  age, readiness staleness, alarm shelve expiry) without a telemetry change. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
