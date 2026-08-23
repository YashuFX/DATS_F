"use client";

import { ListFilter, Pause, Play, Plus, Power } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { PASSES, SCHEDULE_STATS } from "../data/schedule";
import {
  clockAt,
  completionLog,
  liveStateOf,
  loadedConflicts,
} from "../lib/live";
import { useSimStore } from "../store/simStore";
import type { LogEntry, SatellitePass } from "../types";
import { BottomDeck } from "./BottomDeck";
import { InitializeDialog } from "./InitializeDialog";
import { ConstellationExplorer } from "./ConstellationExplorer";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskQueue } from "./TaskQueue";
import { TimelineViewport } from "./TimelineViewport";

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
    message: "Window booked — 34 tasks on the Bengaluru aperture",
  },
  {
    time: "09:00:07",
    level: "FAULT",
    message: "Aperture contention — 12m 54s overlap between two bookings",
  },
  {
    time: "09:00:07",
    level: "FAULT",
    message: "Aperture contention — 3m 59s overlap between two bookings",
  },
  {
    time: "09:00:11",
    level: "SYS",
    message: "Transmitter ONLINE — duty cycle within 10.0% limit",
  },
  {
    time: "09:00:14",
    level: "ACQ",
    message: "Carrier locked — INSAT-02 acquired",
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
 * Two of the reference's viewport modes are gone. The spatial globe is
 * corrupted in the source. The station-by-antenna matrix went with the move to
 * a single aperture: a grid of one row and one column is not a view.
 */
export function SchedulerScreen() {
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
  const addedPasses = useSimStore((s) => s.addedPasses);
  const addPass = useSimStore((s) => s.addPass);
  const initState = useSimStore((s) => s.initState);
  const loadedPassCount = useSimStore((s) => s.loadedPassCount);
  const beginInitialize = useSimStore((s) => s.beginInitialize);
  const setLoadProgress = useSimStore((s) => s.setLoadProgress);
  const completeInitialize = useSimStore((s) => s.completeInitialize);
  const abortInitialize = useSimStore((s) => s.abortInitialize);
  const setPaused = useSimStore((s) => s.setPaused);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const logEvent = useSimStore((s) => s.logEvent);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  /**
   * The window as it stands *now*, from the same derivation the runtime
   * archives on. Tasks committed from the New Task dialog are merged in here,
   * so a booking made at 09:14 sits on the timeline exactly where its start
   * time puts it and moves toward the playhead like any other.
   *
   * Sliced by `loadedPassCount`, which is zero on a cold console and climbs
   * with the health check. That is what makes the schedule stream in behind the
   * Initialize dialog rather than appearing all at once when it closes.
   */
  const livePasses = useMemo(
    () =>
      [...PASSES.slice(0, loadedPassCount), ...addedPasses].map((pass) =>
        liveStateOf(pass, elapsedSec),
      ),
    [elapsedSec, addedPasses, loadedPassCount],
  );

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? livePasses
        : livePasses.filter((p) => p.status === filter),
    [filter, livePasses],
  );

  const activePass = livePasses.find((p) => p.id === selectedId) ?? null;

  /** Contentions among what has actually loaded — none on a cold console. */
  const conflicts = useMemo(
    () => loadedConflicts(loadedPassCount),
    [loadedPassCount],
  );

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

    // The boot lines describe a console that has come up, so they only appear
    // once it has. Before that the uplink carries whatever the operator did.
    const boot = initState === "ready" ? BOOT_LOG : [];

    // HH:MM:SS sorts lexicographically in clock order within the day.
    return [...completions, ...operatorLog, ...boot].sort((a, b) =>
      b.time.localeCompare(a.time),
    );
  }, [livePasses, elapsedSec, operatorLog, initState]);

  /** Mission clock, so the speed control has something visibly counting. */
  const missionClock = clockAt(elapsedSec);

  /**
   * Initialize — take the console back to the top of the window.
   *
   * Opens the health check, clears the run, and lets the schedule reload from
   * cold as the subsystems come up. Deliberately does *not* touch the pass
   * archive: re-initialising the console is not the same as erasing what
   * already flew, and Task History has its own Refresh for that.
   */
  const runInitialize = () =>
    beginInitialize([
      {
        time: clockAt(0),
        level: "SYS",
        message:
          "Initialize — subsystem health check started, schedule loading",
      },
    ]);

  const autoResolve = () =>
    logEvent({
      time: clockAt(elapsedSec),
      level: "PLAN",
      message: `Auto-resolve — ${conflicts.length} contention(s) re-planned into the next free slot`,
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
        </div>

        <div className="flex items-center gap-[0.875rem]">
          <span className="flex items-center gap-[0.875rem]">
            {[
              [
                "Booked",
                `${new Set(livePasses.map((p) => p.satName)).size} / ${SCHEDULE_STATS.satelliteCapacity}`,
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
            onClick={runInitialize}
            disabled={initState === "running"}
            title="Run the subsystem health check and load the schedule"
            className={cn(
              "inline-flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors enabled:cursor-pointer disabled:opacity-45",
              // A cold console has one thing worth doing, so the button says so.
              initState === "idle"
                ? "border-da-brand bg-da-brand-soft text-da-brand enabled:hover:bg-da-brand enabled:hover:text-da-on-brand"
                : "border-da-border text-da-muted enabled:hover:border-da-brand enabled:hover:text-da-brand",
            )}
          >
            <Power className="size-[0.6875rem]" strokeWidth={2.6} />
            Initialize
          </button>

          <button
            type="button"
            onClick={() => setTaskDialogOpen(true)}
            disabled={initState !== "ready"}
            title={
              initState === "ready"
                ? "Book a new tracking task"
                : "Initialize the console first"
            }
            className="inline-flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] bg-da-brand px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand transition-colors enabled:cursor-pointer enabled:hover:bg-da-brand-hover disabled:opacity-45"
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
          cold={initState !== "ready"}
        />

        <TimelineViewport
          passes={visible}
          selectedPassId={selectedId}
          onSelectPass={setSelectedId}
          cold={initState === "idle"}
        />

        <ConstellationExplorer
          passes={visible}
          selectedPassId={selectedId}
          onSelectPass={setSelectedId}
          conflicts={conflicts}
        />
      </div>

      <BottomDeck
        activePass={activePass}
        logs={logs}
        conflicts={conflicts}
        onAutoResolve={autoResolve}
      />

      <InitializeDialog
        open={initState === "running"}
        onProgress={(fraction) => setLoadProgress(fraction, PASSES.length)}
        onComplete={() =>
          completeInitialize({
            time: clockAt(0),
            level: "SYS",
            message: `Health check passed — ${PASSES.length} tasks booked, SGP4 propagated against ${SCHEDULE_STATS.satelliteCapacity} TLEs`,
          })
        }
        onCancel={() =>
          abortInitialize({
            time: clockAt(0),
            level: "WARN",
            message:
              "Initialization cancelled — console remains cold, no schedule loaded",
          })
        }
      />

      <NewTaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        elapsedSec={elapsedSec}
        passes={livePasses}
        onCommit={(pass) => {
          addPass(pass);
          setSelectedId(pass.id);
          logEvent({
            time: clockAt(elapsedSec),
            level: "PLAN",
            // The committed pass carries its offset from the mission epoch,
            // not from now — `clockAt` already starts there, so adding the
            // elapsed clock on top would report the start an extra `elapsedSec`
            // into the future.
            message: `Task booked — ${pass.satName} at ${clockAt(
              pass.aosOffsetSec,
            )} for ${Math.round(pass.durationSec / 60)}m`,
          });
        }}
      />
    </div>
  );
}
