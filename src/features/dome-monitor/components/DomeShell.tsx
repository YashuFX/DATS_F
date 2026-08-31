"use client";

import { Hexagon, Bell, Clock } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { useDomeStore } from "../store/domeStore";
import { STALE_THRESHOLD_MS } from "../lib/readiness";
import { deriveAlarms } from "../lib/alarms";
import { THRESHOLDS } from "../config";
import { useNow } from "../hooks/useNow";
import { BrandMark } from "@/features/shell/BrandMark";
import { OperatorChip } from "@/features/shell/OperatorChip";

/**
 * Label-over-value header stat — the header's own version of a KPI tile.
 *
 * `qualifier` carries the "where" or the "out of what" as a dimmer trailing
 * run: a peak reading without the face that drives it is not actionable, and
 * folding the location into `value` at the same weight makes the number
 * itself harder to find at a two-metre glance.
 */
function HeaderStat({
  label,
  value,
  qualifier,
  tone,
  title,
}: {
  label: string;
  value: string;
  qualifier?: string;
  tone?: string;
  title?: string;
}) {
  return (
    <span className="flex shrink-0 flex-col leading-none" title={title}>
      <span className="text-[0.5rem] font-semibold uppercase tracking-[0.09em] whitespace-nowrap text-da-label">
        {label}
      </span>
      <span className="mt-[0.25rem] flex items-baseline gap-[0.25rem] whitespace-nowrap">
        <span className={cn("da-nums text-xs font-bold", tone ?? "text-da-text")}>{value}</span>
        {qualifier && <span className="da-nums text-[0.5625rem] font-semibold text-da-label">{qualifier}</span>}
      </span>
    </span>
  );
}

/** Hairline between stat groups — the header reads as three related clusters
 *  plus a freshness clock, not one undifferentiated run of numbers. */
function StatDivider() {
  return <span aria-hidden className="h-[1.625rem] w-[max(1px,0.0625rem)] shrink-0 bg-da-border" />;
}

/** Global data-age indicator — always visible, per PHASEPLAN §Phase 4's one
 *  safety-critical rule: an operator must never read stale data as healthy.
 *  Shows absolute time (matches the header's other stats); colour is what
 *  carries the staleness signal, not the format. */
function LastUpdateStat() {
  const timestamp = useDomeStore((s) => s.telemetry.timestamp);
  const now = useNow();

  const stale = now - timestamp > STALE_THRESHOLD_MS;

  return (
    <span className="flex shrink-0 flex-col leading-none" title={stale ? "Telemetry stale" : undefined}>
      <span className="flex items-center gap-[0.1875rem] text-[0.5rem] font-semibold uppercase tracking-[0.09em] whitespace-nowrap text-da-label">
        <Clock className="size-[0.5625rem]" strokeWidth={2.4} />
        Last Update
      </span>
      <span className={cn("da-nums mt-[0.25rem] text-xs font-bold whitespace-nowrap", stale ? "text-da-warn-text" : "text-da-text")}>
        {new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })} UTC
      </span>
    </span>
  );
}

/**
 * Chrome wrapper for the /dashboard route.
 *
 * The dome is the hero: a translucent glass header floats over the board
 * (reads as an overlay on the 3D object, not a solid bar splitting it off)
 * and there is no footer — its old content (element/face/cluster counts)
 * was redundant with the KPI strip, and the dome's identity caption now
 * lives as a small corner badge inside the viewport itself
 * (DomeScreen.tsx), next to the camera-preset indicator. Removing the
 * footer row gives the viewport a full extra row of height, in service of
 * "the dome should appear LARGE, centered, and visually impressive".
 */
