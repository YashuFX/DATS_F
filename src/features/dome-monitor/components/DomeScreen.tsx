"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Box, Grid, Hexagon, Sliders } from "lucide-react";
import { useDomeStore } from "../store/domeStore";
import { CAMERA_PRESETS } from "../config";
import { KpiStrip } from "./KpiStrip";
import { SelectionRail } from "./SelectionRail";
import { MetricLegend } from "./MetricLegend";
import { CameraPresets } from "./CameraPresets";
import type { CameraPreset, MetricMode } from "../types";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * Dynamic import of the 3D canvas / WebGL boundary — prevents Three.js from loading on the server.
 * Same pattern as Globe3D.tsx in the schedular project.
 */
const DomeCanvas = dynamic(
  () => import("./DomeCanvas").then((m) => ({ default: m.DomeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center gap-[0.75rem]">
          <Hexagon className="size-[2rem] animate-pulse text-da-brand" strokeWidth={1.5} />
          <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-da-label">
            Loading dome geometry…
          </span>
        </div>
      </div>
    ),
  },
);

/**
 * DOME SCREEN — the main dome array dashboard.
 *
 * Two-column layout: viewport (flexible) + detail rail (18.5rem).
 * Top: KPI strip. Bottom: camera presets + metric legend.
 * Centre: 3D dome canvas or 2D Unfolded Net view.
 */
export function DomeScreen() {
  const [viewMode, setViewMode] = useState<"3d" | "net">("3d");
  const [activePresetId, setActivePresetId] = useState<string | null>("iso");
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const metricMode = useDomeStore((s) => s.metricMode);
  const setMetricMode = useDomeStore((s) => s.setMetricMode);

  const [presetTrigger, setPresetTrigger] = useState<CameraPreset | null>(null);

  const handlePresetSelect = useCallback((preset: CameraPreset) => {
    setActivePresetId(preset.id);
    setPresetTrigger(preset);
  }, []);

  const handleFit = useCallback(() => {
    const iso = CAMERA_PRESETS[0];
    setActivePresetId(iso.id);
    setPresetTrigger({ ...iso });
  }, []);

  const handleToggleProjection = useCallback(() => {
    setProjection((p) => (p === "perspective" ? "orthographic" : "perspective"));
  }, []);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      {/* Left column: KPI + viewport + controls */}
      <div className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[0.75rem]">
        {/* KPI strip */}
        <KpiStrip />

        {/* Viewport (3D or 2D Net View) */}
        <div className="da-card relative min-h-0 overflow-hidden">
          <DomeCanvas activePreset={presetTrigger} viewMode={viewMode} />

          {/* Viewport overlays: View Mode Switcher (top right) & Compass (bottom left) */}
          <div className="absolute top-[0.625rem] right-[0.625rem] z-10">
            <div className="flex h-[1.875rem] items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 p-[0.1875rem] shadow-da-card backdrop-blur-[0.25rem]">
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={cn(
                  "flex h-full cursor-pointer items-center gap-[0.3125rem] rounded-[0.1875rem] px-[0.5rem] text-3xs font-bold uppercase tracking-[0.06em] transition-colors",
                  viewMode === "3d"
                    ? "bg-da-brand text-da-on-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                )}
              >
                <Box className="size-[0.75rem]" strokeWidth={2.2} />
                3D Dome
              </button>
              <button
                type="button"
                onClick={() => setViewMode("net")}
                className={cn(
                  "flex h-full cursor-pointer items-center gap-[0.3125rem] rounded-[0.1875rem] px-[0.5rem] text-3xs font-bold uppercase tracking-[0.06em] transition-colors",
                  viewMode === "net"
                    ? "bg-da-brand text-da-on-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                )}
              >
                <Grid className="size-[0.75rem]" strokeWidth={2.2} />
                2D Net View
              </button>
            </div>
          </div>

          {viewMode === "3d" && (
            <div className="pointer-events-none absolute bottom-[0.75rem] left-[0.75rem] z-10">
              <span className="rounded-[0.25rem] bg-da-surface/80 px-[0.5rem] py-[0.25rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted backdrop-blur-[0.125rem]">
                {activePresetId?.toUpperCase() ?? "FREE"} · {projection === "perspective" ? "Persp" : "Ortho"}
              </span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between gap-[0.75rem]">
          <div className="flex items-center gap-[0.625rem]">
            <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              <Sliders className="size-[0.8125rem]" strokeWidth={2.2} />
              Metric
            </span>
            <MetricLegend
              metricMode={metricMode}
              onModeChange={setMetricMode}
            />
          </div>

          {viewMode === "3d" && (
            <CameraPresets
              activeId={activePresetId}
              onSelect={handlePresetSelect}
              onFit={handleFit}
              projection={projection}
              onToggleProjection={handleToggleProjection}
            />
          )}
        </div>
      </div>

      {/* Right column: detail rail */}
      <SelectionRail />
    </div>
  );
}
