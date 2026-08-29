"use client";

import { useEffect, useRef } from "react";
import { useDomeStore } from "../store/domeStore";
import { buildMockTelemetry } from "../data/telemetry.mock";

const TICK_MS = 4000;

/**
 * Simulates a live telemetry link — until B2 lands a real one (PHASEPLAN §3
 * B2), this is what proves the rest of the pipeline (staleness detection,
 * the readiness verdict, alarms reacting to a changing dome) actually works
 * end to end rather than against one static snapshot.
 *
 * The seed advances by tick rather than reseeding from wall-clock time, so
 * each tick is still a deterministic function of tick count — same
 * discipline as the rest of the mock data, just advancing instead of static.
 * The fault band on face 5 is index-based, not rng-based, so its *location*
 * stays put between ticks the way a real intermittent fault would; only the
 * exact severity within it and the sparse background noise drift.
 */
export function useMockTelemetryFeed() {
  const tick = useRef(0);
  const paused = useDomeStore((s) => s.feedPaused);

  useEffect(() => {
    // Holding the feed stops the clock, it does not rewind it: `tick` lives
    // in a ref, so resuming carries on from where the link left off rather
    // than snapping the dome back to tick 0.
    if (paused) return;

    const id = window.setInterval(() => {
      tick.current += 1;
      useDomeStore.getState().updateTelemetry(buildMockTelemetry(0xd0_e1 + tick.current));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [paused]);
}
