"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Home, Crosshair, Maximize, Cone, Tags, Map as MapIcon, Box, RefreshCw } from "lucide-react";
import { Panel } from "./Panel";
import { cn } from "@/features/data-archival/lib/cn";
import { ANTENNA_FENCE, TRACKED_SATELLITES } from "../data/mnc.mock";
import type { Basemap, GlobeApi, Projection } from "../globeApi";

/**
 * Cesium is client-only and ~8 MB of runtime assets, so it is behind a dynamic
 * import with `ssr: false`. Rendering it on the server is not merely wasteful,
 * it throws — Cesium reaches for `window` and `document` while its module body
 * evaluates.
 */
const CesiumGlobe = dynamic(() => import("./CesiumGlobe").then((m) => ({ default: m.CesiumGlobe })), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <div className="flex flex-col items-center gap-[0.5rem]">
        <RefreshCw className="size-[1.25rem] animate-spin text-da-brand" strokeWidth={2} />
        <span className="text-3xs font-semibold uppercase tracking-[0.09em] text-da-label">Loading globe…</span>
      </div>
    </div>
  ),
});

/** Round control on the glass rails. `active` latches a toggle on. */
function GlobeButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Home;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex size-[1.5rem] cursor-pointer items-center justify-center rounded-[0.1875rem] transition-colors",
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]",
        active ? "bg-da-brand text-da-on-brand" : "text-da-muted hover:bg-da-subtle hover:text-da-text",
      )}
    >
      <Icon className="size-[0.8125rem]" strokeWidth={2.1} />
    </button>
  );
}

/** One spacecraft's look-angle readout, overlaid on the globe. */
function SatCard({ sat }: { sat: (typeof TRACKED_SATELLITES)[number] }) {
  // Containment in the SQUARE envelope, tested the way the envelope is
  // defined: resolve the target into the station's east-north-up frame, then
  // check each axis against its own ±30° limit. A single off-axis angle would
  // be the cone test, and would wrongly reject a target 30° off in azimuth AND
  // 30° off in elevation — legal on both axes, but ~39° off-axis.
  const azRad = (sat.azimuthDeg * Math.PI) / 180;
  const elRad = (sat.elevationDeg * Math.PI) / 180;
  const up = sat.rangeKm * Math.sin(elRad);
  const east = sat.rangeKm * Math.cos(elRad) * Math.sin(azRad);
  const north = sat.rangeKm * Math.cos(elRad) * Math.cos(azRad);
  const limit = up * Math.tan((ANTENNA_FENCE.halfWidthDeg * Math.PI) / 180);

  // Angle off the axis in each plane, for the readout — the number that says
  // by how much a rejected pass misses.
  const axisOffDeg = (lateral: number) =>
    up > 0 ? (Math.atan2(Math.abs(lateral), up) * 180) / Math.PI : 90;
  const worstAxisDeg = Math.max(axisOffDeg(east), axisOffDeg(north));

  const inFence =
    up > 0 &&
    up <= ANTENNA_FENCE.rangeKm &&
    Math.abs(east) <= limit &&
    Math.abs(north) <= limit;

  const rows = [
    ["Range", `${sat.rangeKm.toLocaleString()} km`],
    ["Azimuth", `${sat.azimuthDeg.toFixed(2)}°`],
    ["Elevation", `${sat.elevationDeg.toFixed(2)}°`],
    ["Velocity", `${sat.velocityKmS.toFixed(2)} km/s`],
  ];

  return (
    <div className="w-[9rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface/92 px-[0.5rem] py-[0.4375rem] shadow-da-card backdrop-blur-[0.25rem]">
      <span className="block text-3xs font-bold uppercase tracking-[0.07em]" style={{ color: `var(--color-${sat.token})` }}>
        {sat.id}
      </span>
      <dl className="mt-[0.25rem] flex flex-col gap-[0.1875rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-[0.375rem]">
            <dt className="text-3xs text-da-muted">{k}</dt>
            <dd className="da-nums text-3xs font-semibold text-da-text">{v}</dd>
          </div>
        ))}
      </dl>
      <span
        className="mt-[0.3125rem] block border-t-[max(1px,0.0625rem)] border-da-border/70 pt-[0.25rem] text-3xs font-bold"
        style={{ color: `var(--color-${inFence ? "da-success" : "da-warn-text"})` }}
      >
        {inFence ? "In envelope" : `Outside · ${worstAxisDeg.toFixed(0)}° off axis`}
      </span>
    </div>
  );
}

