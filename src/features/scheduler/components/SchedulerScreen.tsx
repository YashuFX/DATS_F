"use client";

import { Grid3x3, ListFilter, Pause, Play, Plus, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { CONFLICTS, PASSES, SCHEDULE_STATS } from "../data/schedule";
import { useSimClock } from "../hooks/useSimClock";
import type { SatellitePass } from "../types";
import { BottomDeck } from "./BottomDeck";
import { ConstellationExplorer } from "./ConstellationExplorer";
import { StationMatrixViewport } from "./StationMatrixViewport";
import { TaskQueue } from "./TaskQueue";
import { TimelineViewport } from "./TimelineViewport";

type Viewport = "timeline" | "matrix";
type StatusFilter = "ALL" | SatellitePass["status"];

const FILTERS: StatusFilter[] = ["ALL", "TRACKING", "SCHEDULED", "CONFLICT", "COMPLETED"];

const INITIAL_LOGS = [
  "09:00:04  SGP4 propagation complete — 70 satellites, 1 ms resolution",
  "09:00:06  Window booked: 34 tasks across 8 antennas",
  "09:00:07  CONTENTION detected — BLR-ANT-02, 12m 54s overlap",
  "09:00:07  CONTENTION detected — HSN-ANT-01, 3m 59s overlap",
  "09:00:11  Transmitter ONLINE — duty cycle within 10.0% limit",
  "09:00:14  LOCKED — INSAT-02 acquired on PBR-ANT-01",
];

/**
 * SCHEDULER — the DATS scheduler console.
 *
 * Layout is the `scheduler-d` design: an operations bar across the top, a
 * primary viewport with the opportunity explorer beside it, and the persistent
 * action deck along the bottom. What differs from the source is the measuring
 * system, not the design — rem throughout, theme tokens instead of literal
 * colours, and no pixel breakpoints, so it scales on the same root font-size
 * clamp as every other screen here.
 *
 * The spatial globe mode is deliberately absent: that component is corrupted in
 * the source, so the viewport toggle carries timeline and matrix only.
 */
export function SchedulerScreen() {
  const [viewport, setViewport] = useState<Viewport>("timeline");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selectedId, setSelectedId] = useState(
    PASSES.find((p) => p.status === "TRACKING")?.id ?? PASSES[0]?.id ?? "",
  );
  const [paused, setPaused] = useState(false);
  // A pass runs 6-19 minutes, so at 1x its bar advances about a tenth of a
  // percent per second — real, but indistinguishable from frozen. The console
  // opens at 20x, where a pass plays out in well under a minute, and 1x stays
  // available for reading the true rate.
  const [speed, setSpeed] = useState(20);
  const [logs, setLogs] = useState(INITIAL_LOGS);

  const elapsedSec = useSimClock({ paused, speed });

  /**
   * The window as it stands *now*. A pass keeps its booked duration; what
   * changes is how far it sits from the playhead, and a conflict stays a
   * conflict because contention is a property of the booking, not of time.
   */
  const livePasses = useMemo(
    () =>
      PASSES.map((pass) => {
        const aosOffsetSec = pass.aosOffsetSec - elapsedSec;
        const sinceAos = -aosOffsetSec;
        const status: SatellitePass["status"] =
          pass.status === "CONFLICT"
            ? "CONFLICT"
            : sinceAos >= pass.durationSec
              ? "COMPLETED"
              : sinceAos > 0
                ? "TRACKING"
                : "SCHEDULED";
        return { ...pass, aosOffsetSec, status };
      }),
    [elapsedSec],
  );

  const visible = useMemo(
    () => (filter === "ALL" ? livePasses : livePasses.filter((p) => p.status === filter)),
    [filter, livePasses],
  );

  const activePass = livePasses.find((p) => p.id === selectedId) ?? null;

  /** Mission clock, so the speed control has something visibly counting. */
  const missionClock = new Date(
    Date.parse("2026-08-23T09:00:00Z") + elapsedSec * 1000,
  )
    .toISOString()
    .slice(11, 19);

  const autoResolve = () =>
    setLogs((prev) => [
      ...prev,
      `09:0${prev.length % 10}:22  AUTO-RESOLVE — ${CONFLICTS.length} contention(s) re-planned onto next free antenna`,
    ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Operations bar */}
      <div className="flex h-[2.75rem] shrink-0 items-center justify-between gap-[0.875rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.875rem]">
          <span className="flex items-center gap-[0.3125rem]">
            <ListFilter className="size-[0.8125rem] text-da-muted" strokeWidth={2.2} />
            <span className="flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "cursor-pointer rounded-[0.1875rem] px-[0.5rem] py-[0.1875rem] text-3xs font-bold uppercase tracking-[0.06em] transition-colors",
                    f === filter
                      ? "bg-da-brand text-da-on-brand"
                      : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                  )}
                >
                  {f}
                </button>
              ))}
            </span>
          </span>

          <span className="flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
            {(
              [
                ["timeline", "Timeline", Rows3],
                ["matrix", "Matrix", Grid3x3],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                className={cn(
                  "flex cursor-pointer items-center gap-[0.3125rem] rounded-[0.1875rem] px-[0.5rem] py-[0.1875rem] text-3xs font-bold uppercase tracking-[0.06em] transition-colors",
                  id === viewport
                    ? "bg-da-brand text-da-on-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                )}
              >
                <Icon className="size-[0.6875rem]" strokeWidth={2.4} />
                {label}
              </button>
            ))}
          </span>
        </div>

        <div className="flex items-center gap-[0.875rem]">
          <span className="flex items-center gap-[0.875rem]">
            {[
              [
                "Booked",
                `${SCHEDULE_STATS.satellitesScheduled} / ${SCHEDULE_STATS.satelliteCapacity}`,
              ],
              ["Tasks", `${visible.length}`],
              ["Resolution", `${SCHEDULE_STATS.resolutionMs} ms`],
            ].map(([label, value]) => (
              <span key={label} className="flex flex-col leading-none">
                <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                  {label}
                </span>
                <span className="da-nums mt-[0.125rem] text-2xs font-bold text-da-text">
                  {value}
                </span>
              </span>
            ))}
          </span>

          <span className="flex flex-col leading-none">
            <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              Mission clock
            </span>
            <span
              className={cn(
                "da-nums mt-[0.125rem] text-2xs font-bold",
                paused ? "text-da-warn-text" : "text-da-text",
              )}
            >
              {missionClock}
              {paused && " · held"}
            </span>
          </span>

          <span className="flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]">
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              title={paused ? "Resume" : "Pause"}
              className="flex size-[1.375rem] cursor-pointer items-center justify-center rounded-[0.1875rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
            >
              {paused ? (
                <Play className="size-[0.6875rem]" strokeWidth={2.4} />
              ) : (
                <Pause className="size-[0.6875rem]" strokeWidth={2.4} />
              )}
            </button>
            {[1, 20, 60].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "da-nums cursor-pointer rounded-[0.1875rem] px-[0.375rem] py-[0.1875rem] text-3xs font-bold transition-colors",
                  s === speed
                    ? "bg-da-brand text-da-on-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                )}
              >
                {s}×
              </button>
            ))}
          </span>

          <button
            type="button"
            className="inline-flex h-[1.75rem] cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] bg-da-brand px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand transition-colors hover:bg-da-brand-hover"
          >
            <Plus className="size-[0.6875rem]" strokeWidth={2.6} />
            New task
          </button>
        </div>
      </div>

      {/* Workspace: viewport + explorer */}
      <div className="flex min-h-0 flex-1">
        <TaskQueue
          passes={visible}
          selectedPassId={selectedId}
          onSelectPass={setSelectedId}
          speed={speed}
        />

        {viewport === "timeline" ? (
          <TimelineViewport
            passes={visible}
            selectedPassId={selectedId}
            onSelectPass={setSelectedId}
          />
        ) : (
          <StationMatrixViewport
            passes={visible}
            selectedPassId={selectedId}
            onSelectPass={setSelectedId}
          />
        )}

        <ConstellationExplorer
          passes={visible}
          selectedPassId={selectedId}
          onSelectPass={setSelectedId}
        />
      </div>

      <BottomDeck activePass={activePass} logs={logs} onAutoResolve={autoResolve} />
    </div>
  );
}