export function DomeShell({ children }: { children: ReactNode }) {
  const setAlarmsOpen = useDomeStore((s) => s.setAlarmsOpen);
  const telemetry = useDomeStore((s) => s.telemetry);
  const totals = telemetry.totals;

  // The real alarm list, not `facesTotal - facesHealthy`. That subtraction
  // counted faces, not alarms: it missed every VSWR, thermal and phase-error
  // alarm deriveAlarms() raises, and it was numerically identical to the old
  // "Faces Active" stat sitting two slots to its left — the same fact printed
  // twice under two different names.
  const alarms = useMemo(() => deriveAlarms(telemetry), [telemetry]);
  const criticalAlarms = alarms.filter((a) => a.severity === "critical").length;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      {/* One header — everything the old KPI strip showed now lives here as
          a stat group, so the board has a single top bar, not two. */}
      <header className="relative z-30 flex h-[4rem] shrink-0 items-center justify-between gap-[1rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.875rem] backdrop-blur-[0.625rem]">
        <BrandMark section="3D Dome" />

        {/* Three stat groups and a clock, hairline-separated.
            APERTURE (how much of the array is radiating) - FAULTS (what is
            wrong and whether it is clustered) - LIMITS (the two readings that
            trip a No-Go) - freshness. Grouping is what lets the row grow:
            an operator scans to a group first and a number second, so six
            stats in four labelled clusters is a shorter read than five in an
            undifferentiated line. */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-[1.125rem] overflow-hidden">
          <HeaderStat
            label="Elements Online"
            value={`${totals.elementsOnline.toLocaleString()} / ${totals.elementsTotal.toLocaleString()}`}
            qualifier={`${totals.availabilityPercent.toFixed(2)}%`}
            title="Elements reporting nominal or degraded. Availability is the fraction of the aperture still radiating."
          />

          <StatDivider />

          <HeaderStat
            label="Worst Cluster"
            value={`${totals.worstClusterSize} el`}
            qualifier={`F${totals.worstClusterFace}`}
            tone={totals.worstClusterSize >= 10 ? "text-da-warn-text" : undefined}
            title="Largest contiguous group of failed elements. Clustered failures punch a hole in the aperture and raise sidelobes far more than the same count scattered."
          />
          <HeaderStat
            label="Alarms"
            value={`${alarms.length}`}
            qualifier={criticalAlarms > 0 ? `${criticalAlarms} critical` : undefined}
            tone={criticalAlarms > 0 ? "text-da-danger" : alarms.length > 0 ? "text-da-warn-text" : undefined}
            title="Active face-level alarms: health, VSWR, chassis temperature and phase error."
          />

          <StatDivider />

          <HeaderStat
            label="Peak VSWR"
            value={totals.peakVswr.toFixed(2)}
            qualifier={`F${totals.peakVswrFace}`}
            tone={totals.peakVswr > THRESHOLDS.vswrMax ? "text-da-danger" : undefined}
            title={`Highest standing-wave ratio on any face (limit ${THRESHOLDS.vswrMax}). Above the limit the reflected power threatens the transmit chain — this is what trips a No-Go.`}
          />
          <HeaderStat
            label="Peak Temp"
            value={`${totals.peakTempC.toFixed(1)}°C`}
            qualifier={`F${totals.peakTempFace}`}
            tone={
              totals.peakTempC >= THRESHOLDS.tempCritC
                ? "text-da-danger"
                : totals.peakTempC >= THRESHOLDS.tempWarnC
                  ? "text-da-warn-text"
                  : undefined
            }
            title={`Hottest face chassis (warn ${THRESHOLDS.tempWarnC}°C, critical ${THRESHOLDS.tempCritC}°C).`}
          />
          <HeaderStat
            label="Phase Error"
            value={`${totals.peakPhaseErrorDeg.toFixed(1)}°`}
            qualifier={`F${totals.peakPhaseErrorFace}`}
            tone={totals.peakPhaseErrorDeg > THRESHOLDS.phaseJitterDeg ? "text-da-warn-text" : undefined}
            title={`Worst per-face calibration residual, RMS (limit ${THRESHOLDS.phaseJitterDeg}°). Drives Ruze gain loss and the sidelobe floor — an aperture can drift out of calibration with every element still reporting nominal.`}
          />

          <StatDivider />

          <LastUpdateStat />
        </div>

        <div className="flex shrink-0 items-center gap-[0.625rem]">
          <OperatorChip />

          {/* Alarms bell — opens the same sliding panel the face selection uses. */}
          <button
            type="button"
            onClick={() => setAlarmsOpen(true)}
            aria-label={`${alarms.length} active alarms — open alarms panel`}
            className="relative flex size-[1.875rem] cursor-pointer items-center justify-center rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
          >
            <Bell className="size-[0.9375rem]" strokeWidth={2.2} />
            {alarms.length > 0 && (
              <span
                className={cn(
                  "absolute top-[0.25rem] right-[0.25rem] flex size-[0.4375rem] rounded-full ring-[0.125rem] ring-da-chrome",
                  criticalAlarms > 0 ? "bg-da-danger" : "bg-da-warn",
                )}
              />
            )}
          </button>
        </div>
      </header>

      {/* Main content area — full remaining height, dome fills it. */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
