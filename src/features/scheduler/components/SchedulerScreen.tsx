"use client";

import { Grid3x3, ListFilter, Pause, Play, Plus, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { CONFLICTS, PASSES, SCHEDULE_STATS } from "../data/schedule";
import { clockAt, completionLog, liveStateOf } from "../lib/live";
import { useSimStore } from "../store/simStore";
import type { LogEntry, SatellitePass } from "../types";
import { BottomDeck } from "./BottomDeck";
import { ConstellationExplorer } from "./ConstellationExplorer";
import { StationMatrixViewport } from "./StationMatrixViewport";
import { TaskQueue } from "./TaskQueue";
import { TimelineViewport } from "./TimelineViewport";

type Viewport = "timeline" | "matrix";
type StatusFilter = "ALL" | SatellitePass["status"];

const FILTERS: StatusFilter[] = [
  "ALL",
  "TRACKING",
  "SCHEDULED",
  "CONFLICT",
  "COMPLETED",
];

const BOOT_LOG: LogEntry[] = [
  {
    time: "09:00:04",
    level: "SYS",
    message: "SGP4 propagation complete — 70 satellites at 1 ms resolution",
  },
  {
    time: "09:00:06",
    level: "PLAN",
    message: "Window booked — 34 tasks across 8 antennas",
  },
  {
    time: "09:00:07",
    level: "FAULT",
    message: "Contention on BLR-ANT-02 — 12m 54s overlap",
  },
  {
    time: "09:00:07",
    level: "FAULT",
    message: "Contention on HSN-ANT-01 — 3m 59s overlap",
  },
  {
    time: "09:00:11",
    level: "SYS",
    message: "Transmitter ONLINE — duty cycle within 10.0% limit",
  },
  {
    time: "09:00:14",
    level: "ACQ",
    message: "Carrier locked — INSAT-02 acquired on PBR-ANT-01",
  },
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
  /**
   * The clock is the runtime's, not this screen's.
   *
   * `SchedulerRuntime` — mounted in the section layout above both routes — owns
   * it and does the archiving, so tasks keep completing into Task History while
   * you are reading Task History. This screen just reads it.
   */
  const elapsedSec = useSimStore((s) => s.elapsedSec);
  const paused = useSimStore((s) => s.paused);
  const speed = useSimStore((s) => s.speed);
  const operatorLog = useSimStore((s) => s.operatorLog);
  const setPaused = useSimStore((s) => s.setPaused);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const logEvent = useSimStore((s) => s.logEvent);

  /** The window as it stands *now*, from the same derivation the runtime archives on. */
  const livePasses = useMemo(
    () => PASSES.map((pass) => liveStateOf(pass, elapsedSec)),
    [elapsedSec],
  );

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? livePasses
        : livePasses.filter((p) => p.status === filter),
    [filter, livePasses],
  );

  const activePass = livePasses.find((p) => p.id === selectedId) ?? null;

  /**
   * The command uplink, newest first.
   *
   * Completions are derived from the clock rather than pushed into state as
   * they happen: a pass whose LOS has gone by is, by definition, a line in the
   * log, and computing it means the log cannot drift out of step with the
   * timeline it describes. Only operator actions — which are events, not
   * functions of time — are held in state.
   */
  const logs = useMemo<LogEntry[]>(() => {
    const completions = livePasses
      .filter((p) => p.status === "COMPLETED")
      .map<LogEntry>((pass) => completionLog(pass, elapsedSec));

    // HH:MM:SS sorts lexicographically in clock order within the day.
    return [...completions, ...operatorLog, ...BOOT_LOG].sort((a, b) =>
      b.time.localeCompare(a.time),
    );
  }, [livePasses, elapsedSec, operatorLog]);

  /** Mission clock, so the speed control has something visibly counting. */
  const missionClock = clockAt(elapsedSec);

  const autoResolve = () =>
    logEvent({
      time: clockAt(elapsedSec),
      level: "PLAN",
      message: `Auto-resolve — ${CONFLICTS.length} contention(s) re-planned onto the next free antenna`,
    });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Operations bar */}
      <div className="flex h-[2.75rem] shrink-0 items-center justify-between gap-[0.875rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.875rem]">
          <span className="flex items-center gap-[0.3125rem]">
            <ListFilter
              className="size-[0.8125rem] text-da-muted"
              strokeWidth={2.2}
            />
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
              onClick={() => setPaused(!paused)}
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

      <BottomDeck
        activePass={activePass}
        logs={logs}
        onAutoResolve={autoResolve}
      />
    </div>
  );
}
