"use client";

import { ArrowUpRight, Fan, Link2, Radio, Thermometer, Zap } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { THRESHOLDS } from "../data/tiles";
import type { HealthId, MetricId, PolarizationFilter, Tile } from "../types";

/** One health vocabulary, used by the chip, the border and the element map. */
export const HEALTH: Record<HealthId, { label: string; token: string }> = {
  nominal: { label: "Nominal", token: "da-success" },
  degraded: { label: "Degraded", token: "da-warn" },
  critical: { label: "Critical", token: "da-danger" },
};

/**
 * The 8x8 element map.
 *
 * Each tile owns 64 of the aperture's 576 elements, and this is the reason the
 * screen is organised by tile at all: the summary figures tell you a tile is
 * hot, the map tells you whether that is the whole tile or one bad element.
 *
 * Colour follows the toolbar's metric — gain taper reads as brightness, phase
 * reads on the amber axis — while a faulted element always overrides both,
 * because a dead element is not a value on a scale.
 */
function ElementMap({
  tile,
  metric,
  polarization,
}: {
  tile: Tile;
  metric: MetricId;
  polarization: PolarizationFilter;
}) {
  return (
    <div
      className="grid h-full w-full gap-[0.0625rem]"
      style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)" }}
      aria-label={`Tile ${tile.id} element map`}
      role="img"
    >
      {tile.elements.map((el) => {
        const muted = polarization !== "all" && el.polarization !== polarization;
        let background: string;

        if (el.health !== "nominal") {
          background = `var(--color-${HEALTH[el.health].token})`;
        } else if (metric === "amplitude") {
          background = `color-mix(in srgb, var(--color-da-brand) ${Math.round(el.amplitude * 100)}%, transparent)`;
        } else {
          const t = Math.round(((el.phase + 180) / 360) * 100);
          background = `color-mix(in srgb, var(--color-da-c2) ${Math.max(12, t)}%, transparent)`;
        }

        return (
          <span
            key={`${el.row}-${el.col}`}
            className="rounded-[0.0625rem] transition-opacity"
            style={{ backgroundColor: background, opacity: muted ? 0.18 : 1 }}
          />
        );
      })}
    </div>
  );
}

/** Label + figure, the repeated readout inside a tile. */
function Metric({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.1875rem]">
      <span className="flex items-center gap-[0.25rem] text-3xs font-semibold uppercase tracking-[0.08em] text-da-label">
        {icon}
        {label}
      </span>
      <span className="flex items-baseline gap-[0.125rem]">
        <span className={cn("da-nums text-lg font-bold leading-none", tone ?? "text-da-text")}>
          {value}
        </span>
        {unit && <span className="text-2xs font-semibold text-da-muted">{unit}</span>}
      </span>
    </div>
  );
}

