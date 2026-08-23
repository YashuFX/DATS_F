"use client";

import {
  AlertTriangle,
  CalendarRange,
  CircleCheck,
  Radar,
  RefreshCw,
  Satellite,
  Signal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  ANTENNAS,
  CONFLICTS,
  PASSES,
  PRIORITY_LABEL,
  PRIORITY_TOKEN,
  SCHEDULE_STATS,
  STATIONS,
  STATUS_TOKEN,
  WINDOW,
} from "../data/schedule";
import type { SatellitePass } from "../types";

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("da-card flex min-h-0 min-w-0 flex-col", className)}>
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="truncate text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
          {title}
        </span>
        {action}
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-[0.75rem] py-[0.5rem]">{children}</div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-[0.5rem] py-[0.3125rem]">
      <span className="truncate text-2xs font-medium uppercase tracking-[0.06em] text-da-muted">
        {label}
      </span>
      <span className={cn("da-nums shrink-0 text-2xs font-bold", tone ?? "text-da-text")}>
        {value}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  icon,
  tone,
  divider,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
  divider: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-[0.5rem] px-[0.875rem] py-[0.375rem]",
        divider && "border-r-[max(1px,0.0625rem)] border-da-border",
      )}
    >
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-3xs font-semibold uppercase tracking-[0.1em] text-da-label">
          {label}
        </span>
        <span className="mt-[0.3125rem] flex items-baseline gap-[0.1875rem]">
          <span className={cn("da-nums text-xl font-bold tracking-[-0.02em]", tone ?? "text-da-text")}>
            {value}
          </span>
          {unit && <span className="text-2xs font-semibold text-da-muted">{unit}</span>}
        </span>
        <span className="mt-[0.3125rem] truncate text-3xs font-medium text-da-muted">{sub}</span>
      </span>
      <span className="flex size-[2rem] shrink-0 items-center justify-center rounded-[0.375rem] bg-da-subtle text-da-muted">
        {icon}
      </span>
    </div>
  );
}

const fmtClock = (offsetSec: number) => {
  // Window is expressed relative to "now"; render it as a wall clock so the
  // timeline axis reads like a schedule rather than like a stopwatch.
  const base = Date.parse("2026-08-23T09:00:00Z") + offsetSec * 1000;
  return new Date(base).toISOString().slice(11, 16);
};

