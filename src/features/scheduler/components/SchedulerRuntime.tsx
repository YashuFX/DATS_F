"use client";

import { useEffect } from "react";
import { PASSES } from "../data/schedule";
import { useArchiveRehydration } from "../hooks/usePassArchive";
import { MISSION_EPOCH_MS, liveStateOf } from "../lib/live";
import { usePassHistoryStore } from "../store/passHistoryStore";
import { useSimStore } from "../store/simStore";

/**
 * The scheduler's engine. Renders nothing.
 *
 * Mounted in the section layout, above both routes, so it keeps running while
 * you read Task History. That is the whole point of it: a task that reaches
 * 100% has to land in the archive at the moment it finishes, whichever of the
 * two screens you happen to be looking at, with no reload.
 *
 * It never re-renders on a tick. The clock advances through the store and the
 * archive watch is a store subscription, so both live outside React's render
 * cycle — twenty times a second costs two function calls, not a re-render of
 * the console.
 */
export function SchedulerRuntime() {
  const paused = useSimStore((s) => s.paused);
  const speed = useSimStore((s) => s.speed);

  useArchiveRehydration();

  /* The clock. */
  useEffect(() => {
    if (paused) return;

    // 20 Hz. A one-second tick moves every task a whole second's worth of
    // distance at once, which reads as a stutter — most visibly at 20x, where
    // each jump is twenty seconds of travel. Fifty milliseconds is well past
    // the point where motion stops reading as a step, and unlike
    // requestAnimationFrame it keeps running under a headless virtual clock, so
    // this behaviour stays testable.
    const STEP_MS = 50;

    const id = window.setInterval(() => {
      // A console left open overnight should not wake up hours ahead of its own
      // schedule.
      if (document.visibilityState !== "visible") return;
      useSimStore.getState().advance((STEP_MS / 1000) * speed);
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [paused, speed]);

  /* The archive watch. */
  useEffect(() => {
    /**
     * Passes already finished when the console opened. Seeded on the first
     * observation and never re-archived, so only passes that complete while you
     * are watching are logged — the rest are history that predates this run.
     */
    let seen: Set<string> | null = null;

    const settle = (elapsedSec: number) => {
      const finished = PASSES.map((pass) =>
        liveStateOf(pass, elapsedSec),
      ).filter((pass) => pass.status === "COMPLETED");

      if (seen === null) {
        seen = new Set(finished.map((pass) => pass.id));
        return;
      }

      for (const pass of finished) {
        if (seen.has(pass.id)) continue;
        seen.add(pass.id);
        usePassHistoryStore
          .getState()
          .archivePass(pass, MISSION_EPOCH_MS + elapsedSec * 1000);
      }
    };

    settle(useSimStore.getState().elapsedSec);
    return useSimStore.subscribe((state) => settle(state.elapsedSec));
  }, []);

  return null;
}
