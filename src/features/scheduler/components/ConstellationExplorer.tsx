"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { CONFLICTS, PRIORITY_LABEL, PRIORITY_TOKEN, STATIONS } from "../data/schedule";
import type { SatellitePass } from "../types";

/**
 * OPPORTUNITY EXPLORER — the console's right-hand sidebar.
 *
 * Passes grouped by orbit class and expandable in place, with the resolve
 * actions attached to whichever entry is contended. Ported from `scheduler-d`
 * at 18.5rem, the same rail width every other screen in this application uses.
 */
export function ConstellationExplorer({
  passes,
  selectedPassId,
  onSelectPass,
}: {
  passes: SatellitePass[];
  selectedPassId: string;
  onSelectPass: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["SSO", "GEO"]));

  const grouped = useMemo(() => {
    const out: Record<string, SatellitePass[]> = {};
    for (const pass of passes) {
      (out[pass.orbitClass] ??= []).push(pass);
    }
    return out;
  }, [passes]);

  const contended = new Set(CONFLICTS.flatMap((c) => c.passIds));
  const toggle = (cat: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <aside className="flex h-full w-[18.5rem] shrink-0 flex-col overflow-hidden border-l-[max(1px,0.0625rem)] border-da-border bg-da-bg">
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.75rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.12em] text-da-text">
          Opportunity Explorer
        </span>
        <span
          className={cn(
            "rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]",
            contended.size
              ? "animate-pulse border-da-danger/40 bg-da-danger-soft text-da-danger"
              : "border-da-success/30 bg-da-success-soft text-da-success",
          )}
        >
          {contended.size ? `${CONFLICTS.length} contended` : "Nominal"}
        </span>
      </header>

      {/* Orbit-class tallies */}
      <div className="grid shrink-0 grid-cols-3 border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/40">
        {["Tracking", "Scheduled", "Conflict"].map((label) => {
          const count = passes.filter(
            (p) => p.status.toLowerCase() === label.toLowerCase(),
          ).length;
          return (
            <span
              key={label}
              className="flex flex-col items-center gap-[0.125rem] py-[0.375rem] text-center"
            >
              <span className="da-nums text-2xs font-bold text-da-text">{count}</span>
              <span className="text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                {label}
              </span>
            </span>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[0.375rem] overflow-y-auto p-[0.5rem]">
        {Object.entries(grouped).map(([cat, group]) => {
          const open = expanded.has(cat);
          return (
            <section key={cat} className="flex flex-col gap-[0.25rem]">
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="flex cursor-pointer items-center justify-between gap-[0.375rem] rounded-[0.25rem] bg-da-subtle px-[0.4375rem] py-[0.3125rem] transition-colors hover:bg-da-border/60"
              >
                <span className="flex items-center gap-[0.25rem]">
                  {open ? (
                    <ChevronDown className="size-[0.6875rem] text-da-muted" strokeWidth={2.4} />
                  ) : (
                    <ChevronRight className="size-[0.6875rem] text-da-muted" strokeWidth={2.4} />
                  )}
                  <span className="text-3xs font-bold uppercase tracking-[0.1em] text-da-text">
                    {cat}
                  </span>
                </span>
                <span className="da-nums text-3xs font-bold text-da-label">{group.length}</span>
              </button>

              {open &&
                group.map((pass) => {
                  const selected = pass.id === selectedPassId;
                  const isContended = contended.has(pass.id);
                  const station = STATIONS.find((s) => s.id === pass.stationId);

                  return (
                    <button
                      key={pass.id}
                      type="button"
                      onClick={() => onSelectPass(pass.id)}
                      className={cn(
                        "flex cursor-pointer flex-col gap-[0.25rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] p-[0.4375rem] text-left transition-colors",
                        selected
                          ? "border-da-brand bg-da-brand-soft"
                          : isContended
                            ? "border-da-danger/45 bg-da-danger-soft hover:border-da-danger"
                            : "border-da-border bg-da-field hover:bg-da-subtle",
                      )}
                    >
                      <span className="flex items-center justify-between gap-[0.375rem]">
                        <span className="truncate text-2xs font-bold uppercase tracking-[0.04em] text-da-text">
                          {pass.satName}
                        </span>
                        <span
                          className="shrink-0 text-3xs font-bold uppercase"
                          style={{ color: `var(--color-${PRIORITY_TOKEN[pass.priority]})` }}
                        >
                          {PRIORITY_LABEL[pass.priority]}
                        </span>
                      </span>

                      <span className="flex items-center justify-between gap-[0.375rem] text-3xs">
                        <span className="da-nums truncate font-medium text-da-muted">
                          {pass.antennaId} · el {pass.maxElevationDeg}°
                        </span>
                        <span className="da-nums shrink-0 font-medium text-da-label">
                          {Math.round(pass.durationSec / 60)}m
                        </span>
                      </span>

                      {selected && (
                        <span className="mt-[0.125rem] flex flex-col gap-[0.25rem] border-t-[max(1px,0.0625rem)] border-da-border/60 pt-[0.375rem]">
                          <span className="flex justify-between text-[0.5rem] text-da-label">
                            <span>Site</span>
                            <span className="truncate">{station?.name}</span>
                          </span>
                          <span className="flex justify-between text-[0.5rem] text-da-label">
                            <span>Downlink</span>
                            <span className="da-nums">{pass.frequencyMHz} MHz</span>
                          </span>
                          {isContended && (
                            <span className="text-[0.5rem] font-bold uppercase tracking-[0.06em] text-da-danger">
                              Antenna contention — steer delta exceeded
                            </span>
                          )}
                          <span className="flex gap-[0.3125rem] pt-[0.1875rem]">
                            <span className="flex-1 rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-danger/40 bg-da-danger-soft py-[0.1875rem] text-center text-[0.5rem] font-bold uppercase tracking-[0.08em] text-da-danger">
                              Hold
                            </span>
                            <span className="flex-1 rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-info/40 bg-da-info-soft py-[0.1875rem] text-center text-[0.5rem] font-bold uppercase tracking-[0.08em] text-da-info">
                              Re-plan
                            </span>
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
            </section>
          );
        })}

        {passes.length === 0 && (
          <div className="mt-[0.5rem] flex flex-1 items-center justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-dashed border-da-border p-[1rem] text-center text-3xs uppercase tracking-[0.1em] text-da-label">
            No opportunities in this window
          </div>
        )}
      </div>
    </aside>
  );
}