const fmtDuration = (sec: number) =>
  `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;

const fmtCountdown = (sec: number) => {
  if (sec <= 0) return "In progress";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `AOS in ${h}h ${m}m` : `AOS in ${m}m ${String(Math.floor(sec % 60)).padStart(2, "0")}s`;
};

/**
 * SCHEDULER — the booking window, laid out by antenna.
 *
 * The lanes are antennas, not "channels". Both reference designs carried a
 * `channelIndex` that existed only to stop overlapping passes drawing on top of
 * each other, and one of them labelled the lanes CHANNEL 01…, which collides
 * with the sixteen real ADC channels on the RFSoC screen. The schedulable
 * resource here is the antenna: it is what `antennaId` names, and it is what
 * two passes contend for when the scheduler reports a conflict.
 */
export function SchedulerScreen() {
  const [selectedId, setSelectedId] = useState(PASSES[0]?.id ?? "");
  const [horizonHours, setHorizonHours] = useState(5);
  const [generating, setGenerating] = useState(false);

  const spanSec = WINDOW.pastSec + horizonHours * 3600;
  const visible = useMemo(
    () => PASSES.filter((p) => p.aosOffsetSec < horizonHours * 3600),
    [horizonHours],
  );

  const selected = PASSES.find((p) => p.id === selectedId) ?? PASSES[0];
  const station = STATIONS.find((s) => s.id === selected?.stationId);
  const conflictIds = new Set(CONFLICTS.flatMap((c) => c.passIds));

  // Fraction of the window a given offset sits at, for absolute positioning.
  const posPct = (offsetSec: number) => ((offsetSec + WINDOW.pastSec) / spanSec) * 100;

  const ticks = Array.from({ length: 7 }, (_, i) => {
    const sec = -WINDOW.pastSec + (i * spanSec) / 6;
    return { sec, pct: posPct(sec) };
  });

  const regenerate = () => {
    setGenerating(true);
    window.setTimeout(() => setGenerating(false), 1800);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[2.5rem_4.25rem_minmax(0,1fr)_8.5rem] gap-[0.75rem]">
        {/* Scheduling period — J.1.1 "configure schedule automatically given scheduling period" */}
        <div className="flex items-center justify-between gap-[0.75rem]">
          <div className="flex items-center gap-[0.625rem]">
            <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              <CalendarRange className="size-[0.8125rem]" strokeWidth={2.2} />
              Scheduling period
            </span>
            <div className="flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
              {[2, 5, 8, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonHours(h)}
                  className={cn(
                    "da-nums h-[1.5rem] cursor-pointer rounded-[0.1875rem] px-[0.625rem] text-2xs font-bold transition-colors",
                    h === horizonHours
                      ? "bg-da-brand text-da-on-brand"
                      : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                  )}
                >
                  {h} h
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={regenerate}
            disabled={generating}
            className={cn(
              "inline-flex h-[1.875rem] items-center gap-[0.375rem] rounded-[0.25rem] px-[0.75rem] text-2xs font-bold uppercase tracking-[0.06em] shadow-da-brand transition-colors",
              generating
                ? "cursor-wait bg-da-brand/70 text-da-on-brand"
                : "cursor-pointer bg-da-brand text-da-on-brand hover:bg-da-brand-hover",
            )}
          >
            <RefreshCw className={cn("size-[0.75rem]", generating && "animate-spin")} strokeWidth={2.4} />
            {generating ? "Propagating TLE…" : "Regenerate schedule"}
          </button>
        </div>

        {/* Window aggregates */}
        <div className="da-card flex min-h-0 items-center">
          <Kpi
            label="Satellites Booked"
            value={`${SCHEDULE_STATS.satellitesScheduled}`}
            unit={`/ ${SCHEDULE_STATS.satelliteCapacity}`}
            sub="Simultaneous capacity"
            icon={<Satellite className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Passes In Window"
            value={`${visible.length}`}
            sub={`Across ${ANTENNAS.length} antennas`}
            icon={<Radar className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Antenna Conflicts"
            value={`${CONFLICTS.length}`}
            sub={CONFLICTS.length ? "Awaiting resolution" : "None outstanding"}
            tone={CONFLICTS.length ? "text-da-danger" : "text-da-success"}
            icon={<AlertTriangle className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Schedule Resolution"
            value={`${SCHEDULE_STATS.resolutionMs}`}
            unit="ms"
            sub="SGP4 · GPU predictor"
            icon={<Signal className="size-[1rem]" strokeWidth={2} />}
            divider={false}
          />
        </div>

        {/* Antenna timeline */}
        <Panel
          title="Antenna Timeline"
          action={
            <span className="shrink-0 text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              One lane per antenna · conflicts overlap
            </span>
          }
        >
          <div className="flex h-full min-h-0 flex-col gap-[0.375rem]">
            {/* Time axis */}
            <div className="relative h-[0.875rem] shrink-0 pl-[6.25rem]">
              {ticks.map((t) => (
                <span
                  key={t.sec}
                  className="da-nums absolute -translate-x-1/2 text-3xs font-medium text-da-label"
                  style={{ left: `${t.pct}%` }}
                >
                  {fmtClock(t.sec)}
                </span>
              ))}
            </div>

            {ANTENNAS.map((antenna) => {
              const booked = visible.filter((p) => p.antennaId === antenna.id);
              return (
                <div key={antenna.id} className="flex min-h-[1.75rem] flex-1 items-center gap-[0.5rem]">
                  <span className="flex w-[5.75rem] shrink-0 flex-col leading-none">
                    <span className="da-nums text-2xs font-bold text-da-text">{antenna.id}</span>
                    <span className="mt-[0.125rem] text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                      {booked.length} booked
                    </span>
                  </span>

                  <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field">
                    {/* gridlines */}
                    {ticks.map((t) => (
                      <span
                        key={t.sec}
                        className="absolute inset-y-0 w-[max(1px,0.0625rem)] bg-da-border/70"
                        style={{ left: `${t.pct}%` }}
                      />
                    ))}
                    {/* now */}
                    <span
                      className="absolute inset-y-0 z-10 w-[max(1px,0.0625rem)] bg-da-brand"
                      style={{ left: `${posPct(0)}%` }}
                    />

                    {booked.map((pass) => {
                      const left = posPct(pass.aosOffsetSec);
                      const width = (pass.durationSec / spanSec) * 100;
                      const token = STATUS_TOKEN[pass.status];
                      const isSelected = pass.id === selectedId;
                      return (
                        <button
                          key={pass.id}
                          type="button"
                          onClick={() => setSelectedId(pass.id)}
                          title={`${pass.satName} · ${fmtDuration(pass.durationSec)}`}
                          className={cn(
                            "absolute inset-y-[0.1875rem] cursor-pointer overflow-hidden rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.25rem] text-left transition-colors",
                            isSelected ? "z-20 ring-[max(1px,0.0625rem)] ring-da-brand" : "z-[5]",
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 1.2)}%`,
                            backgroundColor: `color-mix(in srgb, var(--color-${token}) 22%, transparent)`,
                            borderColor: `var(--color-${token})`,
                          }}
                        >
                          <span className="da-nums block truncate text-3xs font-bold text-da-text">
                            {pass.satName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Upcoming passes */}
        <Panel
          title="Pass Queue"
          action={
            <span className="shrink-0 text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              Next acquisitions, soonest first
            </span>
          }
        >
          <div className="flex h-full min-h-0 min-w-0 items-stretch gap-[0.5rem] overflow-x-auto pb-[0.125rem]">
            {visible
              .filter((p) => p.status !== "COMPLETED")
              .slice(0, 14)
              .map((pass) => {
                const token = STATUS_TOKEN[pass.status];
                return (
                  <button
                    key={pass.id}
                    type="button"
                    onClick={() => setSelectedId(pass.id)}
                    className={cn(
                      "flex w-[11rem] shrink-0 cursor-pointer flex-col justify-between gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] p-[0.5rem] text-left transition-colors",
                      pass.id === selectedId
                        ? "border-da-brand bg-da-brand-soft ring-[max(1px,0.0625rem)] ring-da-brand/40"
                        : conflictIds.has(pass.id)
                          ? "border-da-danger/50 bg-da-danger-soft hover:border-da-danger"
                          : "border-da-border bg-da-field hover:bg-da-subtle",
                    )}
                  >
                    <span className="flex items-start justify-between gap-[0.25rem]">
                      <span className="truncate text-2xs font-bold text-da-text">
                        {pass.satName}
                      </span>
                      <span
                        className="shrink-0 text-3xs font-bold uppercase tracking-[0.05em]"
                        style={{ color: `var(--color-${token})` }}
                      >
                        {pass.status}
                      </span>
                    </span>

                    <span className="da-nums text-2xs font-bold text-da-brand">
                      {fmtCountdown(pass.aosOffsetSec)}
                    </span>

                    <span className="flex flex-col gap-[0.125rem]">
                      <span className="da-nums text-3xs font-medium text-da-label">
                        {pass.antennaId} · {fmtDuration(pass.durationSec)}
                      </span>
                      <span className="da-nums text-3xs font-medium text-da-label">
                        {pass.orbitClass} · {pass.frequencyMHz} MHz · el {pass.maxElevationDeg}°
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
        </Panel>
      </div>

      {/* Rail */}
      <div className="flex min-h-0 flex-col gap-[0.75rem] overflow-hidden">
        <Panel
          className="min-h-0 flex-[3]"
          title={selected ? selected.satName : "No pass"}
          action={
            selected && (
              <span
                className="shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
                style={{
                  backgroundColor: `color-mix(in srgb, var(--color-${PRIORITY_TOKEN[selected.priority]}) 14%, transparent)`,
                  color: `var(--color-${PRIORITY_TOKEN[selected.priority]})`,
                }}
              >
                {PRIORITY_LABEL[selected.priority]}
              </span>
            )
          }
        >
          {selected && (
            <>
              <span className="flex flex-col gap-[0.125rem] pb-[0.375rem]">
                <span className="da-nums text-3xs font-bold uppercase tracking-[0.1em] text-da-brand">
                  {selected.id} · NORAD {selected.noradId}
                </span>
                <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                  {station?.name} · {selected.antennaId}
                </span>
              </span>

              <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
                <Row label="Status" value={selected.status} />
                <Row label="AOS" value={fmtClock(selected.aosOffsetSec)} />
                <Row label="Duration" value={fmtDuration(selected.durationSec)} />
                <Row label="Max elevation" value={`${selected.maxElevationDeg}°`} />
                <Row label="AOS azimuth" value={`${selected.aosAzimuthDeg}°`} />
                <Row label="LOS azimuth" value={`${selected.losAzimuthDeg}°`} />
                <Row label="Slant range" value={`${selected.aosRangeKm} km`} />
                <Row label="Orbit" value={`${selected.orbitClass} · ${selected.periodMin} min`} />
                <Row label="Inclination" value={`${selected.inclinationDeg}°`} />
                <Row label="Downlink" value={`${selected.frequencyMHz} MHz`} />
                <Row label="Modulation" value={selected.modulation} />
                <Row label="Data rate" value={`${selected.dataRateKbps} kbps`} />
                <Row
                  label="Link margin"
                  value={`${selected.linkMarginDb} dB`}
                  tone={selected.linkMarginDb < 4 ? "text-da-warn-text" : undefined}
                />
                <Row label="Planned volume" value={`${selected.plannedVolumeMb} MB`} />
              </div>
            </>
          )}
        </Panel>

        <Panel title="Conflicts" className="min-h-0 flex-[2]">
          {CONFLICTS.length === 0 ? (
            <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
              <CircleCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
              <span className="text-2xs font-medium text-da-muted">
                No antenna is double-booked in this window.
              </span>
            </div>
          ) : (
            <ul className="flex flex-col gap-[0.5rem]">
              {CONFLICTS.map((c) => {
                const [a, b] = c.passIds.map((id) => PASSES.find((p) => p.id === id));
                return (
                  <li key={`${c.antennaId}-${c.passIds.join("-")}`}>
                    <div className="flex flex-col gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-danger/35 bg-da-danger-soft px-[0.5rem] py-[0.4375rem]">
                      <span className="flex items-center gap-[0.375rem]">
                        <AlertTriangle className="size-[0.75rem] shrink-0 text-da-danger" strokeWidth={2.2} />
                        <span className="da-nums text-2xs font-bold text-da-text">
                          {c.antennaId}
                        </span>
                        <span className="da-nums ml-auto text-3xs font-bold text-da-danger">
                          {fmtDuration(c.overlapSec)} overlap
                        </span>
                      </span>

                      {[a, b].map(
                        (p) =>
                          p && (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedId(p.id)}
                              className="flex cursor-pointer items-center justify-between gap-[0.375rem] rounded-[0.1875rem] px-[0.25rem] py-[0.125rem] text-left transition-colors hover:bg-da-surface"
                            >
                              <span className="truncate text-3xs font-semibold text-da-text">
                                {p.satName}
                              </span>
                              <span
                                className="shrink-0 text-3xs font-bold uppercase"
                                style={{ color: `var(--color-${PRIORITY_TOKEN[p.priority]})` }}
                              >
                                {PRIORITY_LABEL[p.priority]}
                              </span>
                            </button>
                          ),
                      )}

                      <span className="text-3xs font-medium leading-[1.35] text-da-muted">
                        Lower-priority pass will be re-planned onto the next free antenna.
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export type { SatellitePass };
