"use client";

import { cn } from "@/features/data-archival/lib/cn";
import type { MetricMode } from "../types";

/**
 * MetricModeSelect — the segmented control that picks what colours the
 * elements: States / Gain / Phase / Temp.
 *
 * It used to be `MetricLegend`, and used to carry a strip of four health
 * swatches beside the buttons. That strip is gone: ElementLegend now explains
 * the colours, in every mode rather than only in States, from the scene's own
 * constants rather than theme tokens that drift from them in light mode. Two
 * legends disagreeing about what yellow means is worse than either alone, so
 * there is now exactly one.
 */
export function MetricModeSelect({
  metricMode,
  onModeChange,
}: {
  metricMode: MetricMode;
  onModeChange: (mode: MetricMode) => void;
}) {
  const modes: { id: MetricMode; label: string }[] = [
    { id: "states", label: "States" },
    { id: "gain", label: "Gain" },
    { id: "phase", label: "Phase" },
    { id: "temp", label: "Temp" },
  ];

  return (
    <div className="flex h-[1.875rem] items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onModeChange(m.id)}
          className={cn(
            "h-full cursor-pointer rounded-[0.1875rem] px-[0.5rem] text-2xs font-bold uppercase tracking-[0.06em] transition-colors",
            m.id === metricMode
              ? "bg-da-brand text-da-on-brand"
              : "text-da-muted hover:bg-da-subtle hover:text-da-text",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
