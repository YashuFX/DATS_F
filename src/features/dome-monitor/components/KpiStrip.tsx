"use client";

import { Antenna, Hexagon, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { useDomeStore } from "../store/domeStore";

/** One headline figure in the KPI strip. */
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
 * KpiStrip — 4 headline figures in a da-card.
 * Elements Online · Faces Active · Worst Cluster · Availability
 */
export function KpiStrip() {
  const totals = useDomeStore((s) => s.telemetry.totals);
  const degraded = totals.facesTotal - totals.facesHealthy;

  return (
    <div className="da-card flex min-h-0 items-center">
      <Kpi
        label="Elements Online"
        value={`${totals.elementsOnline}`}
        unit={`/ ${totals.elementsTotal}`}
        sub="7 557 across 26 faces"
        icon={<Antenna className="size-[1rem]" strokeWidth={2} />}
        divider
      />
      <Kpi
        label="Faces Active"
        value={`${totals.facesHealthy}`}
        unit={`/ ${totals.facesTotal}`}
        sub="11 pent · 15 hex"
        icon={<Hexagon className="size-[1rem]" strokeWidth={2} />}
        divider
      />
      <Kpi
        label="Worst Cluster"
        value={`${totals.worstClusterSize}`}
        unit="el"
        sub={`Face ${totals.worstClusterFace}`}
        icon={<TriangleAlert className="size-[1rem]" strokeWidth={2} />}
        tone={totals.worstClusterSize > 5 ? "text-da-warn-text" : undefined}
        divider
      />
      <Kpi
        label="Availability"
        value={totals.availabilityPercent.toFixed(1)}
        unit="%"
        sub={degraded === 0 ? "All faces nominal" : `${degraded} face${degraded > 1 ? "s" : ""} flagged`}
        tone={degraded === 0 ? "text-da-success" : "text-da-warn-text"}
        icon={<ShieldCheck className="size-[1rem]" strokeWidth={2} />}
        divider={false}
      />
    </div>
  );
}
