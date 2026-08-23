"use client";

import { Antenna, Gauge, Loader, RadioTower, ScanLine, ShieldCheck, Sliders } from "lucide-react";
import { useState } from "react";
import { useDrillParams } from "../hooks/useDrillParams";
import { cn } from "@/features/data-archival/lib/cn";
import { ARRAY_TOTALS, TILES, TILE_MAP } from "../data/tiles";
import type { MetricId, PolarizationFilter } from "../types";
import { TileCard } from "./TileCard";
import { TileDetailRail } from "./TileDetailRail";

/** Segmented control used by both toolbar groups. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex h-[1.875rem] items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "h-full cursor-pointer rounded-[0.1875rem] px-[0.625rem] text-2xs font-bold uppercase tracking-[0.06em] transition-colors",
            o.id === value
              ? "bg-da-brand text-da-on-brand"
              : "text-da-muted hover:bg-da-subtle hover:text-da-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One headline figure in the strip above the grid. */
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

/**
 * ARRAY — the nine subarray tiles.
 *
 * The source console put a 24x24 element heat map first and treated tiles as a
 * selector on the side. This inverts that: an operator works tile by tile, so
 * the tile is the object on screen and its 64 elements ride along inside it as
 * a map. Same 576 elements, organised the way they are actually maintained.
 *
 * Three columns matching the rest of the application — the shell owns the
 * 13.75rem module rail, this screen owns a flexible centre and an 18.5rem
 * detail rail — and every dimension is rem, so the whole screen scales with the
 * root font-size clamp instead of switching layouts at pixel widths.
 */
export function ArrayScreen() {
  const { get, set, drillTo } = useDrillParams();
  const selectedId = get("tile", "B2");
  const [metric, setMetric] = useState<MetricId>("amplitude");
  const [polarization, setPolarization] = useState<PolarizationFilter>("all");
  const [scanning, setScanning] = useState(false);

  const selected = TILE_MAP[selectedId];
  const degraded = TILES.filter((t) => t.health !== "nominal").length;

  const runScan = () => {
    setScanning(true);
    window.setTimeout(() => setScanning(false), 2200);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[2.5rem_4.25rem_minmax(0,1fr)] gap-[0.75rem]">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-[0.75rem]">
          <div className="flex items-center gap-[0.625rem]">
            <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              <Sliders className="size-[0.8125rem]" strokeWidth={2.2} />
              Element metric
            </span>
            <Segmented
              value={metric}
              onChange={setMetric}
              options={[
                { id: "amplitude", label: "Gain" },
                { id: "phase", label: "Phase" },
              ]}
            />
          </div>

          <div className="flex items-center gap-[0.625rem]">
            <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-muted">
              Feed
            </span>
            <Segmented
              value={polarization}
              onChange={setPolarization}
              options={[
                { id: "all", label: "All" },
                { id: "H", label: "H" },
                { id: "V", label: "V" },
              ]}
            />
            <button
              type="button"
              onClick={runScan}
              disabled={scanning}
              className={cn(
                "inline-flex h-[1.875rem] items-center gap-[0.375rem] rounded-[0.25rem] px-[0.75rem] text-2xs font-bold uppercase tracking-[0.06em] shadow-da-brand transition-colors",
                scanning
                  ? "cursor-wait bg-da-brand/70 text-da-on-brand"
                  : "cursor-pointer bg-da-brand text-da-on-brand hover:bg-da-brand-hover",
              )}
            >
              {scanning ? (
                <>
                  <Loader className="size-[0.75rem] animate-spin" strokeWidth={2.4} />
                  Sweeping…
                </>
              ) : (
                <>
                  <ScanLine className="size-[0.75rem]" strokeWidth={2.4} />
                  Calibration sweep
                </>
              )}
            </button>
          </div>
        </div>

        {/* Headline figures */}
        <div className="da-card flex min-h-0 items-center">
          <Kpi
            label="Elements Online"
            value={`${ARRAY_TOTALS.elementsOnline}`}
            unit={`/ ${ARRAY_TOTALS.elementsTotal}`}
            sub="Dual-polarised, coherent"
            icon={<Antenna className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Beams Loaded"
            value={`${ARRAY_TOTALS.beamsActive}`}
            unit={`/ ${ARRAY_TOTALS.beamsTotal}`}
            sub="Across nine subarrays"
            icon={<RadioTower className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Mean Phase Error"
            value={ARRAY_TOTALS.meanPhaseErrorDeg.toFixed(2)}
            unit="°"
            sub="Limit 12.00° RMS"
            icon={<Gauge className="size-[1rem]" strokeWidth={2} />}
            divider
          />
          <Kpi
            label="Array Availability"
            value={ARRAY_TOTALS.availabilityPercent.toFixed(1)}
            unit="%"
            sub={degraded === 0 ? "All tiles nominal" : `${degraded} tile needs attention`}
            tone={degraded === 0 ? "text-da-success" : "text-da-warn-text"}
            icon={<ShieldCheck className="size-[1rem]" strokeWidth={2} />}
            divider={false}
          />
        </div>

        {/* The nine tiles */}
        <div className="grid min-h-0 grid-cols-3 grid-rows-3 gap-[0.75rem]">
          {TILES.map((tile) => (
            <TileCard
              key={tile.id}
              tile={tile}
              selected={tile.id === selectedId}
              metric={metric}
              polarization={polarization}
              onSelect={() => set({ tile: tile.id })}
              onOpen={() => drillTo("/monitor/lru", { tile: tile.id })}
            />
          ))}
        </div>
      </div>

      <TileDetailRail
        tile={selected}
        onOpenChassis={() => drillTo("/monitor/lru", { tile: selected.id })}
      />
    </div>
  );
}
