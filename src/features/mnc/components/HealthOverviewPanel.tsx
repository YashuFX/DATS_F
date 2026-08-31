"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Hexagon } from "lucide-react";
import { Panel } from "./Panel";
import { FaceTileGrid } from "./FaceTileGrid";
import { HoverReadout } from "./HoverReadout";
import { cn } from "@/features/data-archival/lib/cn";
import { CAMERA_PRESETS } from "@/features/dome-monitor/config";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { OrbitPuck } from "@/features/dome-monitor/components/OrbitPuck";
import { MetricModeSelect } from "@/features/dome-monitor/components/MetricModeSelect";
import { MC_HEALTH_META, type McHealth } from "../types";

/**
 * The real dome, not a picture of one.
 *
 * This is the same DomeCanvas the /dome route renders, reading the same
 * telemetry store — so the array an operator sees here and the array they see
 * after pressing expand are the same object in the same state, rather than two
 * renderings that can disagree. Dynamic + ssr:false for the same reason the
 * dome route does it: Three.js must not evaluate on the server.
 */
const DomeCanvas = dynamic(
  () => import("@/features/dome-monitor/components/DomeCanvas").then((m) => ({ default: m.DomeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center">
        <Hexagon className="size-[1.5rem] animate-pulse text-da-brand" strokeWidth={1.5} />
      </div>
    ),
  },
);

const LEGEND: McHealth[] = ["healthy", "warning", "critical", "offline"];

/**
 * What each view is CALLED, kept apart from what it IS.
 *
 * The ids stay "3d"/"2d" because they pick a renderer — one mounts the WebGL
 * dome, the other an SVG element plot — and renaming them to the labels would
 * leave the code unable to say which is which. The labels are the operator's
 * language: this console ships the geodesic dome as the delivered article and
 * the flat element grid as the proof-of-concept view it grew out of.
 */
const VIEW_LABELS: Record<"3d" | "2d", string> = { "3d": "Final", "2d": "PoC" };

/** Shared legend. Same four states and colours as the dome and array monitors —
 *  a fifth vocabulary on the glance screen would mean relearning colour per panel. */
function Legend() {
  return (
    <div className="pointer-events-none absolute top-[0.5rem] right-[0.5rem] z-10 flex flex-col gap-[0.1875rem] rounded-[0.25rem] bg-da-surface/80 px-[0.4375rem] py-[0.375rem] backdrop-blur-[0.25rem]">
      {LEGEND.map((h) => (
        <span key={h} className="flex items-center gap-[0.375rem]">
          <span className="size-[0.375rem] shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${MC_HEALTH_META[h].token})` }} />
          <span className="text-3xs font-medium text-da-muted">{MC_HEALTH_META[h].label}</span>
        </span>
      ))}
    </div>
  );
}

export function HealthOverviewPanel({ className }: { className?: string }) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const selection = useDomeStore((s) => s.selection);
  const metricMode = useDomeStore((s) => s.metricMode);
  const setMetricMode = useDomeStore((s) => s.setMetricMode);

  // The 2D view follows the 3D selection: pick a face on the dome, and the
  // grid beside it is that face. Selection lives in the shared dome store, so
  // this needs no wiring of its own and stays in step with /dome as well.
  const faceNum = selection.faceNum;

  return (
    <Panel
      className={className}
      title="Health Overview"
      expandHref="/dome"
      expandLabel="Open 3D Dome"
      bodyClassName="relative flex flex-col"
      controls={
        <div className="flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle p-[0.125rem]">
          {(["3d", "2d"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "cursor-pointer rounded-[0.1875rem] px-[0.4375rem] py-[0.125rem] text-3xs font-bold uppercase tracking-[0.06em] transition-colors",
                mode === m ? "bg-da-brand text-da-on-brand" : "text-da-muted hover:text-da-text",
              )}
            >
              {VIEW_LABELS[m]}
            </button>
          ))}
        </div>
      }
    >
      <Legend />

      {mode === "3d" ? (
        <>
          <div className="min-h-0 flex-1" style={{ backgroundColor: "var(--color-da-dome-viewport)" }}>
            <DomeCanvas manualPreset={CAMERA_PRESETS[0]} viewMode="3d" showHoverTag={false} />
          </div>

          <HoverReadout />

          {/* Same orbit puck and metric switch the /dome HUD carries, and
              driven by the same store — turning the dome here leaves it turned
              when the operator expands to the full screen. Bottom-left is the
              one corner nothing else occupies at this panel size. */}
          <div className="pointer-events-none absolute inset-x-[0.5rem] bottom-[0.5rem] z-10 flex items-end justify-between gap-[0.5rem]">
            <div className="pointer-events-auto">
              <OrbitPuck />
            </div>
            <div className="pointer-events-auto rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.375rem] py-[0.3125rem] shadow-da-card backdrop-blur-[0.5rem]">
              <MetricModeSelect metricMode={metricMode} onModeChange={setMetricMode} />
            </div>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-[0.625rem]">
          {faceNum === undefined ? (
            // No invented default. Showing face 2's grid while the dome has
            // nothing selected would read as "this is the array", and an
            // operator would act on one face thinking it was all 26.
            <div className="flex h-full items-center justify-center px-[1rem] text-center">
              <span className="text-2xs font-medium leading-[1.5] text-da-muted">
                Select a face in the Final view
                <br />
                to see its elements here.
              </span>
            </div>
          ) : (
            <FaceTileGrid faceNum={faceNum} />
          )}
        </div>
      )}
    </Panel>
  );
}
