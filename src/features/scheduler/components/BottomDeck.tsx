"use client";

import { Terminal, Zap } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { CONFLICTS, STATIONS } from "../data/schedule";
import type { SatellitePass } from "../types";

/**
 * BOTTOM DECK — the console's persistent action centre.
 *
 * Contention banner, live task progress, the acquisition parameters an operator
 * checks before committing a task, and the command log. Ported from
 * `scheduler-d`; the columns are the same readouts, re-tokenised and in rem.
 */

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex items-center justify-between gap-[0.75rem] py-[0.0625rem]">
      <span className="truncate text-2xs font-medium text-da-muted">{label}</span>
      <span className={cn("da-nums shrink-0 text-2xs font-bold", tone ?? "text-da-text")}>
        {value}
      </span>
    </span>
  );
}

export function BottomDeck({
  activePass,
  logs,
  onAutoResolve,
}: {
  activePass: SatellitePass | null;
  logs: string[];
  onAutoResolve: () => void;
}) {
  const station = STATIONS.find((s) => s.id === activePass?.stationId);
  const elapsed = activePass ? -activePass.aosOffsetSec : 0;
  const progress =
    activePass && activePass.status === "TRACKING"
      ? Math.min(100, Math.max(0, (elapsed / activePass.durationSec) * 100))
      : 0;

  return (
    <section className="flex h-[11.5rem] shrink-0 flex-col border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem] py-[0.5rem]">
      {/* Contention banner */}
      <div className="flex shrink-0 items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.4375rem]">
        <span className="flex items-center gap-[0.875rem]">
          {CONFLICTS.length > 0 ? (
            <span className="flex items-center gap-[0.375rem]">
              <span className="size-[0.375rem] animate-pulse rounded-full bg-da-danger" />
              <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-danger">
                {CONFLICTS.length} antenna contention
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-[0.375rem]">
              <span className="size-[0.375rem] rounded-full bg-da-success" />
              <span className="text-2xs font-bold uppercase tracking-[0.08em] text-da-success">
                Aperture resolution optimal
              </span>
            </span>
          )}

          {activePass && (
            <span className="da-nums text-2xs font-medium text-da-muted">
              {activePass.id} · {activePass.satName} · {station?.name}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onAutoResolve}
          className="inline-flex h-[1.625rem] cursor-pointer items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
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

      {/* Acquisition parameters + command log */}
      <div className="flex min-h-0 flex-1 gap-[0.875rem] pt-[0.5rem]">
        {activePass ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem] border-r-[max(1px,0.0625rem)] border-da-border pr-[0.875rem]">
              <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                Acquisition geometry
              </span>
              <Field label="Aperture impact" value="Optimal (42° slew)" tone="text-da-brand" />
              <Field
                label="Azimuth window"
                value={`${activePass.aosAzimuthDeg}° → ${activePass.losAzimuthDeg}°`}
              />
              <Field label="Elevation window" value={`15° to ${activePass.maxElevationDeg}°`} />
              <Field label="Slant range" value={`${activePass.aosRangeKm} km`} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem] border-r-[max(1px,0.0625rem)] border-da-border pr-[0.875rem]">
              <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                Waveform
              </span>
              <Field label="Frequency" value={`${activePass.frequencyMHz} MHz`} />
              <Field label="Bandwidth" value="20 MHz" />
              <Field label="Dwell time" value={`${Math.round(activePass.durationSec)}s`} />
              <Field label="Guard band" value="1.0 ms" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
              <span className="shrink-0 text-3xs font-bold uppercase tracking-[0.12em] text-da-label">
                Downlink budget
              </span>
              <Field label="Modulation" value={activePass.modulation} />
              <Field label="Data rate" value={`${activePass.dataRateKbps} kbps`} />
              <Field
                label="Link margin"
                value={`${activePass.linkMarginDb} dB`}
                tone={activePass.linkMarginDb < 4 ? "text-da-warn-text" : undefined}
              />
              <Field label="Duty cycle delta" value="92% conf" tone="text-da-success" />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-2xs uppercase tracking-[0.1em] text-da-label">
            Select a task to inspect its acquisition parameters
          </div>
        )}

        {/* Command log */}
        <div className="flex w-[22rem] shrink-0 flex-col gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.5rem]">
          <span className="flex shrink-0 items-center gap-[0.3125rem] text-3xs font-bold uppercase tracking-[0.1em] text-da-label">
            <Terminal className="size-[0.6875rem]" strokeWidth={2.4} />
            Command uplink
          </span>
          <ul className="flex min-h-0 flex-1 flex-col gap-[0.125rem] overflow-y-auto">
            {logs.map((line, i) => (
              <li
                key={`${line}-${i}`}
                className={cn(
                  "da-nums truncate text-[0.5rem] leading-[0.875rem]",
                  line.includes("CONTENTION") || line.includes("HOLD")
                    ? "text-da-danger"
                    : line.includes("ACQUIRED") || line.includes("LOCKED")
                      ? "text-da-success"
                      : "text-da-muted",
                )}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

