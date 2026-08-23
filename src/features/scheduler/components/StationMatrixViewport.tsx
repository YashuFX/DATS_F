"use client";

import { cn } from "@/features/data-archival/lib/cn";
import { ANTENNAS, STATIONS, STATUS_TOKEN } from "../data/schedule";
import type { SatellitePass } from "../types";

/**
 * The second viewport mode: the booking window folded into a station × antenna
 * matrix, so an operator can see which sites are saturated without reading the
 * timeline lane by lane.
 */
export function StationMatrixViewport({
  passes,
  selectedPassId,
  onSelectPass,
}: {
  passes: SatellitePass[];
  selectedPassId: string;
  onSelectPass: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[0.875rem]">
      <div className="mb-[0.625rem] flex shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-[0.625rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.14em] text-da-text">
          Station Matrix
        </span>
        <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
          Aperture time booked per site
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-[0.75rem] overflow-y-auto">
        {STATIONS.map((station) => {
          const antennas = ANTENNAS.filter((a) => a.stationId === station.id);
          const booked = passes.filter((p) => p.stationId === station.id);
          const seconds = booked.reduce((s, p) => s + p.durationSec, 0);
          const conflicts = booked.filter(
            (p) => p.status === "CONFLICT",
          ).length;

          return (
            <section
              key={station.id}
              className="da-card flex min-h-0 min-w-0 flex-col p-[0.75rem]"
            >
              <div className="flex shrink-0 items-start justify-between gap-[0.5rem]">
                <span className="flex min-w-0 flex-col leading-none">
                  <span className="da-nums text-md font-bold text-da-text">
                    {station.id}
                  </span>
                  <span className="mt-[0.25rem] truncate text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                    {station.name}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase tracking-[0.06em]",
                    conflicts
                      ? "bg-da-danger-soft text-da-danger"
                      : "bg-da-success-soft text-da-success",
                  )}
                >
                  {conflicts ? `${conflicts} conflict` : "Nominal"}
                </span>
              </div>

              <div className="mt-[0.625rem] grid shrink-0 grid-cols-3 gap-[0.5rem]">
                {[
                  ["Antennas", `${antennas.length}`],
                  ["Passes", `${booked.length}`],
                  ["Aperture", `${Math.round(seconds / 60)}m`],
                ].map(([label, value]) => (
                  <span key={label} className="flex flex-col leading-none">
                    <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                      {label}
                    </span>
                    <span className="da-nums mt-[0.1875rem] text-2xs font-bold text-da-text">
                      {value}
                    </span>
                  </span>
                ))}
              </div>

              <ul className="mt-[0.625rem] flex min-h-0 flex-1 flex-col gap-[0.25rem] overflow-y-auto">
                {booked.slice(0, 8).map((pass) => (
                  <li key={pass.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPass(pass.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-[0.375rem] rounded-[0.1875rem] border-[max(1px,0.0625rem)] px-[0.4375rem] py-[0.25rem] text-left transition-colors",
                        pass.id === selectedPassId
                          ? "border-da-brand bg-da-brand-soft"
                          : "border-da-border bg-da-field hover:bg-da-subtle",
                      )}
                    >
                      <span className="truncate text-3xs font-bold text-da-text">
                        {pass.satName}
                      </span>
                      <span
                        className="shrink-0 text-3xs font-bold uppercase"
                        style={{
                          color: `var(--color-${STATUS_TOKEN[pass.status]})`,
                        }}
                      >
                        {pass.status}
                      </span>
                    </button>
                  </li>
                ))}
                {booked.length === 0 && (
                  <li className="flex flex-1 items-center justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-dashed border-da-border p-[0.75rem] text-3xs uppercase tracking-[0.08em] text-da-label">
                    No passes booked
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
