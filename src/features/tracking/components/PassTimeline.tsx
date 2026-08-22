'use client';

import React, { useState } from 'react';
import { RefreshCw, RotateCcw, Sun } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function PassTimeline() {
  const { activeSat, satellites } = useDashboard();
  const sat = satellites[activeSat];
  const [autoScale, setAutoScale] = useState(true);

  // Setup coordinates for SVG drawing (1000 width x 115 height)
  // X range: 50 to 950 (Time 06:00 to 06:00 next day)
  // Y range: 95 (0° elevation) to 15 (90° elevation)
  const getElevationY = (el: number) => {
    const startY = 95;
    const endY = 15;
    return startY - (el / 90) * (startY - endY);
  };

  return (
    <div className="da-card flex flex-col transition-colors duration-200 p-4 select-none w-full h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-2 gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-da-text">
          Pass Timeline ({sat.name.toUpperCase()} - Next 24 Hours)
        </span>

        {/* Legend & Controls */}
        <div className="flex flex-wrap items-center gap-4 text-[0.625rem] font-bold text-da-muted">
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-2 text-da-success" viewBox="0 0 20 8" fill="none">
              <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="4" r="2" fill="currentColor" />
            </svg>
            <span>Within Fence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-2 text-da-danger" viewBox="0 0 20 8" fill="none">
              <line x1="1" y1="4" x2="19" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3, 2" strokeLinecap="round" />
            </svg>
            <span>Outside Fence</span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-da-text transition-colors pl-2 border-l-[max(1px,0.0625rem)] border-da-border">
            <input
              type="checkbox"
              checked={autoScale}
              onChange={(e) => setAutoScale(e.target.checked)}
              className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded-da-sm"
            />
            <span>Auto Scale</span>
          </label>

          <div className="flex items-center gap-1 pl-2 border-l-[max(1px,0.0625rem)] border-da-border">
            <button className="p-1 rounded-da hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer text-da-muted">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 rounded-da hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer text-da-muted">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          The plot is two layers on one coordinate system (1000 x 115).

          Layer 1 is the SVG, stretched with `preserveAspectRatio="none"` so the
          curves span whatever width the card gets. That stretch is the whole
          problem with drawing text inside it: on a wide board the horizontal
          scale is roughly twice the vertical one, so every glyph, badge corner
          and dot came out about 2x wider than tall — the smeared, unreadable
          labels this panel used to show.

          Layer 2 is plain HTML positioned over it, in percentages of the same
          coordinate space. Text, pills and dots live there, so they render at
          their true proportions and stay crisp at any board size.
          ──────────────────────────────────────────────────────────────────── */}
      <div className="relative mt-2 grow min-h-0 w-full">
        {/* Layer 1 — geometry only */}
        <svg
          viewBox="0 0 1000 115"
          className="absolute inset-0 h-full w-full text-da-text"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="green-box-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <clipPath id="green-pass-clip">
              <rect x="150" y="0" width="90" height="115" />
            </clipPath>
          </defs>

          {/* Elevation grid */}
          {[0, 30, 60, 90].map((deg) => (
            <line
              key={deg}
              x1="34"
              y1={getElevationY(deg)}
              x2="992"
              y2={getElevationY(deg)}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="3, 3"
              className="opacity-15 text-da-muted"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Radar fence limit: shaded band plus its dashed edge */}
          <rect
            x="34"
            y="15"
            width="958"
            height={getElevationY(80) - 15}
            className="fill-da-danger/[0.03] dark:fill-da-danger/[0.06]"
            stroke="none"
          />
          <line
            x1="34"
            y1={getElevationY(80)}
            x2="992"
            y2={getElevationY(80)}
            stroke="#ef4444"
            strokeWidth="0.75"
            strokeDasharray="3, 3"
            className="opacity-60"
            vectorEffect="non-scaling-stroke"
          />

          {/* Sunset marker line */}
          <line
            x1="605"
            y1="15"
            x2="605"
            y2="95"
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="3, 3"
            className="opacity-60"
            vectorEffect="non-scaling-stroke"
          />

          {/* Current pass window */}
          <rect
            x="150"
            y="52"
            width="90"
            height="43"
            className="fill-da-success/[0.04] stroke-da-success/30"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* Today's pass — grey trace, green inside the window, filled under */}
          <path
            d="M 60,95 C 100,95 150,41.7 195,41.7 C 240,41.7 320,95 360,95"
            stroke="currentColor"
            strokeWidth="1.25"
            className="text-da-muted opacity-40"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M 60,95 C 100,95 150,41.7 195,41.7 C 240,41.7 320,95 360,95 Z"
            fill="url(#green-box-grad)"
            clipPath="url(#green-pass-clip)"
          />
          <path
            d="M 60,95 C 100,95 150,41.7 195,41.7 C 240,41.7 320,95 360,95"
            stroke="#10b981"
            strokeWidth="2"
            clipPath="url(#green-pass-clip)"
            vectorEffect="non-scaling-stroke"
          />

          {/* Upcoming passes */}
          {UPCOMING.map((p) => (
            <path
              key={p.label}
              d={p.d}
              stroke="currentColor"
              strokeWidth="1.25"
              className="text-da-muted opacity-50"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Baseline and its ticks */}
          <line
            x1="34"
            y1="95"
            x2="992"
            y2="95"
            stroke="currentColor"
            className="text-da-border opacity-80"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
          {TIME_TICKS.map((t, i) => (
            <line
              key={`${t.label}-${i}`}
              x1={t.x}
              y1="95"
              x2={t.x}
              y2="99"
              stroke="currentColor"
              className="text-da-border opacity-60"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Layer 2 — labels and markers, undistorted */}
        <div className="pointer-events-none absolute inset-0">
          {/* Elevation ticks */}
          {[0, 30, 60, 90].map((deg) => (
            <span
              key={deg}
              className="absolute -translate-y-1/2 text-right text-[0.5rem] da-nums font-bold text-da-muted/80"
              style={{ left: 0, width: pct(30, 1000), top: pctY(getElevationY(deg)) }}
            >
              {deg}°
            </span>
          ))}

          {/* Radar fence caption */}
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[0.5rem] font-black uppercase tracking-[0.18em] text-da-danger/70"
            style={{ left: pct(513, 1000), top: pctY(30) }}
          >
            Radar Fence Elevation Limit
          </span>

          {/* Sunrise */}
          <span
            className="absolute flex -translate-y-1/2 items-center gap-1"
            style={{ left: pct(30, 1000), top: pctY(53) }}
          >
            <Sun className="h-[0.75rem] w-[0.75rem] shrink-0 text-da-warn" strokeWidth={2} />
            <span className="flex flex-col leading-none">
              <span className="text-[0.4375rem] font-black uppercase tracking-wider text-da-warn/90">
                Sunrise
              </span>
              <span className="mt-[0.0625rem] text-[0.5625rem] da-nums font-bold text-da-warn">
                05:56
              </span>
            </span>
          </span>

          {/* Sunset pill */}
          <Pill left={605} top={17} tone="border-da-info/40 text-da-info">
            Sunset
          </Pill>

          {/* Now pill, over the peak of the current pass */}
          <Pill left={195} top={19} tone="border-da-success/60 text-da-success">
            Now
          </Pill>

          {/* Current pass caption, inside the window */}
          <span
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none"
            style={{ left: pct(195, 1000), top: pctY(79) }}
          >
            <span className="text-[0.4375rem] font-black uppercase tracking-wider text-da-success/90">
              Current Pass
            </span>
            <span className="mt-[0.125rem] text-[0.5rem] da-nums font-bold text-da-success">
              08:56 - 09:11
            </span>
          </span>

          {/* Window edge markers */}
          {[150, 240].map((x) => (
            <span
              key={x}
              className="absolute size-[0.3125rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-da-success"
              style={{ left: pct(x, 1000), top: pctY(52) }}
            />
          ))}

          {/* Upcoming pass peaks: marker plus max-elevation chip */}
          {UPCOMING.map((p) => (
            <React.Fragment key={p.label}>
              <span
                className="absolute size-[0.25rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_0_0.1875rem_rgba(255,255,255,0.10)]"
                style={{ left: pct(p.x, 1000), top: pctY(p.y) }}
              />
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[0.5rem] da-nums font-bold text-da-muted"
                style={{ left: pct(p.x, 1000), top: pctY(p.y - 13) }}
              >
                {p.label}
              </span>
            </React.Fragment>
          ))}

          {/* Time axis */}
          {TIME_TICKS.map((t, i) => (
            <span
              key={`${t.label}-${i}`}
              className="absolute -translate-x-1/2 text-[0.5rem] da-nums font-medium text-da-muted/70"
              style={{ left: pct(t.x, 1000), top: pctY(101) }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Percentage of the 1000-unit x axis / 115-unit y axis the plot is drawn on. */
const pct = (v: number, span: number) => `${(v / span) * 100}%`;
const pctY = (v: number) => `${(v / 115) * 100}%`;

/** The small outlined chips: NOW and SUNSET. */
function Pill({
  left,
  top,
  tone,
  children,
}: {
  left: number;
  top: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-[0.1875rem] border-[max(1px,0.0625rem)] bg-da-surface px-[0.3125rem] py-[0.0625rem] text-[0.4375rem] font-black uppercase tracking-wider ${tone}`}
      style={{ left: pct(left, 1000), top: pctY(top) }}
    >
      {children}
    </span>
  );
}

const TIME_TICKS = [
  { label: '06:00', x: 50 },
  { label: '08:00', x: 125 },
  { label: '10:00', x: 200 },
  { label: '12:00', x: 275 },
  { label: '14:00', x: 350 },
  { label: '16:00', x: 425 },
  { label: '18:00', x: 500 },
  { label: '20:00', x: 575 },
  { label: '22:00', x: 650 },
  { label: '00:00', x: 725 },
  { label: '02:00', x: 800 },
  { label: '04:00', x: 875 },
  { label: '06:00', x: 950 },
];

/** Peak x/y are in plot units; `d` is the trace drawn under each peak. */
const UPCOMING = [
  { label: '35°', x: 800, y: 63.9, d: 'M 770,95 C 785,95 792,63.9 800,63.9 C 808,63.9 815,95 830,95' },
  { label: '30°', x: 875, y: 68.3, d: 'M 845,95 C 860,95 867,68.3 875,68.3 C 883,68.3 890,95 905,95' },
  { label: '13°', x: 912, y: 83.4, d: 'M 895,95 C 904,95 908,83.4 912,83.4 C 916,83.4 920,95 929,95' },
  { label: '16°', x: 950, y: 80.8, d: 'M 933,95 C 942,95 946,80.8 950,80.8 C 954,80.8 958,95 967,95' },
];
