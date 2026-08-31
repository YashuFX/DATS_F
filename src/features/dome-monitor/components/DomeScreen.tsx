"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import { Box, Grid, Hexagon } from "lucide-react";
import { useDomeStore } from "../store/domeStore";
import { CAMERA_PRESETS } from "../config";
import { FACE_MAP } from "../data/geometry";
import { HEALTH_META } from "../types";
import type { CameraPreset } from "../types";
import { DetailPanel } from "./DetailPanel";
import { ElementLegend } from "./ElementLegend";
import { ViewportHud } from "./ViewportHud";
import { useSelectionUrlSync } from "../hooks/useSelectionUrlSync";
import { useDomeKeyboard } from "../hooks/useDomeKeyboard";
import { useMockTelemetryFeed } from "../hooks/useMockTelemetryFeed";
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
 * DOME SCREEN — the dome is the hero. Full-width, centred viewport by
 * default; nothing else competes for attention. Selecting a face slides in
 * an inset detail panel and reframes the camera toward it (see
 * DomeScene.tsx / lib/cameraFraming.ts) — the canvas itself never resizes.
 */
export function DomeScreen() {
  const [viewMode, setViewMode] = useState<"3d" | "net">("3d");
  const [activePresetId, setActivePresetId] = useState<string | null>("iso");
  const [projection, setProjection] = useState<"perspective" | "orthographic">("perspective");
  const metricMode = useDomeStore((s) => s.metricMode);
  const setMetricMode = useDomeStore((s) => s.setMetricMode);
  const selection = useDomeStore((s) => s.selection);
  const telemetry = useDomeStore((s) => s.telemetry);
  const alarmsOpen = useDomeStore((s) => s.alarmsOpen);
  const clearSelection = useDomeStore((s) => s.clearSelection);
  const setAlarmsOpen = useDomeStore((s) => s.setAlarmsOpen);

  const [manualPreset, setManualPreset] = useState<CameraPreset>(CAMERA_PRESETS[0]);

  const handlePresetSelect = useCallback((preset: CameraPreset) => {
    setActivePresetId(preset.id);
    setManualPreset(preset);
  }, []);

  const handleFit = useCallback(() => {
    const iso = CAMERA_PRESETS[0];
    setActivePresetId(iso.id);
    setManualPreset({ ...iso });
  }, []);

  const handleToggleProjection = useCallback(() => {
    setProjection((p) => (p === "perspective" ? "orthographic" : "perspective"));
  }, []);

  // Selection lives in the URL (?face=&element=) so it survives reload and
  // can be handed to the next shift; keyboard nav (Esc/Home/N/arrows) reads
  // and writes the same zustand store the URL sync watches.
  useSelectionUrlSync();
  useDomeKeyboard({ onResetCamera: handleFit });
  useMockTelemetryFeed();

  // The panel shows whichever of these is active; a real selection always
  // wins over the alarms view (see domeStore: selectFace/selectElement
  // close alarmsOpen).
  const panelMode: "face" | "element" | "alarms" | null =
    selection.level === "element"
      ? "element"
      : selection.level === "face"
        ? "face"
        : alarmsOpen
          ? "alarms"
          : null;
  const panelOpen = panelMode !== null;

  const handleClosePanel = useCallback(() => {
    clearSelection();
    setAlarmsOpen(false);
  }, [clearSelection, setAlarmsOpen]);

  // Screen-reader mirror of the canvas selection — the 3D view itself has no
  // accessible selection state, so this text is the only way a non-visual
  // operator learns what "N" or a click just selected.
  const selectionAnnouncement = useMemo(() => {
    if (selection.level === "array") return "Dome overview selected.";
    if (selection.faceNum === undefined) return "";
    const face = FACE_MAP[selection.faceNum];
    const ft = telemetry.faces[selection.faceNum];
    if (selection.level === "face") {
      return `Face ${selection.faceNum}, ${face?.kind ?? ""}, ${
        ft ? HEALTH_META[ft.health].label : "unknown"
      }${ft ? `, ${ft.online} of ${ft.total} elements online` : ""}.`;
    }
    if (selection.level === "element" && selection.elementIdx !== undefined) {
      const el = ft?.elements[selection.elementIdx];
      return `Face ${selection.faceNum}, element ${selection.elementIdx}, ${
        el ? HEALTH_META[el.health].label : "unknown"
      }.`;
    }
    return "";
  }, [selection, telemetry]);

  return (
    <div className="flex h-full min-h-0 flex-col p-[0.75rem]">
      {/* Screen-reader-only mirror of canvas selection state. */}
      <div role="status" aria-live="polite" className="sr-only">
        {selectionAnnouncement}
      </div>

      {/* Viewport — the hero, and the ONLY thing below the header. The old
          KPI strip ("second header") is gone — its stats now live in
          DomeShell's single header. The detail panel and HUD are overlays
          inside this card, not layout siblings, so the canvas never resizes
          when the panel opens (see PHASEPLAN work-log).

          The 3D viewport gets its own backdrop token (`--color-da-dome-
          viewport`, globals.css) — a distinct value per theme, not the
          light theme reusing dark's navy — same convention as a radar or
          night-vision instrument display: always moody, but not literally
          identical between a light control room and a dark one.
          FACE_COLOURS/ELEMENT_COLOURS (config.ts) are literal hex tuned
          against a dark-ish ground; a stark white backdrop in light mode
          read as flat and washed the array out. The 2D Net View is
          unaffected — it's built from theme-aware `da-*` tokens, not
          hardcoded WebGL materials, so it stays theme-aware normally. */}
      <div
        className="da-card relative min-h-0 flex-1 overflow-hidden"
        style={viewMode === "3d" ? { backgroundColor: "var(--color-da-dome-viewport)" } : undefined}
      >
        {/* Ambient accent lighting — DOM layer only, never the WebGL scene
            (PHASEPLAN: no bloom/glow in the 3D render itself). Same
            colour-mix radial-gradient technique as auth/BrandPanel.tsx. */}
        {viewMode === "3d" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 55% at 50% 42%, color-mix(in srgb, var(--color-da-brand) 14%, transparent), transparent 72%)",
            }}
          />
        )}

        <DomeCanvas manualPreset={manualPreset} viewMode={viewMode} />

        {/* View Mode Switcher (top right) */}
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
          <div className="pointer-events-none absolute top-[0.625rem] left-[0.625rem] z-10 flex flex-col gap-[0.25rem]">
            <span className="w-fit rounded-[0.25rem] bg-da-surface/80 px-[0.5rem] py-[0.25rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted backdrop-blur-[0.125rem]">
              {activePresetId?.toUpperCase() ?? "FREE"} · {projection === "perspective" ? "Persp" : "Ortho"}
            </span>
            <span className="w-fit rounded-[0.25rem] bg-da-surface/70 px-[0.5rem] py-[0.1875rem] text-3xs font-medium uppercase tracking-[0.06em] text-da-label backdrop-blur-[0.125rem]">
              Truncated icosahedron · 26 faces · R = 3.000 m
            </span>
            {/* The legend joins the top-left "what am I looking at" column
                rather than taking a corner of its own: the detail panel
                overlays the right half, the HUD owns the bottom edge, and
                the top-right is the view switcher — this is the one edge
                nothing else claims at any selection state. It is the only
                child here that takes pointer events (the column is
                pointer-events-none so drags pass through to OrbitControls),
                which it needs for its collapse toggle. */}
            <ElementLegend metricMode={metricMode} />
          </div>
        )}

        {viewMode === "3d" && (
          <ViewportHud
            metricMode={metricMode}
            onMetricModeChange={setMetricMode}
            show3dControls
            activePresetId={activePresetId}
            onPresetSelect={handlePresetSelect}
            onFit={handleFit}
            projection={projection}
            onToggleProjection={handleToggleProjection}
          />
        )}

        {viewMode === "3d" && <DetailPanel mode={panelMode} open={panelOpen} onClose={handleClosePanel} />}
      </div>
    </div>
  );
}
