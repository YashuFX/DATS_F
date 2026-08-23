"use client";

import { Terminal, Zap } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { CONFLICTS, STATIONS } from "../data/schedule";
import type { LogEntry, SatellitePass } from "../types";

/**
 * BOTTOM DECK — the console's persistent action centre.
 *
 * Two columns. The left one is about the selected task and reads top to bottom
 * as a decision: is the aperture contended, how far has the task run, and what
 * are the parameters you would be committing. The right one is the command
 * uplink, and it spans the deck's full height rather than sharing the bottom
 * strip — it is a running log, so four visible lines made it useless.
 */

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="flex items-center justify-between gap-[0.75rem] py-[0.0625rem]">
      <span className="truncate text-2xs font-medium text-da-muted">
        {label}
      </span>
      <span
        className={cn(
          "da-nums shrink-0 text-2xs font-bold",
          tone ?? "text-da-text",
        )}
      >
        {value}
      </span>
    </span>
  );
}

/** Colour per log level, so severity is legible without reading the message. */
const LEVEL_TOKEN: Record<LogEntry["level"], string> = {
  SYS: "da-muted",
  PLAN: "da-info",
  ACQ: "da-success",
  WARN: "da-warn",
  FAULT: "da-danger",
};

/**
 * COMMAND UPLINK.
 *
 * The previous version was a bare list of pre-formatted strings at 0.5rem with
 * no column structure, which left the time, the severity and the message
 * running together into one grey line and clipped mid-row at the bottom. This
 * is a three-column log: a fixed time gutter, a fixed level tag, then the
 * message. Fixed gutters are the point — they give the eye a rule to scan down,
 * so finding the faults in a page of routine traffic takes no reading at all.
 */
