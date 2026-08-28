"use client";

import { Sliders } from "lucide-react";
import { MetricLegend } from "./MetricLegend";
import { CameraPresets } from "./CameraPresets";
import type { CameraPreset, MetricMode } from "../types";

/**
 * Floating glass HUD bar docked to the viewport's bottom edge — metric mode
 * + camera presets, previously a separate full-width row beneath the
 * viewport. Moving them inside the viewport card reclaims that row's height
 * for the dome (the hero-layout goal) and reads as a HUD readout over the
 * scene rather than a toolbar bolted below it.
 *
 * The wrapper is `pointer-events-none` so empty space between the two glass
 * pills still passes clicks/drags through to OrbitControls; only the pills
 * themselves re-enable pointer events.
 */
export function ViewportHud({
  metricMode,
  onMetricModeChange,
  show3dControls,
  activePresetId,
  onPresetSelect,
  onFit,
  projection,
  onToggleProjection,
}: {
  metricMode: MetricMode;
  onMetricModeChange: (mode: MetricMode) => void;
  show3dControls: boolean;
  activePresetId: string | null;
  onPresetSelect: (preset: CameraPreset) => void;
  onFit: () => void;
  projection: "perspective" | "orthographic";
  onToggleProjection: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-[0.75rem] bottom-[0.75rem] z-10 flex items-end justify-between gap-[0.75rem]">
      <div className="pointer-events-auto flex items-center gap-[0.625rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.625rem] py-[0.5rem] shadow-da-card backdrop-blur-[0.5rem]">
        <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
          <Sliders className="size-[0.8125rem]" strokeWidth={2.2} />
          Metric
        </span>
        <MetricLegend metricMode={metricMode} onModeChange={onMetricModeChange} />
      </div>

      {show3dControls && (
        <div className="pointer-events-auto rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.5rem] py-[0.375rem] shadow-da-card backdrop-blur-[0.5rem]">
          <CameraPresets
            activeId={activePresetId}
            onSelect={onPresetSelect}
            onFit={onFit}
            projection={projection}
            onToggleProjection={onToggleProjection}
          />
        </div>
      )}
    </div>
  );
}
