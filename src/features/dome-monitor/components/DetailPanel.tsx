"use client";

import { useMemo, useRef } from "react";
import { ChevronRight, ShieldCheck, X, Crosshair, ListTree, BellRing } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { DonutChart, type DonutSlice } from "@/features/data-archival/components/charts/DonutChart";
import { useDomeStore } from "../store/domeStore";
import { FACE_MAP } from "../data/geometry";
import { THRESHOLDS, PANEL_WIDTH_CSS } from "../config";
import { domeAverages, histogram } from "../lib/faceStats";
import { deriveAlarms } from "../lib/alarms";
import { HEALTH_META, type HealthId, type FaceTelemetry } from "../types";
import { Histogram } from "./Histogram";
import { AlarmsList } from "./AlarmsPanel";

/** Small premium stat tile — big number, label above, optional delta below. */
function StatTile({
  label,
  value,
  unit,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "flat";
}) {
  return (
    <div className="flex flex-col gap-[0.25rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60 px-[0.625rem] py-[0.5rem]">
      <span className="text-[0.5625rem] font-bold uppercase tracking-[0.08em] text-da-label">{label}</span>
      <span className="flex items-baseline gap-[0.1875rem]">
        <span className="da-nums text-md font-bold leading-none text-da-text">{value}</span>
        {unit && <span className="text-3xs font-semibold text-da-muted">{unit}</span>}
      </span>
      {delta && (
        <span
          className={cn(
            "da-nums text-[0.5625rem] font-semibold",
            deltaTone === "up" ? "text-da-danger" : deltaTone === "down" ? "text-da-success" : "text-da-label",
          )}
        >
          {delta}
        </span>
      )}
    </div>
  );
}

function HealthChip({ health }: { health: HealthId }) {
  const meta = HEALTH_META[health];
  return (
    <span
      className="inline-flex items-center gap-[0.25rem] rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-${meta.token}) 14%, transparent)`,
        color: `var(--color-${meta.token})`,
      }}
    >
      {meta.label}
    </span>
  );
}

/** Element health counts on a face, as donut slices — purely derived, nothing fabricated. */
function healthSlices(ft: FaceTelemetry): (DonutSlice & { count: number })[] {
  const counts: Record<HealthId, number> = { nominal: 0, degraded: 0, critical: 0, offline: 0 };
  for (const el of ft.elements) counts[el.health]++;
  return (Object.keys(counts) as HealthId[])
    .filter((h) => counts[h] > 0)
    .map((h) => ({ id: h, count: counts[h], percent: (counts[h] / ft.total) * 100, color: HEALTH_META[h].token }));
}

