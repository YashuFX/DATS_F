"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  ANTENNAS,
  CATALOGUE,
  MODULATIONS,
  PRIORITY_LABEL,
  STATION,
} from "../data/schedule";
import { MISSION_EPOCH_MS, clockAt } from "../lib/live";
import type { Priority, SatellitePass } from "../types";

/**
 * NEW TASK — the booking form.
 *
 * The console's one authoring surface, so it asks for everything a task needs
 * rather than inventing defaults the operator cannot see: which satellite, what
 * the pass is for, how urgent it is, when it starts and ends, and the waveform
 * it will run. Modelled on the reference design's task modal, with two
 * differences that matter.
 *
 * First, it is driven by start and end time rather than a dwell figure. That is
 * what an operator actually holds — a visibility window from the propagator —
 * and it is what decides where the task lands on the timeline.
 *
 * Second, it tells you before you commit whether the window is already spoken
 * for. That is a warning rather than a veto: over-subscribing the aperture is a
 * decision an operator is allowed to make — a critical target does displace a
 * routine one — so the dialog states the consequence and leaves the call to
 * them. Only a window that could not be flown at all is refused.
 */

const TASK_TYPES = [
  "Active Track",
  "Search",
  "Surveillance",
  "Calibration",
] as const;
type TaskType = (typeof TASK_TYPES)[number];

/** HH:MM:SS → seconds past midnight, or null when it isn't a valid clock time. */
function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [h, min, sec] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  if (h > 23 || min > 59 || sec > 59) return null;
  return h * 3600 + min * 60 + sec;
}

