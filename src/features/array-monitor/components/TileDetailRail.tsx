"use client";

import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { THRESHOLDS } from "../data/tiles";
import type { Tile } from "../types";
import { HEALTH } from "./TileCard";

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

export function TileDetailRail({
  tile,
  onOpenChassis,
}: {
  tile: Tile;
  /** Drill into this tile's LRU chassis. */
  onOpenChassis: () => void;
}) {
  const health = HEALTH[tile.health];
  const faulted = tile.elements.filter((e) => e.health !== "nominal");
  const meanAmplitude =
    tile.elements.reduce((s, e) => s + e.amplitude, 0) / tile.elements.length;
  const hFeeds = tile.elements.filter((e) => e.polarization === "H").length;

  return (
    <div className="flex min-h-0 flex-col gap-[0.75rem]">
      <Card
        className="shrink-0"
        title={`Tile ${tile.id} Detail`}
        action={
          <span
            className="inline-flex items-center gap-[0.25rem] rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-${health.token}) 14%, transparent)`,
              color: `var(--color-${health.token})`,
            }}
          >
            {health.label}
          </span>
        }
      >
        <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
          <Row label="Elements" value={`${tile.elements.length} · 8 × 8`} />
          <Row label="H / V feeds" value={`${hFeeds} / ${tile.elements.length - hFeeds}`} />
          <Row label="Mean gain" value={`${(meanAmplitude * 10).toFixed(2)} dB`} />
          <Row
            label="Phase RMS"
            value={`${tile.phaseErrorDeg.toFixed(2)}°`}
            tone={tile.phaseErrorDeg > THRESHOLDS.phaseJitterDeg ? "text-da-warn-text" : undefined}
          />
          <Row
            label="Gain RMS"
            value={`${tile.gainErrorDb.toFixed(2)} dB`}
            tone={tile.gainErrorDb > THRESHOLDS.gainJitterDb ? "text-da-warn-text" : undefined}
          />
          <Row
            label="VSWR"
            value={tile.vswr.toFixed(2)}
            tone={tile.vswr > THRESHOLDS.vswrMax ? "text-da-danger" : undefined}
          />
          <Row label="Chassis temp" value={`${tile.tempC.toFixed(1)} °C`} />
          <Row label="Regulated draw" value={`${tile.powerW.toFixed(1)} W`} />
          <Row
            label="PLL locks"
            value={`${tile.clocksLocked} / ${tile.clocksTotal}`}
            tone={tile.clocksLocked < tile.clocksTotal ? "text-da-warn-text" : undefined}
          />
          <Row label="Aurora link" value={tile.auroraLink ? "Up" : "Down"} />
        </div>

        <button
          type="button"
          onClick={onOpenChassis}
          className="mt-[0.625rem] flex w-full cursor-pointer items-center justify-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft py-[0.4375rem] text-2xs font-bold uppercase tracking-[0.06em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
        >
          Open {tile.id} chassis
          <ArrowRight className="size-[0.75rem]" strokeWidth={2.4} />
        </button>
      </Card>

      <Card title="Flagged Elements" className="flex-1">
        {faulted.length === 0 ? (
          <div className="flex items-center gap-[0.5rem] py-[0.5rem]">
            <ShieldCheck className="size-[0.875rem] shrink-0 text-da-success" strokeWidth={2.2} />
            <span className="text-2xs font-medium leading-[1.4] text-da-muted">
              All 64 elements within calibration limits.
            </span>
          </div>
        ) : (
          <ul className="flex flex-col gap-[0.375rem]">
            {faulted.map((el) => (
              <li
                key={`${el.row}-${el.col}`}
                className="flex items-center justify-between gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.5rem] py-[0.375rem]"
              >
                <span className="flex min-w-0 flex-col leading-none">
                  <span className="da-nums text-2xs font-bold text-da-text">
                    R{el.row} · C{el.col}
                  </span>
                  <span className="da-nums mt-[0.1875rem] text-3xs font-medium text-da-label">
                    {el.polarization}-feed · {el.phase}° · {(el.amplitude * 10).toFixed(1)} dB
                  </span>
                </span>
                <span
                  className="shrink-0 text-3xs font-bold uppercase tracking-[0.06em]"
                  style={{ color: `var(--color-${HEALTH[el.health].token})` }}
                >
                  {HEALTH[el.health].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Calibration Limits" className="shrink-0">
        <div className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
          <Row label="Phase jitter" value={`< ${THRESHOLDS.phaseJitterDeg.toFixed(2)}° RMS`} />
          <Row label="Gain jitter" value={`< ${THRESHOLDS.gainJitterDb.toFixed(2)} dB RMS`} />
          <Row label="VSWR target" value={`< ${THRESHOLDS.vswrMax.toFixed(2)}`} />
        </div>
        <p className="mt-[0.5rem] flex gap-[0.375rem] text-3xs font-medium leading-[1.45] text-da-label">
          <TriangleAlert className="mt-[0.0625rem] size-[0.75rem] shrink-0 text-da-warn" strokeWidth={2.2} />
          Elements past the phase or gain limit flag as degraded. A VSWR breach trips the
          transmit interlock for that element and reads critical.
        </p>
      </Card>
    </div>
  );
}