export function TrackingPanel({ className }: { className?: string }) {
  const apiRef = useRef<GlobeApi | null>(null);
  const [fence, setFence] = useState(true);
  const [labels, setLabels] = useState(true);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [projection, setProjection] = useState<Projection>("3d");

  const onReady = useCallback((api: GlobeApi) => {
    apiRef.current = api;
  }, []);

  return (
    <Panel className={className} title="Tracking Display" expandHref="/tracking" expandLabel="Open Tracking" bodyClassName="relative">
      <CesiumGlobe onReady={onReady} />

      {/* Camera rail. Every control here drives the live viewer through the
          API it hands up on ready — see globeApi.ts for why annotation and
          range measurement are absent rather than stubbed. */}
      <div className="absolute top-[0.5rem] left-[0.5rem] z-10 flex flex-col gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 p-[0.1875rem] shadow-da-card backdrop-blur-[0.25rem]">
        <GlobeButton icon={Home} label="Reset view" onClick={() => apiRef.current?.resetView()} />
        <GlobeButton icon={Crosshair} label="Centre on station" onClick={() => apiRef.current?.focusSite()} />
        <GlobeButton icon={Maximize} label="Fit all tracked objects" onClick={() => apiRef.current?.fitAll()} />
        <GlobeButton
          icon={Cone}
          label={`${fence ? "Hide" : "Show"} antenna envelope (±${ANTENNA_FENCE.halfWidthDeg}° az / ±${ANTENNA_FENCE.halfWidthDeg}° el, ${ANTENNA_FENCE.rangeKm} km)`}
          active={fence}
          onClick={() => {
            const next = !fence;
            setFence(next);
            apiRef.current?.setFenceVisible(next);
          }}
        />
        <GlobeButton
          icon={Tags}
          label={`${labels ? "Hide" : "Show"} labels`}
          active={labels}
          onClick={() => {
            const next = !labels;
            setLabels(next);
            apiRef.current?.setLabelsVisible(next);
          }}
        />
      </div>

      {/* Scene rail — what the globe is made of, rather than where it is looking. */}
      <div className="absolute top-[0.5rem] right-[0.5rem] z-10 flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 p-[0.1875rem] shadow-da-card backdrop-blur-[0.25rem]">
        <GlobeButton
          icon={MapIcon}
          label={basemap === "satellite" ? "Switch to street basemap" : "Switch to satellite imagery"}
          active={basemap === "street"}
          onClick={() => {
            const next: Basemap = basemap === "satellite" ? "street" : "satellite";
            setBasemap(next);
            apiRef.current?.setBasemap(next);
          }}
        />
        <GlobeButton
          icon={Box}
          label={projection === "3d" ? "Switch to 2D projection" : "Switch to 3D globe"}
          active={projection === "2d"}
          onClick={() => {
            const next: Projection = projection === "3d" ? "2d" : "3d";
            setProjection(next);
            apiRef.current?.setProjection(next);
          }}
        />
      </div>

      {/* Look-angle readouts. Hidden below `sm` — at that width they would
          cover most of the globe they are annotating. */}
      <div className="absolute top-[2.5rem] right-[0.5rem] z-10 hidden flex-col gap-[0.375rem] sm:flex">
        {TRACKED_SATELLITES.map((sat) => (
          <SatCard key={sat.id} sat={sat} />
        ))}
      </div>
    </Panel>
  );
}
