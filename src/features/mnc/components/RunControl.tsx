"use client";

import { Play, Square } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { useSimStore } from "../sim/simStore";

/**
 * One button, two states — start acquisition, then halt it.
 *
 * Two always-live buttons put a halt control one slip of the mouse from a
 * running pass while nothing is running, and gave no indication of which state
 * the console was actually in. A single toggle makes the state readable from
 * the control itself: green play means idle, red stop means running.
 *
 * Drives the tracking SIMULATION, not hardware. Commanding the real aperture
 * needs the command contract (the console is monitor-only until B4 confirms
 * otherwise), so this starts and stops the propagator and the beam planner —
 * which is what the label honestly describes today.
 */
export function RunControl() {
  const running = useSimStore((s) => s.running);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);

  return (
    <button
      type="button"
      onClick={() => (running ? stop() : start())}
      aria-pressed={running}
      aria-label={running ? "Stop tracking simulation" : "Start tracking simulation"}
      title={running ? "Stop tracking simulation" : "Start tracking simulation"}
      className={cn(
        "ml-[0.25rem] flex size-[1.875rem] shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-colors",
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2",
        running
          ? "bg-da-danger hover:opacity-85 focus-visible:outline-[color:var(--color-da-danger)]"
          : "bg-da-success hover:opacity-85 focus-visible:outline-[color:var(--color-da-success)]",
      )}
    >
      {running ? (
        <Square className="size-[0.8125rem]" strokeWidth={2.4} fill="currentColor" />
      ) : (
        <Play className="size-[0.875rem]" strokeWidth={2.4} fill="currentColor" />
      )}
    </button>
  );
}
