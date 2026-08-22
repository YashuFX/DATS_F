"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { formatHour } from "../../lib/format";
import type { ActivityPoint } from "../../types";

const VW = 300;
const VH = 100;

/**
 * 24-hour archive throughput.
 *
 * Drawn in a fixed 300x100 viewBox with `preserveAspectRatio="none"` so the
 * plot stretches to whatever width the card gets, while stroke widths are
 * expressed in user units and stay visually constant via vector-effect.
 *
 * The trace rides `--color-da-c1`, the first chart series, not the semantic
 * info blue it happens to equal in light mode. The two part company in dark,
 * where the series turns teal and blue is reserved for informational state.
 */
export function AreaChart({
  points,
  yMax = 1024,
  className,
}: {
  points: ActivityPoint[];
  /** Top gridline in GB — 1 TB in the design. */
  yMax?: number;
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { areaPath, linePath, coords } = useMemo(() => {
    if (points.length === 0) return { areaPath: "", linePath: "", coords: [] };

    const stepX = VW / (points.length - 1 || 1);
    const coords = points.map((p, i) => ({
      x: i * stepX,
      y: VH - Math.min(1, p.gb / yMax) * VH,
      point: p,
    }));

    // Straight segments, not splines. The design's trace has sharp vertices at
    // each hourly reading; bezier smoothing rounded the 03:00 spike into a hump
    // and read as a different chart.
    const d = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
      .join(" ");

    return {
      linePath: d,
      areaPath: `${d} L ${VW} ${VH} L 0 ${VH} Z`,
      coords,
    };
  }, [points, yMax]);

  const active = hover !== null ? coords[hover] : null;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        role="img"
        aria-label="Archive activity over the last 24 hours"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const index = Math.round(ratio * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, index)));
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-da-c1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-da-c1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines at 0, 200, 400, 600, 800, 1 TB */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <line
            key={t}
            x1="0"
            x2={VW}
            y1={VH - t * VH}
            y2={VH - t * VH}
            stroke="var(--color-da-border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-da-c1)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1="0"
              y2={VH}
              stroke="var(--color-da-c1)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="3"
              fill="var(--color-da-surface)"
              stroke="var(--color-da-c1)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[0.1875rem] bg-da-tooltip px-[0.375rem] py-[0.1875rem] text-3xs font-semibold text-da-tooltip-text shadow-lg"
          style={{ left: `${(active.x / VW) * 100}%`, top: `${(active.y / VH) * 100}%` }}
        >
          <span className="da-nums">
            {formatHour(active.point.t)} · {active.point.gb} GB
          </span>
        </div>
      )}
    </div>
  );
}
