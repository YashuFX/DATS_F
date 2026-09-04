"use client";

import Link from "next/link";
import { Panel } from "./Panel";
import { cn } from "@/features/data-archival/lib/cn";
import { useMemo } from "react";
import { useSimStore } from "../sim/simStore";
import { passPhase, passProgress, passQuality, type Pass } from "../sim/passes";
import type { McTaskStatus } from "../types";

const STATUS_TOKEN: Record<McTaskStatus, string> = {
  RUNNING: "da-warn-text",
  SCHEDULED: "da-info",
  COMPLETED: "da-success",
  FAILED: "da-danger",
};

/** Thin progress rail. Only a running task has anything to show. */
function Progress({ percent, status }: { percent: number; status: McTaskStatus }) {
  return (
    <span className="flex items-center gap-[0.5rem]">
      <span className="h-[0.3125rem] w-[4rem] shrink-0 overflow-hidden rounded-full bg-da-border">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            backgroundColor: `var(--color-${status === "RUNNING" ? "da-success" : "da-border-strong"})`,
          }}
        />
      </span>
      <span className="da-nums w-[2rem] shrink-0 text-3xs font-semibold text-da-muted">{percent}%</span>
    </span>
  );
}

/** IST is UTC+5:30 — the station is at Bengaluru and the schedule is read local. */
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const istClock = (epochMs: number) =>
  new Date(epochMs + IST_OFFSET_MS).toISOString().slice(11, 19);

const PHASE_STATUS: Record<ReturnType<typeof passPhase>, McTaskStatus> = {
  running: "RUNNING",
  scheduled: "SCHEDULED",
  complete: "COMPLETED",
};

/**
 * Scheduler, driven by the same propagator as the tracking display.
 *
 * These rows used to be five hand-written tasks. Beside a live globe that is
 * worse than an empty table: it invites an operator to plan against times with
 * no relationship to where the spacecraft actually are. Every row here is a
 * real pass found by searching the SGP4 states — so a contact listed at 06:12
 * is a contact the globe will show at 06:12, and its progress bar tracks the
 * simulated clock rather than a stored percentage.
 */
export function SchedulerPanel({ className }: { className?: string }) {
  const passes = useSimStore((s) => s.passes);
  const simTime = useSimStore((s) => s.simTime);
  const selectedId = useSimStore((s) => s.selectedId);
  const selectSatellite = useSimStore((s) => s.selectSatellite);

  // Running contacts first, then upcoming, then finished — the order an
  // operator scans in. Sorting by start time alone would bury an in-progress
  // pass beneath everything scheduled after it.
  const rows = useMemo(() => {
    const phaseRank = { running: 0, scheduled: 1, complete: 2 } as const;
    return [...passes]
      .sort((a, b) => {
        const d = phaseRank[passPhase(a, simTime)] - phaseRank[passPhase(b, simTime)];
        return d !== 0 ? d : a.aos - b.aos;
      })
      .slice(0, 12);
  }, [passes, simTime]);

  return (
    <Panel
      className={className}
      title="Scheduler — Upcoming & Recent Tasks"
      expandHref="/scheduler"
      expandLabel="Open Scheduler"
      footer={
        <div className="flex items-center justify-between gap-[0.75rem]">
          <span className="text-3xs font-medium text-da-muted">
            Showing {rows.length} of {passes.length} contacts · next 3 h
          </span>
          <Link
            href="/scheduler"
            className="rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.625rem] py-[0.3125rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-text transition-colors hover:bg-da-border/40 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
          >
            View All Tasks
          </Link>
        </div>
      }
    >
      {/* The table scrolls inside its own container — eight columns of pass
          detail will not compress to the left column's width at 1366 px, and
          the page body must never scroll sideways. */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b-[max(1px,0.0625rem)] border-da-border">
              {["ID", "Task Name", "Type", "Satellite", "AOS (IST)", "LOS (IST)", "Peak El", "Status", "Progress"].map((h) => (
                <th key={h} className="whitespace-nowrap px-[0.75rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((pass: Pass, i) => {
              const phase = passPhase(pass, simTime);
              const status = PHASE_STATUS[phase];
              const percent = Math.round(passProgress(pass, simTime) * 100);
              const quality = passQuality(pass);
              const selected = selectedId === pass.satelliteId;
              return (
                <tr
                  key={`${pass.satelliteId}-${pass.aos}`}
                  onClick={() => selectSatellite(pass.satelliteId)}
                  className={cn(
                    "cursor-pointer border-b-[max(1px,0.0625rem)] border-da-border/50 last:border-b-0 hover:bg-da-subtle/60",
                    selected && "bg-da-brand-soft",
                  )}
                >
                  <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs font-semibold text-da-text">
                    SCH-{String(i + 1).padStart(3, "0")}
                  </td>
                  <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-text">
                    {quality === "high" ? "Telemetry Pass" : quality === "medium" ? "Telemetry Pass" : "Horizon Contact"}
                  </td>
                  <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">
                    {(pass.durationS / 60).toFixed(1)} min
                  </td>
                  <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{pass.satelliteId}</td>
                  <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{istClock(pass.aos)}</td>
                  <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{istClock(pass.los)}</td>
                  <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs">
                    {/* Peak elevation is the single best predictor of contact
                        quality: it sets the slant range, the atmospheric path
                        and how long the pass lasts. */}
                    <span
                      style={{
                        color: `var(--color-${quality === "high" ? "da-success" : quality === "medium" ? "da-warn-text" : "da-muted"})`,
                      }}
                    >
                      {pass.peakElevationDeg.toFixed(0)}°
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem]">
                    <span
                      className="text-3xs font-bold uppercase tracking-[0.06em]"
                      style={{ color: `var(--color-${STATUS_TOKEN[status]})` }}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem]">
                    <Progress percent={percent} status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
