'use client';

import React, { useMemo, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { TRACKING } from '@/features/mnc/data/mnc.mock';
import type { SatellitePass } from '@/features/mnc/sim/passes';

/**
 * PASS TIMELINE — every pass of the selected target, drawn from its own
 * elevation profile.
 *
 * ---- what changed ----
 *
 * The arcs used to be four hand-written cubic Béziers with literal control
 * points, and the time axis was a fixed set of labels. They described no
 * spacecraft. Each arc is now the SAMPLED elevation of this satellite through
 * one crossing of the station's fence — the same profile the pass table's rows
 * are summarised from, so an arc and its row can never disagree.
 *
 * ---- the two layers ----
 *
 * The plot is two layers on one 1000 x 115 coordinate system.
 *
 * Layer 1 is the SVG, stretched with `preserveAspectRatio="none"` so the curves
 * span whatever width the card gets. That stretch is the whole problem with
 * drawing text inside it: on a wide board the horizontal scale is roughly twice
 * the vertical one, so every glyph and dot comes out about 2x wider than tall.
 *
 * Layer 2 is plain HTML positioned over it, in percentages of the same
 * coordinate space. Text and markers live there, so they render at their true
 * proportions and stay crisp at any board size.
 */

/* ── the coordinate system ─────────────────────────────────────────────── */
const VIEW_W = 1000;
const VIEW_H = 115;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 992;
const BASELINE_Y = 95;
const TOP_Y = 15;

/** Hours of sky the plot spans. */
const WINDOW_HOURS = 24;

const pct = (value: number, of: number) => `${(value / of) * 100}%`;
const pctY = (y: number) => pct(y, VIEW_H);

/** Elevation → y. 0° sits on the baseline, 90° at the top of the plot. */
function elevationY(deg: number): number {
  return BASELINE_Y - (Math.max(0, Math.min(90, deg)) / 90) * (BASELINE_Y - TOP_Y);
}

export default function PassTimeline() {
  const { activeSat, satellites, passes, simTime } = useDashboard();
  const sat = activeSat ? satellites[activeSat] : undefined;
  const [autoScale, setAutoScale] = useState(true);

  /* The window starts at the top of the current hour so the axis labels land on
     round times, and the arcs do not slide a pixel every tick. */
  const windowStart = useMemo(
    () => Math.floor(simTime / 3_600_000) * 3_600_000,
    [simTime],
  );
  const windowEnd = windowStart + WINDOW_HOURS * 3_600_000;

  const timeX = useMemo(() => {
    const span = windowEnd - windowStart;
    return (t: number) =>
      PLOT_LEFT + ((t - windowStart) / span) * (PLOT_RIGHT - PLOT_LEFT);
  }, [windowStart, windowEnd]);

  /**
   * The ceiling the arcs are drawn against.
   *
   * Auto-scale exists because most passes are low: over a 5° mask a typical
   * peak is 20-40°, and against a fixed 90° axis every arc is a bump along the
   * bottom with the top two thirds of the plot empty. Scaling to the tallest
   * pass in the window uses the height the card actually has. Turning it off
   * gives back the absolute axis, which is what you want when comparing this
   * satellite's passes against another's.
   */
  const ceiling = useMemo(() => {
    if (!autoScale) return 90;
    const peak = passes.reduce((max, p) => Math.max(max, p.peakElevationDeg), 0);
    // Rounded up to the next 10° so the axis still reads in round numbers, and
    // floored at 30° so a quiet window does not magnify a 4° graze into an arc
    // that looks like an overhead pass.
    return Math.max(30, Math.min(90, Math.ceil(peak / 10) * 10));
  }, [autoScale, passes]);

  const scaledY = useMemo(
    () => (deg: number) => elevationY((deg / ceiling) * 90),
    [ceiling],
  );

  /** One pass as an SVG path through its own samples. */
  const pathFor = useMemo(
    () => (pass: SatellitePass) => {
      const points = pass.profile
        .filter((p) => p.t >= windowStart && p.t <= windowEnd)
        .map((p) => `${timeX(p.t).toFixed(2)},${scaledY(p.elevationDeg).toFixed(2)}`);
      if (points.length < 2) return null;
      /* The profile starts and ends at the mask, not at the horizon, so the
         arc is anchored down to the baseline at both ends — otherwise every
         pass appears to begin and end in mid-air a few degrees up. */
      const first = pass.profile[0];
      const last = pass.profile[pass.profile.length - 1];
      return (
        `M ${timeX(first.t).toFixed(2)},${BASELINE_Y} ` +
        `L ${points.join(' L ')} ` +
        `L ${timeX(last.t).toFixed(2)},${BASELINE_Y}`
      );
    },
    [timeX, scaledY, windowStart, windowEnd],
  );

  const visiblePasses = passes.filter((p) => p.los >= windowStart && p.aos <= windowEnd);
  const livePass = visiblePasses.find((p) => simTime >= p.aos && simTime < p.los) ?? null;
  const nowX = timeX(Math.min(Math.max(simTime, windowStart), windowEnd));

  /** Axis ticks every three hours. */
  const ticks = useMemo(() => {
    const out: { x: number; label: string }[] = [];
    for (let h = 0; h <= WINDOW_HOURS; h += 3) {
      const t = windowStart + h * 3_600_000;
      out.push({
        x: timeX(t),
        label: `${String(new Date(t).getUTCHours()).padStart(2, '0')}:00`,
      });
    }
    return out;
  }, [windowStart, timeX]);

  const elevationTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(ceiling * f));

  return (
    <div className="da-card flex flex-col transition-colors duration-200 p-4 select-none w-full h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-2 gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-da-text">
          {sat
            ? `Pass Timeline (${sat.name.toUpperCase()} — Next ${WINDOW_HOURS} Hours, ${visiblePasses.length} Passes)`
            : 'Pass Timeline — no target selected'}
        </span>

        {/* Legend & Controls */}
        <div className="flex flex-wrap items-center gap-4 text-[0.625rem] font-bold text-da-muted">
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-2 text-da-success" viewBox="0 0 20 8" fill="none">
              <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="4" r="2" fill="currentColor" />
            </svg>
            <span>Pass in progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-2 text-da-muted" viewBox="0 0 20 8" fill="none">
              <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Scheduled</span>
          </div>

          <label
            title="Scale the axis to the tallest pass in the window instead of a fixed 90°"
            className="flex items-center gap-1.5 cursor-pointer hover:text-da-text transition-colors pl-2 border-l-[max(1px,0.0625rem)] border-da-border"
          >
            <input
              type="checkbox"
              checked={autoScale}
              onChange={(e) => setAutoScale(e.target.checked)}
              className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded-da-sm"
            />
            <span>Auto Scale</span>
          </label>

          <div className="flex items-center gap-1 pl-2 border-l-[max(1px,0.0625rem)] border-da-border">
            <span className="da-nums font-black text-da-text" title="Axis ceiling">
              {ceiling}°
            </span>
            <span
              className="p-1 text-da-label"
              title="The window follows the simulated clock; there is nothing to refresh"
            >
              {autoScale ? <RefreshCw className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-2 grow min-h-0 w-full">
        {/* Layer 1 — geometry only */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="absolute inset-0 h-full w-full text-da-text"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pass-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-da-success)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-da-success)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Elevation grid */}
          {elevationTicks.map((deg) => (
            <line
              key={deg}
              x1={PLOT_LEFT}
              y1={scaledY(deg)}
              x2={PLOT_RIGHT}
              y2={scaledY(deg)}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="3, 3"
              className="opacity-15 text-da-muted"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The elevation mask — below this line the station will not track,
              which is what makes the arcs start where they do. */}
          <rect
            x={PLOT_LEFT}
            y={scaledY(TRACKING.elevationMaskDeg)}
            width={PLOT_RIGHT - PLOT_LEFT}
            height={Math.max(0, BASELINE_Y - scaledY(TRACKING.elevationMaskDeg))}
            className="fill-da-danger/[0.04] dark:fill-da-danger/[0.07]"
            stroke="none"
          />
          <line
            x1={PLOT_LEFT}
            y1={scaledY(TRACKING.elevationMaskDeg)}
            x2={PLOT_RIGHT}
            y2={scaledY(TRACKING.elevationMaskDeg)}
            stroke="var(--color-da-danger)"
            strokeWidth="0.75"
            strokeDasharray="3, 3"
            className="opacity-60"
            vectorEffect="non-scaling-stroke"
          />

          {/* The arcs */}
          {visiblePasses.map((pass) => {
            const d = pathFor(pass);
            if (!d) return null;
            const live = pass === livePass;
            return (
              <g key={pass.aos}>
                {live && <path d={`${d} Z`} fill="url(#pass-fill)" />}
                <path
                  d={d}
                  stroke={live ? 'var(--color-da-success)' : 'currentColor'}
                  strokeWidth={live ? 2 : 1.25}
                  strokeLinejoin="round"
                  className={live ? '' : 'text-da-muted opacity-45'}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {/* Now */}
          <line
            x1={nowX}
            y1={TOP_Y}
            x2={nowX}
            y2={BASELINE_Y}
            stroke="var(--color-da-brand)"
            strokeWidth="1"
            className="opacity-70"
            vectorEffect="non-scaling-stroke"
          />

          {/* Baseline and ticks */}
          <line
            x1={PLOT_LEFT}
            y1={BASELINE_Y}
            x2={PLOT_RIGHT}
            y2={BASELINE_Y}
            stroke="currentColor"
            className="text-da-border opacity-80"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
          {ticks.map((t) => (
            <line
              key={t.label + t.x}
              x1={t.x}
              y1={BASELINE_Y}
              x2={t.x}
              y2={BASELINE_Y + 4}
              stroke="currentColor"
              className="text-da-border opacity-60"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Layer 2 — labels and markers, undistorted */}
        <div className="pointer-events-none absolute inset-0">
          {elevationTicks.map((deg) => (
            <span
              key={deg}
              className="absolute -translate-y-1/2 text-right text-[0.5rem] da-nums font-bold text-da-muted/80"
              style={{ left: 0, width: pct(30, VIEW_W), top: pctY(scaledY(deg)) }}
            >
              {deg}°
            </span>
          ))}

          <span
            className="absolute -translate-y-1/2 whitespace-nowrap text-[0.5rem] font-black uppercase tracking-[0.18em] text-da-danger/70"
            style={{ left: pct(PLOT_LEFT + 8, VIEW_W), top: pctY(scaledY(TRACKING.elevationMaskDeg / 2)) }}
          >
            {TRACKING.elevationMaskDeg}° elevation mask
          </span>

          {ticks.map((t) => (
            <span
              key={t.label + t.x}
              className="absolute -translate-x-1/2 text-[0.5rem] da-nums font-bold text-da-muted/80"
              style={{ left: pct(t.x, VIEW_W), top: pctY(BASELINE_Y + 7) }}
            >
              {t.label}
            </span>
          ))}

          {/* Peak marker on the pass in progress — the one number an operator
              is watching the arc for. */}
          {livePass && (
            <span
              className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-da-sm border-[max(1px,0.0625rem)] border-da-success/30 bg-da-success/10 px-1 py-0.5 text-[0.5rem] da-nums font-black text-da-success"
              style={{
                left: pct(timeX((livePass.aos + livePass.los) / 2), VIEW_W),
                top: pctY(scaledY(livePass.peakElevationDeg) - 3),
              }}
            >
              {livePass.peakElevationDeg.toFixed(1)}°
            </span>
          )}

          <span
            className="absolute -translate-x-1/2 whitespace-nowrap rounded-da-sm bg-da-brand px-1 py-0.5 text-[0.5rem] font-black uppercase tracking-wider text-da-on-brand"
            style={{ left: pct(nowX, VIEW_W), top: pctY(TOP_Y - 8) }}
          >
            Now
          </span>
        </div>
      </div>
    </div>
  );
}
