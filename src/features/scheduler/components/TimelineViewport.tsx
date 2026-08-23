"use client";

import { useMemo, useState } from "react";
import { Power } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { ANTENNAS, STATION } from "../data/schedule";
import type { SatellitePass } from "../types";

/**
 * The aperture timeline, as the DATS scheduler console draws it.
 *
 * Ported from `scheduler-d` with its shape intact — utilisation pressure strip,
 * zoom and offset navigation, a ruler carrying the LIVE playhead, and swimlanes
 * of task capsules over a dotted grid. What changed is only the measuring
 * system: every pixel became a rem and every literal colour became a theme
 * token, so it scales with the board's root font-size and follows light/dark.
 */

/** Where "now" sits across the viewport, so the past stays visible. */
const PLAYHEAD_PERCENT = 22;

const ZOOMS = [60, 120, 240];
const OFFSETS = [-30, 0, 30, 60];

export function TimelineViewport({
  passes,
  selectedPassId,
  onSelectPass,
  cold = false,
}: {
  passes: SatellitePass[];
  selectedPassId: string;
  onSelectPass: (id: string) => void;
  /** True before the health check has run: there is no schedule yet, by design. */
  cold?: boolean;
}) {
  const [zoomMin, setZoomMin] = useState(120);
  const [panOffsetMin, setPanOffsetMin] = useState(0);

  const windowSec = zoomMin * 60;
  const viewStartSec = panOffsetMin * 60 - (PLAYHEAD_PERCENT / 100) * windowSec;

  /** Aperture pressure: share of the visible window that is booked. */
  const utilisation = useMemo(() => {
    const booked = passes.reduce((sum, p) => sum + p.durationSec, 0);
    return Math.min(
      100,
      Math.round((booked / (windowSec * ANTENNAS.length)) * 100),
    );
  }, [passes, windowSec]);

  const styleFor = (pass: SatellitePass) => ({
    left: ((pass.aosOffsetSec - viewStartSec) / windowSec) * 100,
    width: (pass.durationSec / windowSec) * 100,
  });

  const ticks = useMemo(() => {
    const step = windowSec / 8;
    return Array.from({ length: 9 }, (_, i) => {
      const offsetSec = Math.round((viewStartSec + i * step) / 60) * 60;
      const base = Date.parse("2026-08-23T09:00:00Z") + offsetSec * 1000;
      return {
        offsetSec,
        label: new Date(base).toISOString().slice(11, 16),
        leftPct: ((offsetSec - viewStartSec) / windowSec) * 100,
      };
    });
  }, [viewStartSec, windowSec]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[0.875rem]">
      {/* Aperture utilisation pressure strip */}
      <div className="da-card mb-[0.625rem] flex shrink-0 items-center justify-between gap-[0.75rem] px-[0.625rem] py-[0.5rem]">
        <div className="flex items-center gap-[0.875rem]">
          <span className="text-3xs font-bold uppercase tracking-[0.14em] text-da-muted">
            Aperture Utilisation
          </span>
          <span className="flex items-center gap-[0.4375rem]">
            <span className="h-[0.5rem] w-[9rem] overflow-hidden rounded-[0.125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-bg">
              <span
                className="block h-full"
                style={{
                  width: `${utilisation}%`,
                  background:
                    "linear-gradient(90deg, var(--color-da-success), var(--color-da-brand), var(--color-da-danger))",
                }}
              />
            </span>
            <span className="da-nums w-[2.25rem] text-right text-2xs font-bold text-da-text">
              {utilisation}%
            </span>
          </span>
        </div>

        <div className="flex gap-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted">
          <span>
            Transmitter state: <span className="text-da-success">Online</span>
          </span>
          <span>
            Duty cycle limit: <span className="text-da-brand">10.0% max</span>
          </span>
          <span>
            Stabilisation gap: <span className="text-da-text">1.0 ms</span>
          </span>
        </div>
      </div>

      {/* Viewport controls */}
      <div className="mb-[0.625rem] flex shrink-0 items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border pb-[0.625rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.14em] text-da-text">
          Aperture Timeline
          <span className="ml-[0.5rem] font-medium tracking-[0.06em] text-da-label">
            {STATION.name}
          </span>
        </span>

        <div className="flex items-center gap-[0.625rem]">
          {[
            {
              label: "Zoom",
              items: ZOOMS.map((m) => ({
                key: m,
                text: `${m / 60}H`,
                on: m === zoomMin,
              })),
              set: (k: number) => setZoomMin(k),
            },
            {
              label: "Offset",
              items: OFFSETS.map((o) => ({
                key: o,
                text: o === 0 ? "Live" : `${o > 0 ? "+" : ""}${o}m`,
                on: o === panOffsetMin,
              })),
              set: (k: number) => setPanOffsetMin(k),
            },
          ].map((group) => (
            <span
              key={group.label}
              className="flex items-center gap-[0.1875rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field p-[0.1875rem]"
            >
              <span className="px-[0.375rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-label">
                {group.label}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => group.set(item.key)}
                  className={cn(
                    "da-nums cursor-pointer rounded-[0.1875rem] px-[0.4375rem] py-[0.125rem] text-3xs font-bold uppercase transition-colors",
                    item.on
                      ? "bg-da-brand text-da-on-brand"
                      : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                  )}
                >
                  {item.text}
                </button>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Ruler */}
      <div className="flex h-[1.75rem] shrink-0 overflow-hidden border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/40">
        <div className="relative h-full flex-1">
          <span
            className="absolute inset-y-0 z-10 w-[max(2px,0.125rem)] bg-da-brand"
            style={{ left: `${PLAYHEAD_PERCENT}%` }}
          />
          <span
            className="absolute top-0 z-20 -translate-x-1/2 rounded-[0.125rem] bg-da-brand px-[0.375rem] py-[0.0625rem] text-[0.5rem] font-bold uppercase leading-[0.875rem] tracking-[0.08em] text-da-on-brand"
            style={{ left: `${PLAYHEAD_PERCENT}%` }}
          >
            ▼ Live AOS
          </span>
          {ticks.map((tick) =>
            tick.leftPct < 0 || tick.leftPct > 100 ? null : (
              <span
                key={tick.offsetSec}
                className={cn(
                  "absolute bottom-0 flex flex-col items-center",
                  tick.leftPct < 3
                    ? "translate-x-0"
                    : tick.leftPct > 97
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                )}
                style={{ left: `${tick.leftPct}%` }}
              >
                <span className="da-nums mb-[0.1875rem] text-[0.5rem] font-medium leading-none text-da-label">
                  {tick.label}
                </span>
                <span className="h-[0.3125rem] w-[max(1px,0.0625rem)] bg-da-border-strong" />
              </span>
            ),
          )}
        </div>
      </div>

      {/*
        Swimlanes.

        There is no lane label column any more, and no lane names: the console
        drives one aperture, so a row does not identify a dish. Rows exist only
        so overlapping bookings stay visually separable — the lane a task sits
        in carries no meaning an operator needs to read.
      */}
      <div className="relative min-h-0 flex-1 overflow-y-auto border-b-[max(1px,0.0625rem)] border-da-border">
        <span
          className="pointer-events-none absolute inset-y-0 z-10 w-[max(1px,0.0625rem)] bg-da-brand/25"
          style={{ left: `${PLAYHEAD_PERCENT}%` }}
        />

        {/*
          A cold console has no schedule — say so, rather than leaving eight
          empty lanes that read as a failure to load.
        */}
        {cold && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-da-bg/70">
            <span className="flex flex-col items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-dashed border-da-border bg-da-surface px-[1.5rem] py-[1rem]">
              <Power
                className="size-[1.125rem] text-da-label"
                strokeWidth={1.9}
              />
              <span className="text-2xs font-bold uppercase tracking-[0.12em] text-da-muted">
                Console not initialized
              </span>
              <span className="max-w-[22rem] text-center text-2xs font-medium leading-[1.5] text-da-label">
                No tasks are booked until the subsystem health check has passed.
                Run Initialize to bring the schedule up.
              </span>
            </span>
          </div>
        )}

        {ANTENNAS.map((antenna) => {
          const lane = passes.filter((p) => p.antennaId === antenna.id);
          return (
            <div
              key={antenna.id}
              className="relative flex h-[3rem] items-center border-b-[max(1px,0.0625rem)] border-da-border/40 transition-colors hover:bg-da-subtle/30"
            >
              {/* Lane track */}
              <div
                className="relative h-full flex-1 overflow-hidden"
                style={{
                  backgroundImage:
                    "radial-gradient(var(--color-da-border) max(1px,0.0625rem), transparent max(1px,0.0625rem))",
                  backgroundSize: "1rem 1rem",
                }}
              >
                {/* Contention overlay behind conflicting tasks */}
                {lane
                  .filter((p) => p.status === "CONFLICT")
                  .map((pass) => {
                    const { left, width } = styleFor(pass);
                    if (left + width <= 0 || left >= 100) return null;
                    return (
                      <span
                        key={`contention-${pass.id}`}
                        className="pointer-events-none absolute inset-y-0 z-0 animate-pulse border-x-[max(1px,0.0625rem)] border-da-danger/40"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-da-danger) 16%, transparent) 0 0.375rem, transparent 0.375rem 0.75rem)",
                        }}
                      />
                    );
                  })}

                {/* Task capsules */}
                {lane.map((pass) => {
                  const { left, width } = styleFor(pass);
                  if (left + width <= 0 || left >= 100) return null;

                  const selected = pass.id === selectedPassId;
                  // Colour states the task's relationship to the playhead:
                  // blue is still ahead of it, green has reached or passed it,
                  // red is contended. A completed task keeps its green and only
                  // loses emphasis, so the lane reads as a history to the left
                  // of the playhead and a plan to the right.
                  const done = pass.status === "COMPLETED";
                  const token =
                    pass.status === "CONFLICT"
                      ? "da-danger"
                      : pass.status === "TRACKING" || done
                        ? "da-success"
                        : selected
                          ? "da-brand"
                          : "da-info";

                  // How much of the task has run. A task that has crossed the
                  // playhead is filling; one that has crossed it entirely is
                  // full. This is what makes the lane readable at a glance —
                  // the fill *is* the pass, not a hairline under it.
                  const elapsed = -pass.aosOffsetSec;
                  const progress = done
                    ? 100
                    : pass.status === "TRACKING"
                      ? Math.min(
                          100,
                          Math.max(0, (elapsed / pass.durationSec) * 100),
                        )
                      : 0;

                  return (
                    <button
                      key={pass.id}
                      type="button"
                      onClick={() => onSelectPass(pass.id)}
                      title={`${pass.satName} · ${Math.round(pass.durationSec / 60)}m · el ${pass.maxElevationDeg}°`}
                      className={cn(
                        "absolute inset-y-[0.5rem] z-[5] cursor-pointer overflow-hidden rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.3125rem] text-left transition-colors",
                        selected &&
                          "z-20 ring-[max(1px,0.0625rem)] ring-da-brand",
                      )}
                      style={{
                        left: `${left}%`,
                        width: `${Math.max(width, 1)}%`,
                        borderColor: done
                          ? `color-mix(in srgb, var(--color-${token}) 55%, transparent)`
                          : `var(--color-${token})`,
                        backgroundColor: `color-mix(in srgb, var(--color-${token}) ${done ? 8 : 14}%, var(--color-da-surface))`,
                        opacity: done ? 0.72 : 1,
                      }}
                    >
                      {/*
                        Progress sweep. The fill sits behind the label and runs
                        the block's full height, so a task in progress reads as
                        a bar filling rather than a box with a stripe. While it
                        is live a bright leading edge marks the receive point;
                        once complete the edge is gone and only the fill stays,
                        which is what separates "running" from "ran".
                      */}
                      {progress > 0 && (
                        <>
                          <span
                            className="pointer-events-none absolute inset-y-0 left-0 z-0"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: `color-mix(in srgb, var(--color-${token}) ${done ? 26 : 34}%, transparent)`,
                            }}
                          />
                          {!done && progress < 100 && (
                            <span
                              className="pointer-events-none absolute inset-y-0 z-[1] w-[max(2px,0.125rem)]"
                              style={{
                                left: `calc(${progress}% - max(1px, 0.0625rem))`,
                                backgroundColor: `var(--color-${token})`,
                                boxShadow: `0 0 0.375rem var(--color-${token})`,
                              }}
                            />
                          )}
                        </>
                      )}

                      {width > 6 && (
                        <span className="relative z-[2] block">
                          <span
                            className="da-nums block truncate text-3xs font-bold leading-[0.875rem]"
                            style={{ color: `var(--color-${token})` }}
                          >
                            {pass.satName}
                          </span>
                          <span className="da-nums block truncate text-[0.5rem] font-medium leading-[0.75rem] text-da-label">
                            {pass.orbitClass} ·{" "}
                            {Math.round(pass.durationSec / 60)}m
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