function Breadcrumb() {
  const selection = useDomeStore((s) => s.selection);
  const selectFace = useDomeStore((s) => s.selectFace);

  const crumbs: { label: string; onClick?: () => void; dormant?: boolean }[] = [{ label: "Dome" }];
  if (selection.level === "face" || selection.level === "element") {
    const face = FACE_MAP[selection.faceNum!];
    crumbs.push({
      label: `Face ${selection.faceNum} · ${face?.kind === "pentagon" ? "Pent" : "Hex"}`,
      onClick: selection.level === "element" ? () => selectFace(selection.faceNum!) : undefined,
    });
  }
  if (selection.level === "element") crumbs.push({ label: `Element ${selection.elementIdx}` });

  return (
    <nav className="flex flex-wrap items-center gap-[0.25rem]">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-[0.25rem]">
          {i > 0 && <ChevronRight className="size-[0.5625rem] text-da-label" strokeWidth={2.4} />}
          {crumb.onClick ? (
            <button type="button" onClick={crumb.onClick} className="cursor-pointer text-3xs font-semibold text-da-brand hover:underline">
              {crumb.label}
            </button>
          ) : (
            <span className="text-3xs font-semibold text-da-muted">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function InfoRow({ label, value, dormant, title }: { label: string; value: string; dormant?: boolean; title?: string }) {
  return (
    <div className="flex items-center justify-between gap-[0.75rem] py-[0.25rem]">
      <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">{label}</span>
      <span
        title={title}
        className={cn(
          "da-nums text-3xs font-semibold",
          dormant ? "cursor-not-allowed text-da-label/60 line-through decoration-da-label/40" : "text-da-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Face content: stat tiles, distribution histograms, geometry, element status, actions. */
function FaceContent({ faceNum }: { faceNum: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const requestReframe = useDomeStore((s) => s.requestReframe);
  const acknowledgeAlarm = useDomeStore((s) => s.acknowledgeAlarm);
  const flaggedRef = useRef<HTMLDivElement>(null);

  const face = FACE_MAP[faceNum];
  const ft = telemetry.faces[faceNum];
  const avg = useMemo(() => domeAverages(telemetry), [telemetry]);
  const slices = useMemo(() => (ft ? healthSlices(ft) : []), [ft]);
  const faceAlarms = useMemo(() => deriveAlarms(telemetry).filter((a) => a.faceNum === faceNum), [telemetry, faceNum]);

  const gainHist = useMemo(() => (ft ? histogram(ft.elements.map((e) => e.amplitude), 10, 0, 1) : []), [ft]);
  const phaseHist = useMemo(() => (ft ? histogram(ft.elements.map((e) => e.phase), 10, -180, 180) : []), [ft]);
  const tempHist = useMemo(() => (ft ? histogram(ft.elements.map((e) => e.tempC), 10) : []), [ft]);

  if (!face || !ft) return null;

  const flagged = ft.elements.map((el, idx) => ({ ...el, idx })).filter((el) => el.health !== "nominal");
  const gainDelta = ft.meanGainDb - avg.meanGainDb;
  const phaseDelta = ft.phaseRmsDeg - avg.phaseRmsDeg;
  const tempDelta = ft.tempC - avg.tempC;

  return (
    <>
      <div className="flex items-center justify-between gap-[0.75rem] px-[1rem] py-[0.875rem]">
        <div>
          <div className="flex items-center gap-[0.5rem]">
            <span className="text-xl font-bold leading-none text-da-text">Face {face.fceNum}</span>
            <span className="text-sm font-medium text-da-muted">· {face.kind === "pentagon" ? "Pentagon" : "Hexagon"}</span>
          </div>
          <span className="mt-[0.25rem] block da-nums text-3xs font-medium text-da-muted">
            {ft.online} / {ft.total} elements online
          </span>
        </div>
        <HealthChip health={ft.health} />
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-[0.5rem] px-[1rem] pb-[0.875rem]">
        <StatTile label="Availability" value={ft.availabilityPercent.toFixed(1)} unit="%" />
        <StatTile label="Worst Cluster" value={`${ft.worstClusterSize}`} unit="el" />
        <StatTile label="VSWR" value={ft.vswr.toFixed(2)} deltaTone={ft.vswr > THRESHOLDS.vswrMax ? "up" : "flat"} />
        <StatTile
          label="Mean Gain"
          value={ft.meanGainDb.toFixed(2)}
          unit="dB"
          delta={`${gainDelta >= 0 ? "▲" : "▼"} ${Math.abs(gainDelta).toFixed(2)} dB vs dome avg`}
          deltaTone={gainDelta < -0.3 ? "up" : "flat"}
        />
        <StatTile
          label="Phase RMS"
          value={ft.phaseRmsDeg.toFixed(1)}
          unit="°"
          delta={`${phaseDelta >= 0 ? "▲" : "▼"} ${Math.abs(phaseDelta).toFixed(1)}° vs dome avg`}
          deltaTone={phaseDelta > 3 ? "up" : "flat"}
        />
        <StatTile
          label="Chassis Temp"
          value={ft.tempC.toFixed(1)}
          unit="°C"
          delta={`${tempDelta >= 0 ? "▲" : "▼"} ${Math.abs(tempDelta).toFixed(1)}°C vs dome avg`}
          deltaTone={tempDelta > 3 ? "up" : "flat"}
        />
      </div>

      {/* Distribution histograms — real per-element data, binned */}
      <div className="grid grid-cols-3 gap-[0.625rem] border-t-[max(1px,0.0625rem)] border-da-border px-[1rem] py-[0.875rem]">
        <div className="flex flex-col gap-[0.375rem]">
          <span className="text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Gain Distribution</span>
          <Histogram bins={gainHist} color="da-c1" className="h-[3.25rem]" />
        </div>
        <div className="flex flex-col gap-[0.375rem]">
          <span className="text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Phase Distribution (°)</span>
          <Histogram bins={phaseHist} color="da-c3" className="h-[3.25rem]" />
        </div>
        <div className="flex flex-col gap-[0.375rem]">
          <span className="text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Temperature (°C)</span>
          <Histogram bins={tempHist} color="da-c2" className="h-[3.25rem]" />
        </div>
      </div>

      {/* Face information + element status, side by side */}
      <div className="grid grid-cols-2 gap-[1rem] border-t-[max(1px,0.0625rem)] border-da-border px-[1rem] py-[0.875rem]">
        <div>
          <span className="mb-[0.375rem] block text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Face Information</span>
          <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/60">
            <InfoRow label="Face ID" value={`${face.fceNum}`} />
            <InfoRow label="Type" value={face.kind === "pentagon" ? "Pentagon" : "Hexagon"} />
            <InfoRow label="Position (Az/El)" value={`${face.azimuthDeg.toFixed(1)}° / ${face.elevationDeg.toFixed(1)}°`} />
            <InfoRow label="Centre (X,Y,Z)" value={`${face.centroid.map((c) => c.toFixed(2)).join(", ")}`} />
            <InfoRow label="Normal Vector" value={`${face.normal.map((c) => c.toFixed(2)).join(", ")}`} />
            <InfoRow label="LRU / Tile" value="Pending B1" dormant title="Awaiting the element → LRU / Tile map from the client (blocker B1)" />
            <InfoRow label="Last Update" value={new Date(telemetry.timestamp).toLocaleTimeString()} />
          </div>
        </div>

        <div>
          <span className="mb-[0.375rem] block text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Element Status</span>
          <div className="flex flex-col items-center gap-[0.625rem]">
            <DonutChart slices={slices} thickness={13} className="size-[4.75rem] shrink-0" label={`Face ${face.fceNum} element health distribution`} />
            <ul className="grid w-full grid-cols-2 gap-[0.5rem]">
              {slices.map((s) => (
                <li key={s.id} className="flex flex-col gap-[0.1875rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60 px-[0.5rem] py-[0.375rem]">
                  <span className="flex items-center gap-[0.3125rem] text-[0.5625rem] font-bold uppercase tracking-[0.04em] text-da-label">
                    <span className="size-[0.375rem] shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${s.color})` }} />
                    {HEALTH_META[s.id as HealthId].label}
                  </span>
                  <span className="da-nums text-xs font-bold text-da-text">
                    {s.count} <span className="text-3xs font-semibold text-da-label">({s.percent.toFixed(1)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Actions — only real, honest affordances (no invented "run calibration" command) */}
      <div className="flex flex-wrap items-center gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border px-[1rem] py-[0.75rem]">
        <button
          type="button"
          onClick={() => flaggedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="flex cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.625rem] py-[0.375rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-text transition-colors hover:bg-da-border/40"
        >
          <ListTree className="size-[0.75rem]" strokeWidth={2.2} />
          View Elements
        </button>
        <button
          type="button"
          onClick={requestReframe}
          className="flex cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.625rem] py-[0.375rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-text transition-colors hover:bg-da-border/40"
        >
          <Crosshair className="size-[0.75rem]" strokeWidth={2.2} />
          Zoom to Face
        </button>
        {faceAlarms.length > 0 && (
          <button
            type="button"
            onClick={() => faceAlarms.forEach((a) => acknowledgeAlarm(a.id))}
            className="flex cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-danger/40 bg-da-danger-soft px-[0.625rem] py-[0.375rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-danger transition-colors hover:bg-da-danger/15"
          >
            <BellRing className="size-[0.75rem]" strokeWidth={2.2} />
            Acknowledge {faceAlarms.length > 1 ? `${faceAlarms.length} Alerts` : "Alert"}
          </button>
        )}
      </div>

      {/* Flagged elements */}
      <div ref={flaggedRef} className="flex min-h-0 flex-1 flex-col border-t-[max(1px,0.0625rem)] border-da-border px-[1rem] py-[0.875rem]">
        <span className="mb-[0.5rem] text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-da-label">Flagged Elements</span>
        {flagged.length === 0 ? (
          <div className="flex items-center gap-[0.5rem] py-[0.25rem]">
            <ShieldCheck className="size-[0.875rem] shrink-0 text-da-label" strokeWidth={2.2} />
            <span className="text-2xs font-medium leading-[1.4] text-da-muted">All {ft.total} elements within calibration limits.</span>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-[0.375rem]">
            {flagged.slice(0, 30).map((el) => (
              <li key={el.idx} className="flex items-center justify-between gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.5rem] py-[0.375rem]">
                <span className="flex min-w-0 flex-col leading-none">
                  <span className="da-nums text-2xs font-bold text-da-text">El. {el.idx}</span>
                  <span className="da-nums mt-[0.1875rem] text-3xs font-medium text-da-label">
                    {el.amplitude.toFixed(2)} · {el.phase}° · {el.tempC.toFixed(0)}°C
                  </span>
                </span>
                <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.06em]" style={{ color: `var(--color-${HEALTH_META[el.health].token})` }}>
                  {HEALTH_META[el.health].label}
                </span>
              </li>
            ))}
            {flagged.length > 30 && <li className="col-span-2 text-center text-3xs font-medium text-da-label">+ {flagged.length - 30} more</li>}
          </ul>
        )}
      </div>
    </>
  );
}

function ElementContent({ faceNum, elementIdx }: { faceNum: number; elementIdx: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const ft = telemetry.faces[faceNum];
  const el = ft?.elements[elementIdx];
  if (!el) return null;

  return (
    <div className="px-[1rem] py-[0.875rem]">
      <div className="mb-[0.5rem] flex items-center justify-between">
        <span className="text-xl font-bold text-da-text">Element {elementIdx}</span>
        <HealthChip health={el.health} />
      </div>
      <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
        Face {faceNum} · Index {elementIdx}
      </span>
      <div className="mt-[0.5rem] divide-y-[max(1px,0.0625rem)] divide-da-border/70">
        <InfoRow label="Health" value={HEALTH_META[el.health].label} />
        <InfoRow label="Amplitude" value={el.amplitude.toFixed(3)} />
        <InfoRow label="Phase" value={`${el.phase}°`} />
        <InfoRow label="Temperature" value={`${el.tempC.toFixed(1)} °C`} />
      </div>
    </div>
  );
}

/**
 * DetailPanel — a right-half drawer, full height of the viewport card. The
 * canvas beneath it never resizes (see lib/cameraFraming.ts): the dome
 * shifts into the left half via a camera-target bias, so the panel can be
 * a true ~50%-width drawer without a WebGL buffer resize.
 */
export function DetailPanel({
  mode,
  open,
  onClose,
}: {
  mode: "face" | "element" | "alarms" | null;
  open: boolean;
  onClose: () => void;
}) {
  const selection = useDomeStore((s) => s.selection);

  return (
    <div
      className={cn(
        "absolute inset-y-0 right-0 z-20 flex flex-col overflow-y-auto border-l-[max(1px,0.0625rem)] border-da-border bg-da-surface shadow-[-0.5rem_0_1.5rem_rgba(0,0,0,0.22)] transition-transform",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
      style={{ width: PANEL_WIDTH_CSS, transitionDuration: "440ms", transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.3, 1)" }}
      aria-hidden={!open}
    >
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-surface px-[1rem] py-[0.625rem]">
        {mode === "alarms" ? (
          <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-text">Alarms</span>
        ) : (
          <Breadcrumb />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex size-[1.5rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
        >
          <X className="size-[0.8125rem]" strokeWidth={2.4} />
        </button>
      </header>

      {mode === "face" && selection.faceNum !== undefined && <FaceContent faceNum={selection.faceNum} />}
      {mode === "element" && selection.faceNum !== undefined && selection.elementIdx !== undefined && (
        <ElementContent faceNum={selection.faceNum} elementIdx={selection.elementIdx} />
      )}
      {mode === "alarms" && <AlarmsList />}
    </div>
  );
}