function CommandUplink({ logs }: { logs: LogEntry[] }) {
  const faults = logs.filter(
    (l) => l.level === "FAULT" || l.level === "WARN",
  ).length;

  return (
    <div className="flex h-full w-[24rem] shrink-0 flex-col overflow-hidden rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface">
      <header className="flex h-[1.625rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60 px-[0.5rem]">
        <span className="flex items-center gap-[0.3125rem] text-3xs font-bold uppercase tracking-[0.1em] text-da-text">
          <Terminal
            className="size-[0.6875rem] text-da-brand"
            strokeWidth={2.4}
          />
          Command uplink
        </span>
        <span className="flex items-center gap-[0.4375rem]">
          {faults > 0 && (
            <span className="da-nums rounded-[0.125rem] bg-da-danger-soft px-[0.25rem] text-[0.5rem] font-bold uppercase tracking-[0.06em] text-da-danger">
              {faults} flagged
            </span>
          )}
          <span className="da-nums text-[0.5rem] font-bold uppercase tracking-[0.08em] text-da-label">
            {logs.length} lines
          </span>
          <span className="relative flex size-[0.3125rem]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-da-success opacity-70" />
            <span className="relative inline-flex size-full rounded-full bg-da-success" />
          </span>
        </span>
      </header>

      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {logs.map((entry, i) => (
          <li
            key={`${entry.time}-${entry.message}-${i}`}
            className="flex h-[1.375rem] shrink-0 items-center gap-[0.4375rem] border-b-[max(1px,0.0625rem)] border-da-border/40 px-[0.5rem] transition-colors last:border-b-0 hover:bg-da-subtle/60"
          >
            <span className="da-nums w-[3.25rem] shrink-0 text-[0.5625rem] font-medium tabular-nums text-da-label">
              {entry.time}
            </span>
            <span
              className="w-[2.4375rem] shrink-0 rounded-[0.125rem] px-[0.25rem] text-center text-[0.5rem] font-bold uppercase leading-[0.75rem] tracking-[0.06em]"
              style={{
                color: `var(--color-${LEVEL_TOKEN[entry.level]})`,
                backgroundColor: `color-mix(in srgb, var(--color-${LEVEL_TOKEN[entry.level]}) 14%, transparent)`,
              }}
            >
              {entry.level}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[0.5625rem] font-medium leading-[0.875rem]",
                entry.level === "FAULT"
                  ? "text-da-danger"
                  : entry.level === "WARN"
                    ? "text-da-warn-text"
                    : entry.level === "ACQ"
                      ? "text-da-text"
                      : "text-da-muted",
              )}
              title={entry.message}
            >
              {entry.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BottomDeck({
  activePass,
  logs,
  onAutoResolve,
}: {
  activePass: SatellitePass | null;
  logs: LogEntry[];
  onAutoResolve: () => void;
}) {
  const station = STATIONS.find((s) => s.id === activePass?.stationId);
  const elapsed = activePass ? -activePass.aosOffsetSec : 0;
  const progress =
    activePass && activePass.status === "TRACKING"
      ? Math.min(100, Math.max(0, (elapsed / activePass.durationSec) * 100))
      : 0;

  return (
    /*
      12.25rem is not arbitrary. The uplink's rows are 1.375rem, and a deck of
      any other height cuts the last visible one in half, which reads as a
      rendering fault rather than as a list that scrolls. 12.25 = 1rem of
      padding + a 1.625rem log header + exactly seven whole rows.
    */
    <section className="flex h-[12.25rem] shrink-0 gap-[0.875rem] border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem] py-[0.5rem]">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Contention banner */}
        <div className="flex shrink-0 items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.4375rem]">
          <span className="flex min-w-0 items-center gap-[0.875rem]">
            {CONFLICTS.length > 0 ? (
              <span className="flex shrink-0 items-center gap-[0.375rem]">
                <span className="size-[0.375rem] animate-pulse rounded-full bg-da-danger" />
                <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-danger">
                  {CONFLICTS.length} antenna contention
                </span>
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-[0.375rem]">
                <span className="size-[0.375rem] rounded-full bg-da-success" />
                <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-success">
                  Aperture resolution optimal
                </span>
              </span>
            )}

            {activePass && (
              <span className="da-nums truncate text-2xs font-medium text-da-muted">
                {activePass.id} · {activePass.satName} · {station?.name}
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={onAutoResolve}
            className="inline-flex h-[1.625rem] shrink-0 cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
          >
            <Zap className="size-[0.6875rem]" strokeWidth={2.4} />
            Auto-resolve all
          </button>
        </div>

        {/* Task progress */}
        <div className="flex shrink-0 items-center gap-[0.625rem] border-b-[max(1px,0.0625rem)] border-da-border/60 py-[0.4375rem]">
          <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.1em] text-da-label">
            Task progress
          </span>
          <span className="h-[0.375rem] min-w-0 flex-1 overflow-hidden rounded-full bg-da-border">
            <span
              className="block h-full rounded-full bg-da-success"
              style={{ width: `${progress}%` }}
            />
          </span>
          <span className="da-nums w-[2.75rem] shrink-0 text-right text-2xs font-bold text-da-text">
            {progress.toFixed(0)}%
          </span>
        </div>

        {/* Acquisition parameters */}
        <div className="flex min-h-0 flex-1 gap-[0.875rem] pt-[0.5rem]">
          {activePass ? (
            <>
              <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem] border-r-[max(1px,0.0625rem)] border-da-border pr-[0.875rem]">
                <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                  Acquisition geometry
                </span>
                <Field
                  label="Aperture impact"
                  value="Optimal (42° slew)"
                  tone="text-da-brand"
                />
                <Field
                  label="Azimuth window"
                  value={`${activePass.aosAzimuthDeg}° → ${activePass.losAzimuthDeg}°`}
                />
                <Field
                  label="Elevation window"
                  value={`15° to ${activePass.maxElevationDeg}°`}
                />
                <Field
                  label="Slant range"
                  value={`${activePass.aosRangeKm} km`}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem] border-r-[max(1px,0.0625rem)] border-da-border pr-[0.875rem]">
                <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                  Waveform
                </span>
                <Field
                  label="Frequency"
                  value={`${activePass.frequencyMHz} MHz`}
                />
                <Field label="Bandwidth" value="20 MHz" />
                <Field
                  label="Dwell time"
                  value={`${Math.round(activePass.durationSec)}s`}
                />
                <Field label="Guard band" value="1.0 ms" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
                <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                  Downlink budget
                </span>
                <Field label="Modulation" value={activePass.modulation} />
                <Field
                  label="Data rate"
                  value={`${activePass.dataRateKbps} kbps`}
                />
                <Field
                  label="Link margin"
                  value={`${activePass.linkMarginDb} dB`}
                  tone={
                    activePass.linkMarginDb < 4
                      ? "text-da-warn-text"
                      : undefined
                  }
                />
                <Field
                  label="Duty cycle delta"
                  value="92% conf"
                  tone="text-da-success"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-2xs uppercase tracking-[0.1em] text-da-label">
              Select a task to inspect its acquisition parameters
            </div>
          )}
        </div>
      </div>

      <CommandUplink logs={logs} />
    </section>
  );
}
