"use client";

import { cn } from "@/features/data-archival/lib/cn";
import { HEALTH_META, type MetricMode } from "../types";

/**
 * MetricLegend — shows the four discrete health states with colour + label.
 */
export function MetricLegend({
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
    <div className="flex items-center gap-[0.75rem]">
      {/* Mode selector */}
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

      {/* Health state legend */}
      {metricMode === "states" && (
        <div className="flex items-center gap-[0.625rem]">
          {(["nominal", "degraded", "critical", "offline"] as const).map((healthId) => {
            const meta = HEALTH_META[healthId];
            return (
              <span key={healthId} className="flex items-center gap-[0.25rem]">
                <span
                  className="size-[0.4375rem] rounded-full"
                  style={{ backgroundColor: `var(--color-${meta.token})` }}
                />
                <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                  {meta.label}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
