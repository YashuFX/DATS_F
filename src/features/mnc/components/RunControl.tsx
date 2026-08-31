"use client";

import { useState } from "react";
import { Play, Square } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * One button, two states — start acquisition, then halt it.
 *
 * Two always-live buttons put a halt control one slip of the mouse from a
 * running pass while nothing is running, and gave no indication of which state
 * the console was actually in. A single toggle makes the state readable from
 * the control itself: green play means idle, red stop means running.
 *
 * Local state for now. Wiring this to real acquisition needs the command
 * contract (the console is monitor-only until confirmed — B4), so the button
 * deliberately does not pretend to command hardware it cannot reach.
 */
export function RunControl() {
  const [running, setRunning] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRunning((r) => !r)}
      aria-pressed={running}
      aria-label={running ? "Halt acquisition" : "Start acquisition"}
      title={running ? "Halt acquisition" : "Start acquisition"}
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
