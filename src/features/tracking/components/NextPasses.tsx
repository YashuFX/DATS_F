'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TRACKING } from '@/features/mnc/data/mnc.mock';

/**
 * NEXT PASSES — the selected target's schedule, searched rather than written.
 *
 * These seven rows were literals. Beside a live tracking display that is worse
 * than an empty table: it invites an operator to plan against times that have
 * no relationship to where the spacecraft actually is. Every row here comes
 * from propagating THIS satellite across the next 24 simulated hours and
 * recording each crossing of the station's fence, so a pass listed here is a
 * pass the map will show, at the minute it says.
 *
 * The table keeps its slot, its columns and its row treatment. Only the source
 * changed.
 */

/** `HH:MM:SS` in the console's simulated clock, which is UTC. */
function clock(ms: number): string {
  const d = new Date(ms);
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function km(value: number): string {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

/**
 * How good a contact is, as ink.
 *
 * Banded rather than continuous because the decision it supports is discrete:
 * a 60° pass and an 80° pass are both excellent and an operator does not choose
 * between them on two degrees. The bands are the same ones `passQuality` uses
 * for the scheduler.
 */
function elevationTone(deg: number): string {
  if (deg >= 45) return 'text-da-success';
  if (deg >= 20) return 'text-da-text';
  if (deg >= 10) return 'text-da-muted';
  return 'text-da-label';
}

export default function NextPasses() {
  const { activeSat, satellites, passes, simTime } = useDashboard();
  const sat = activeSat ? satellites[activeSat] : undefined;

  return (
    <div className="da-card flex flex-col p-3 select-none w-full h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 border-b-[max(1px,0.0625rem)] border-da-border pb-2">
        <h3 className="text-[0.6875rem] font-black uppercase tracking-wider text-da-text">
          {sat
            ? `Next Passes for ${sat.name} in Next 24 Hours (${passes.length} Passes)`
            : 'Next Passes — no target selected'}
        </h3>
      </div>

      {/* Table Container */}
      <div className="grow min-h-0 overflow-auto mt-1">
        {passes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[0.625rem] da-nums text-da-label">
            NO PASSES OVER THE FENCE IN THE NEXT 24 HOURS
          </div>
        ) : (
          <table className="h-full w-full text-left border-collapse text-[0.625rem] font-medium min-w-[43.75rem]">
            <thead>
              <tr className="text-da-label border-b-[max(1px,0.0625rem)] border-da-border/60 font-black uppercase tracking-wider">
                <th className="py-1.5 w-8 font-black">#</th>
                <th className="py-1.5 w-28 font-black">Status</th>
                <th className="py-1.5 font-black">AOS (Start)</th>
                <th className="py-1.5 font-black">LOS (End)</th>
                <th className="py-1.5 font-black">Duration</th>
                <th className="py-1.5 w-24 font-black">Max Elevation</th>
                <th className="py-1.5 font-black">Distance at AOS</th>
                <th className="py-1.5 font-black">Distance at LOS</th>
                <th className="py-1.5 font-black">Distance at Peak</th>
                <th className="py-1.5 text-right font-black">Max El</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-da-border/40 da-nums text-da-muted">
              {passes.map((pass, index) => {
                const live = simTime >= pass.aos && simTime < pass.los;
                const done = simTime >= pass.los;
                /* The bar is the peak against the sky the aperture can actually
                   use — mask to zenith — not against a flat 90°. A pass peaking
                   at 8° over a 5° mask has used almost none of the available
                   sky, and against 90° it would read as 9% rather than 3%. */
                const usable = 90 - TRACKING.elevationMaskDeg;
                const pct = Math.max(
                  0,
                  Math.min(100, ((pass.peakElevationDeg - TRACKING.elevationMaskDeg) / usable) * 100),
                );

                return (
                  <tr key={pass.aos} className="hover:bg-da-bg/40 transition-colors">
                    <td className="py-1.5 text-da-label">{index + 1}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        {done ? (
                          <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-label/10 text-da-label border-[max(1px,0.0625rem)] border-da-label/20">
                            Complete
                          </span>
                        ) : live ? (
                          <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-success/10 text-da-success border-[max(1px,0.0625rem)] border-da-success/20">
                            Visible
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-warn/10 text-da-warn border-[max(1px,0.0625rem)] border-da-warn/30">
                            Upcoming
                          </span>
                        )}

                        {live && (
                          <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-danger text-white flex items-center gap-1 animate-pulse">
                            <span className="h-1 w-1 bg-white rounded-full" />
                            Live
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 text-da-text font-bold">{clock(pass.aos)}</td>
                    <td className="py-1.5">{clock(pass.los)}</td>
                    <td className="py-1.5 font-sans font-semibold">{duration(pass.durationS)}</td>
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-da-bg rounded-full h-1.5 overflow-hidden border-[max(1px,0.0625rem)] border-da-border">
                          <div
                            className="bg-da-success h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[0.625rem] text-da-label font-bold">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5">{km(pass.rangeAtAosKm)}</td>
                    <td className="py-1.5">{km(pass.rangeAtLosKm)}</td>
                    <td className="py-1.5">{km(pass.minRangeKm)}</td>
                    <td
                      className={`py-1.5 text-right font-black ${elevationTone(pass.peakElevationDeg)}`}
                    >
                      {pass.peakElevationDeg.toFixed(2)}°
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