const secondsIntoDay = (ms: number) => {
  const d = new Date(ms);
  return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-[0.25rem]">
      <span className="flex items-baseline justify-between gap-[0.5rem]">
        <span className="text-3xs font-bold uppercase tracking-[0.1em] text-da-label">
          {label}
        </span>
        {hint && (
          <span className="da-nums text-[0.5rem] font-medium text-da-muted">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "h-[1.75rem] w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-2xs font-semibold text-da-text focus:border-da-brand focus:outline-none";

export function NewTaskDialog({
  open,
  onClose,
  onCommit,
  elapsedSec,
  passes,
}: {
  open: boolean;
  onClose: () => void;
  onCommit: (pass: SatellitePass) => void;
  /** Where the mission clock stands, so the defaults land in the future. */
  elapsedSec: number;
  /** The window as booked, for the contention check. */
  passes: SatellitePass[];
}) {
  const nowSec = secondsIntoDay(MISSION_EPOCH_MS + elapsedSec * 1000);

  const [satName, setSatName] = useState(CATALOGUE[0]?.name ?? "");
  const [taskType, setTaskType] = useState<TaskType>("Active Track");
  const [priority, setPriority] = useState<Priority>(2);
  // Five minutes out by default: far enough that the task is genuinely
  // schedulable rather than already under the playhead.
  const [start, setStart] = useState(clockAt(elapsedSec + 300));
  const [end, setEnd] = useState(clockAt(elapsedSec + 300 + 720));
  const [modulation, setModulation] = useState(MODULATIONS[0]);
  const [bandwidthMHz, setBandwidthMHz] = useState("20");
  const [dataRateKbps, setDataRateKbps] = useState("4096");
  const [maxElevationDeg, setMaxElevationDeg] = useState("45");

  const satellite = CATALOGUE.find((s) => s.name === satName) ?? CATALOGUE[0];
  const [frequencyMHz, setFrequencyMHz] = useState(
    String(satellite?.frequencyMHz ?? 8200),
  );

  /** Everything derived from the two clock fields, including why they're invalid. */
  const window = useMemo(() => {
    const startSec = parseClock(start);
    const endSec = parseClock(end);

    if (startSec === null)
      return { error: "Start time must be HH:MM or HH:MM:SS." } as const;
    if (endSec === null)
      return { error: "End time must be HH:MM or HH:MM:SS." } as const;

    const durationSec = endSec - startSec;
    if (durationSec <= 0)
      return { error: "End time must be after start time." } as const;
    if (durationSec < 60)
      return {
        error: "A pass shorter than a minute is not trackable.",
      } as const;
    if (startSec < nowSec)
      return { error: "Start time has already gone by." } as const;

    // Offset from *now*, which is what the timeline lays out against.
    const aosOffsetSec = startSec - nowSec + elapsedSec;

    const overlaps = (pass: SatellitePass) => {
      const otherStart = pass.aosOffsetSec + elapsedSec;
      return (
        otherStart < aosOffsetSec + durationSec &&
        aosOffsetSec < otherStart + pass.durationSec
      );
    };

    const clash = passes.find(overlaps);

    /**
     * The first concurrency lane with nothing across this window.
     *
     * The timeline packs the schedule into lanes so overlapping bookings stay
     * readable, and this keeps a new task out of an occupied one. Falls back to
     * the first lane when every lane is busy — which is the case the warning
     * below is about.
     */
    const freeLane =
      ANTENNAS.find(
        (lane) =>
          !passes.some((pass) => pass.antennaId === lane.id && overlaps(pass)),
      ) ?? ANTENNAS[0];

    return {
      startSec,
      endSec,
      durationSec,
      aosOffsetSec,
      clash,
      freeLane,
    } as const;
  }, [start, end, nowSec, elapsedSec, passes]);

  if (!open) return null;

  const commit = () => {
    if ("error" in window || !satellite) return;

    const pass: SatellitePass = {
      id: `PASS-N${String(Date.now()).slice(-5)}`,
      satName: satellite.name,
      noradId: satellite.noradId,
      orbitClass: satellite.orbitClass,
      stationId: STATION.id,
      // Lane assignment is packing, not hardware — see ANTENNAS.
      antennaId: window.freeLane.id,
      aosOffsetSec: window.aosOffsetSec,
      durationSec: window.durationSec,
      priority,
      status: "SCHEDULED",
      inclinationDeg: 97.4,
      apogeeKm: 620,
      perigeeKm: 590,
      periodMin: 96.8,
      frequencyMHz: Number(frequencyMHz) || satellite.frequencyMHz,
      dataRateKbps: Number(dataRateKbps) || 4096,
      linkMarginDb: 6.5,
      modulation,
      aosAzimuthDeg: 24,
      losAzimuthDeg: 198,
      maxElevationDeg: Number(maxElevationDeg) || 45,
      aosRangeKm: 2100,
      linkLock: "ACQUIRING",
      signalStrengthPct: 88,
      plannedVolumeMb: Math.round(
        (window.durationSec * (Number(dataRateKbps) || 4096)) / 8000,
      ),
      downlinkedMb: 0,
    };

    onCommit(pass);
    onClose();
  };

  const invalid = "error" in window;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-[1rem]">
      <div className="flex max-h-full w-[42rem] flex-col overflow-hidden rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface shadow-da-lg">
        <header className="flex h-[2.5rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
          <span className="flex flex-col leading-none">
            <span className="text-2xs font-bold uppercase tracking-[0.12em] text-da-text">
              New tracking task
            </span>
            <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
              {STATION.name} · booked at 1 ms resolution
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Discard"
            className="flex size-[1.5rem] cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
          >
            <X className="size-[0.875rem]" strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-[0.875rem] overflow-y-auto p-[0.875rem]">
          {/* Target */}
          <section className="flex flex-col gap-[0.5rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-brand">
              Target
            </span>
            <div className="grid grid-cols-3 gap-[0.625rem]">
              <Field label="Satellite">
                <select
                  value={satName}
                  onChange={(e) => {
                    setSatName(e.target.value);
                    const next = CATALOGUE.find(
                      (s) => s.name === e.target.value,
                    );
                    if (next) {
                      setFrequencyMHz(String(next.frequencyMHz));
                      setPriority(next.priority);
                    }
                  }}
                  className={cn(inputClass, "cursor-pointer")}
                >
                  {CATALOGUE.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="NORAD" hint="from catalogue">
                <input
                  readOnly
                  value={satellite?.noradId ?? ""}
                  className={cn(inputClass, "da-nums text-da-muted")}
                />
              </Field>
              <Field label="Orbit" hint="from catalogue">
                <input
                  readOnly
                  value={satellite?.orbitClass ?? ""}
                  className={cn(inputClass, "text-da-muted")}
                />
              </Field>
            </div>
          </section>

          {/* Window */}
          <section className="flex flex-col gap-[0.5rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-brand">
              Window
            </span>
            <div className="grid grid-cols-4 gap-[0.625rem]">
              <Field label="Start (UTC)" hint="HH:MM:SS">
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
              <Field label="End (UTC)" hint="HH:MM:SS">
                <input
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
              <Field label="Duration" hint="derived">
                <input
                  readOnly
                  value={
                    "error" in window
                      ? "—"
                      : `${Math.floor(window.durationSec / 60)}m ${String(window.durationSec % 60).padStart(2, "0")}s`
                  }
                  className={cn(inputClass, "da-nums text-da-muted")}
                />
              </Field>
              <Field label="Mission clock" hint="now">
                <input
                  readOnly
                  value={clockAt(elapsedSec)}
                  className={cn(inputClass, "da-nums text-da-muted")}
                />
              </Field>
            </div>
          </section>

          {/* Task */}
          <section className="flex flex-col gap-[0.5rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-brand">
              Task
            </span>
            <div className="grid grid-cols-3 gap-[0.625rem]">
              <Field label="Type">
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as TaskType)}
                  className={cn(inputClass, "cursor-pointer")}
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(Number(e.target.value) as Priority)
                  }
                  className={cn(inputClass, "cursor-pointer")}
                >
                  {([1, 2, 3] as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Max elevation" hint="degrees">
                <input
                  value={maxElevationDeg}
                  onChange={(e) => setMaxElevationDeg(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
            </div>
          </section>

          {/* Waveform */}
          <section className="flex flex-col gap-[0.5rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.12em] text-da-brand">
              Waveform
            </span>
            <div className="grid grid-cols-4 gap-[0.625rem]">
              <Field label="Downlink" hint="MHz">
                <input
                  value={frequencyMHz}
                  onChange={(e) => setFrequencyMHz(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
              <Field label="Bandwidth" hint="MHz">
                <input
                  value={bandwidthMHz}
                  onChange={(e) => setBandwidthMHz(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
              <Field label="Data rate" hint="kbps">
                <input
                  value={dataRateKbps}
                  onChange={(e) => setDataRateKbps(e.target.value)}
                  className={cn(inputClass, "da-nums")}
                />
              </Field>
              <Field label="Modulation">
                <select
                  value={modulation}
                  onChange={(e) => setModulation(e.target.value)}
                  className={cn(inputClass, "cursor-pointer")}
                >
                  {MODULATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Pre-commit verdict */}
          <div
            className={cn(
              "flex items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.625rem] py-[0.5rem]",
              invalid
                ? "border-da-danger/40 bg-da-danger-soft"
                : window.clash
                  ? "border-da-warn/40 bg-da-warn-soft"
                  : "border-da-success/35 bg-da-success-soft",
            )}
          >
            {invalid || window.clash ? (
              <AlertTriangle
                className={cn(
                  "mt-[0.0625rem] size-[0.8125rem] shrink-0",
                  invalid ? "text-da-danger" : "text-da-warn",
                )}
                strokeWidth={2.3}
              />
            ) : (
              <CheckCircle2
                className="mt-[0.0625rem] size-[0.8125rem] shrink-0 text-da-success"
                strokeWidth={2.3}
              />
            )}
            <span
              className={cn(
                "text-2xs font-semibold leading-[1.45]",
                invalid
                  ? "text-da-danger"
                  : window.clash
                    ? "text-da-warn-text"
                    : "text-da-success",
              )}
            >
              {invalid
                ? window.error
                : window.clash
                  ? `${window.clash.satName} is already booked across part of ${start}–${end}. Assigning will over-subscribe the aperture — auto-resolve can re-plan it afterwards.`
                  : `Window clear across ${start}–${end}. The task will appear on the timeline at ${start} and run for ${Math.floor(window.durationSec / 60)}m.`}
            </span>
          </div>
        </div>

        <footer className="flex h-[2.75rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
          <span className="text-3xs font-medium text-da-label">
            {taskType} · {PRIORITY_LABEL[priority]}
          </span>
          <span className="flex items-center gap-[0.5rem]">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[1.75rem] cursor-pointer items-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.75rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors hover:text-da-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              // Only an unflyable window is refused. Contention is the
              // operator's call to make, not the form's.
              disabled={invalid}
              className="inline-flex h-[1.75rem] items-center rounded-[0.25rem] bg-da-brand px-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand transition-colors enabled:cursor-pointer enabled:hover:bg-da-brand-hover disabled:opacity-40"
            >
              {window.clash ? "Assign anyway" : "Assign task"}
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