export function TileCard({
  tile,
  selected,
  metric,
  polarization,
  onSelect,
  onOpen,
}: {
  tile: Tile;
  selected: boolean;
  metric: MetricId;
  polarization: PolarizationFilter;
  onSelect: () => void;
  /** Drill into this tile's LRU chassis. */
  onOpen: () => void;
}) {
  const health = HEALTH[tile.health];
  const hot = tile.tempC >= 45;
  const phaseOut = tile.phaseErrorDeg > THRESHOLDS.phaseJitterDeg;
  const locksOut = tile.clocksLocked < tile.clocksTotal;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={cn(
        "da-card group relative flex min-h-0 cursor-pointer flex-col gap-[0.625rem] p-[0.75rem] text-left transition-colors",
        selected
          ? "border-da-brand ring-[max(1px,0.0625rem)] ring-da-brand/40"
          : "hover:border-da-border-strong hover:bg-da-subtle",
      )}
    >
      {/* Identity + health */}
      <div className="flex shrink-0 items-start justify-between gap-[0.5rem]">
        <span className="flex flex-col leading-none">
          <span className="da-nums text-xl font-bold tracking-[-0.01em] text-da-text">
            {tile.id}
          </span>
          <span className="mt-[0.25rem] text-3xs font-semibold uppercase tracking-[0.1em] text-da-label">
            Subarray · 64 elements
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-[0.375rem]">
        <span
          className="inline-flex shrink-0 items-center gap-[0.3125rem] rounded-[0.1875rem] px-[0.375rem] py-[0.125rem]"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-${health.token}) 14%, transparent)`,
            color: `var(--color-${health.token})`,
          }}
        >
          <span
            className="size-[0.375rem] rounded-full"
            style={{ backgroundColor: `var(--color-${health.token})` }}
          />
          <span className="text-3xs font-bold uppercase tracking-[0.06em]">{health.label}</span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          title={`Open ${tile.id} chassis`}
          aria-label={`Open tile ${tile.id} chassis`}
          className="flex size-[1.375rem] cursor-pointer items-center justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:border-da-brand hover:bg-da-brand-soft hover:text-da-brand"
        >
          <ArrowUpRight className="size-[0.75rem]" strokeWidth={2.4} />
        </button>
        </span>
      </div>

      {/* Element map beside the headline figures */}
      <div className="flex min-h-0 flex-1 items-center gap-[0.75rem]">
        <div className="h-full max-w-[45%] shrink-0 aspect-square">
          <ElementMap tile={tile} metric={metric} polarization={polarization} />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-[0.625rem] gap-y-[0.625rem]">
          <Metric
            icon={<Thermometer className="size-[0.625rem]" strokeWidth={2.2} />}
            label="Chassis"
            value={tile.tempC.toFixed(1)}
            unit="°C"
            tone={hot ? "text-da-warn-text" : undefined}
          />
          <Metric
            icon={<Zap className="size-[0.625rem]" strokeWidth={2.2} />}
            label="DC Draw"
            value={tile.powerW.toFixed(1)}
            unit="W"
          />
          <Metric
            icon={<Radio className="size-[0.625rem]" strokeWidth={2.2} />}
            label="Beams"
            value={`${tile.beams}`}
            unit="/ 8"
          />
          <Metric
            icon={<Link2 className="size-[0.625rem]" strokeWidth={2.2} />}
            label="PLL Locks"
            value={`${tile.clocksLocked}`}
            unit={`/ ${tile.clocksTotal}`}
            tone={locksOut ? "text-da-warn-text" : undefined}
          />
        </div>
      </div>

      {/* Calibration + subsystem strip */}
      <div className="flex shrink-0 items-center justify-between gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.5rem]">
        <span className="flex items-center gap-[0.75rem]">
          <span className="flex flex-col leading-none">
            <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              Phase RMS
            </span>
            <span
              className={cn(
                "da-nums mt-[0.1875rem] text-2xs font-bold",
                phaseOut ? "text-da-warn-text" : "text-da-text",
              )}
            >
              {tile.phaseErrorDeg.toFixed(1)}°
            </span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              VSWR
            </span>
            <span
              className={cn(
                "da-nums mt-[0.1875rem] text-2xs font-bold",
                tile.vswr > THRESHOLDS.vswrMax ? "text-da-danger" : "text-da-text",
              )}
            >
              {tile.vswr.toFixed(2)}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-[0.5rem]">
          <span
            className={cn(
              "flex items-center gap-[0.25rem] text-3xs font-semibold uppercase tracking-[0.06em]",
              tile.fanOn ? "text-da-muted" : "text-da-label",
            )}
          >
            <Fan
              className={cn("size-[0.6875rem]", tile.fanOn && "animate-spin [animation-duration:3s]")}
              strokeWidth={2.2}
            />
            Fan
          </span>
          <span
            className={cn(
              "flex items-center gap-[0.25rem] text-3xs font-semibold uppercase tracking-[0.06em]",
              tile.auroraLink ? "text-da-success" : "text-da-label",
            )}
          >
            <span
              className={cn(
                "size-[0.375rem] rounded-full",
                tile.auroraLink ? "bg-da-success" : "bg-da-border-strong",
              )}
            />
            Aurora
          </span>
        </span>
      </div>
    </div>
  );
}
