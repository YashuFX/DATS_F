"use client";

import { ChevronRight, Pentagon, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { useDomeStore } from "../store/domeStore";
import { FACE_MAP, PRESENT_FACES } from "../data/geometry";
import { HEALTH_META, type HealthId } from "../types";

/** Label/value row — the rail is mostly these. */
function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.375rem]">
      <span className="text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
        {label}
      </span>
      <span className={cn("da-nums text-2xs font-bold", tone ?? "text-da-text")}>{value}</span>
    </div>
  );
}

/** Card section with header. */
function Card({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("da-card flex min-h-0 flex-col", className)}>
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-text">{title}</span>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-[0.75rem] py-[0.5rem]">{children}</div>
    </section>
  );
}

/** Health chip. */
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

/** Breadcrumb navigation. */
function Breadcrumb() {
  const selection = useDomeStore((s) => s.selection);
  const clearSelection = useDomeStore((s) => s.clearSelection);
  const selectFace = useDomeStore((s) => s.selectFace);

  const crumbs: { label: string; onClick?: () => void }[] = [
    { label: "Dome", onClick: clearSelection },
  ];

  if (selection.level === "face" || selection.level === "element") {
    const face = FACE_MAP[selection.faceNum!];
    crumbs.push({
      label: `Face ${selection.faceNum} · ${face?.kind === "pentagon" ? "Pent" : "Hex"}`,
      onClick: selection.level === "element" ? () => selectFace(selection.faceNum!) : undefined,
    });
  }

  if (selection.level === "element") {
    crumbs.push({
      label: `Element ${selection.elementIdx}`,
    });
  }

  return (
    <nav className="flex items-center gap-[0.25rem] px-[0.75rem] py-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-[0.25rem]">
          {i > 0 && <ChevronRight className="size-[0.625rem] text-da-label" strokeWidth={2.4} />}
          {crumb.onClick ? (
            <button
              type="button"
              onClick={crumb.onClick}
              className="cursor-pointer text-2xs font-semibold text-da-brand hover:underline"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-2xs font-semibold text-da-text">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * SelectionRail — 18.5rem right panel mirroring TileDetailRail.
 *
 * Content depends on selection level:
 * - Array: dome-level summary
 * - Face: face detail + flagged elements
 * - Element: single element telemetry
 */
export function SelectionRail() {
  const selection = useDomeStore((s) => s.selection);
  const telemetry = useDomeStore((s) => s.telemetry);
  const totals = telemetry.totals;

  return (
    <div className="flex min-h-0 flex-col gap-[0.75rem]">
      {/* Breadcrumb */}
      <div className="da-card shrink-0 overflow-hidden">
        <Breadcrumb />

        {/* Array level */}
        {selection.level === "array" && (
          <div className="px-[0.75rem] py-[0.5rem]">
            <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
              <Row label="Total elements" value={`${totals.elementsTotal}`} />
              <Row label="Online" value={`${totals.elementsOnline}`} />
              <Row label="Availability" value={`${totals.availabilityPercent}%`} />
              <Row label="Faces" value={`${totals.facesTotal} (11 pent · 15 hex)`} />
              <Row label="Healthy faces" value={`${totals.facesHealthy} / ${totals.facesTotal}`} />
              <Row label="Worst cluster" value={`${totals.worstClusterSize} el @ F${totals.worstClusterFace}`} />
              <Row label="Circumradius" value="3.000 m" />
              <Row label="Edge length" value="1.2106 m" />
              <Row label="Element pitch" value="0.100 m" />
            </div>
          </div>
        )}

        {/* Face level */}
        {selection.level === "face" && selection.faceNum && (() => {
          const face = FACE_MAP[selection.faceNum];
          const ft = telemetry.faces[selection.faceNum];
          if (!face || !ft) return null;

          return (
            <div className="px-[0.75rem] py-[0.5rem]">
              <div className="mb-[0.5rem] flex items-center justify-between">
                <span className="text-lg font-bold text-da-text">Face {face.fceNum}</span>
                <HealthChip health={ft.health} />
              </div>
              <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                {face.kind === "pentagon" ? "Pentagon" : "Hexagon"} · {face.elementCount} elements
              </span>
              <div className="mt-[0.5rem] divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                <Row label="Availability" value={`${ft.availabilityPercent.toFixed(1)}%`} />
                <Row label="Online" value={`${ft.online} / ${ft.total}`} />
                <Row label="Mean gain" value={`${ft.meanGainDb.toFixed(2)} dB`} />
                <Row label="Phase RMS" value={`${ft.phaseRmsDeg.toFixed(2)}°`} />
                <Row label="VSWR" value={ft.vswr.toFixed(2)} />
                <Row label="Chassis temp" value={`${ft.tempC.toFixed(1)} °C`} />
                <Row label="Worst cluster" value={`${ft.worstClusterSize} el`} />
                <Row label="Azimuth" value={`${face.azimuthDeg.toFixed(1)}°`} />
                <Row label="Elevation" value={`${face.elevationDeg.toFixed(1)}°`} />
              </div>
            </div>
          );
        })()}

        {/* Element level */}
        {selection.level === "element" && selection.faceNum && selection.elementIdx !== undefined && (() => {
          const ft = telemetry.faces[selection.faceNum];
          const el = ft?.elements[selection.elementIdx];
          if (!el) return null;

          return (
            <div className="px-[0.75rem] py-[0.5rem]">
              <div className="mb-[0.5rem] flex items-center justify-between">
                <span className="text-lg font-bold text-da-text">Element {selection.elementIdx}</span>
                <HealthChip health={el.health} />
              </div>
              <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                Face {selection.faceNum} · Index {selection.elementIdx}
              </span>
              <div className="mt-[0.5rem] divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                <Row label="Health" value={HEALTH_META[el.health].label} />
                <Row label="Amplitude" value={el.amplitude.toFixed(3)} />
                <Row label="Phase" value={`${el.phase}°`} />
                <Row label="Temperature" value={`${el.tempC.toFixed(1)} °C`} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Flagged elements list */}
      {selection.level === "face" && selection.faceNum && (() => {
        const ft = telemetry.faces[selection.faceNum];
        if (!ft) return null;
        const flagged = ft.elements
          .map((el, idx) => ({ ...el, idx }))
          .filter((el) => el.health !== "nominal");

        return (
          <Card title="Flagged Elements" className="flex-1">
            {flagged.length === 0 ? (
              <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
                <ShieldCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
                <span className="text-2xs font-medium leading-[1.4] text-da-muted">
                  All {ft.total} elements within calibration limits.
                </span>
              </div>
            ) : (
              <ul className="flex flex-col gap-[0.375rem]">
                {flagged.slice(0, 20).map((el) => (
                  <li
                    key={el.idx}
                    className="flex items-center justify-between gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.5rem] py-[0.375rem]"
                  >
                    <span className="flex min-w-0 flex-col leading-none">
                      <span className="da-nums text-2xs font-bold text-da-text">
                        Element {el.idx}
                      </span>
                      <span className="da-nums mt-[0.1875rem] text-3xs font-medium text-da-label">
                        {el.amplitude.toFixed(3)} · {el.phase}° · {el.tempC.toFixed(1)}°C
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-3xs font-bold uppercase tracking-[0.06em]"
                      style={{ color: `var(--color-${HEALTH_META[el.health].token})` }}
                    >
                      {HEALTH_META[el.health].label}
                    </span>
                  </li>
                ))}
                {flagged.length > 20 && (
                  <li className="text-center text-3xs font-medium text-da-label">
                    + {flagged.length - 20} more
                  </li>
                )}
              </ul>
            )}
          </Card>
        );
      })()}

      {/* Face deck — 26-face summary when at array level */}
      {selection.level === "array" && <FaceDeckInline />}
    </div>
  );
}

/** Inline 26-face summary grid. */
function FaceDeckInline() {
  const selectFace = useDomeStore((s) => s.selectFace);
  const telemetry = useDomeStore((s) => s.telemetry);

  return (
    <Card title="Face Summary" className="flex-1">
      <div className="grid grid-cols-2 gap-[0.375rem]">
        {PRESENT_FACES.map((face) => {
          const ft = telemetry.faces[face.fceNum];
          const health = ft?.health ?? "nominal";
          const meta = HEALTH_META[health];
          return (
            <button
              key={face.fceNum}
              type="button"
              onClick={() => selectFace(face.fceNum)}
              className="flex cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.375rem] py-[0.3125rem] text-left transition-colors hover:border-da-brand/40 hover:bg-da-brand-soft"
            >
              <span
                className="size-[0.375rem] shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-${meta.token})` }}
              />
              <span className="flex min-w-0 flex-1 flex-col leading-none">
                <span className="da-nums text-2xs font-bold text-da-text">
                  F{face.fceNum}
                </span>
                <span className="text-3xs font-medium text-da-label">
                  {face.kind === "pentagon" ? "Pent" : "Hex"} · {face.elementCount}
                </span>
              </span>
              <span className="da-nums text-3xs font-semibold text-da-muted">
                {ft ? `${ft.availabilityPercent.toFixed(0)}%` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
