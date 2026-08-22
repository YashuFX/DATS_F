"use client";

import { useState } from "react";
import { cn } from "../../lib/cn";
import { formatHour } from "../../lib/format";
import type { SeriesPoint } from "../../types";

/**
 * Small bucketed trend, drawn with flex-basis rather than SVG.
 *
 * The rail charts are only ~4rem tall and a handful of buckets wide, where an
 * SVG viewBox stretched with `preserveAspectRatio="none"` would smear the bar
 * edges. Plain elements keep every edge crisp at any board scale, and the bars
 * inherit the theme tokens directly.
 */
export function BarChart({
  points,
  color = "da-c1",
  /** Bars at or above this value switch to `accentColor` — used to make the
      error/critical buckets read at a glance. */
  accentAbove,
  accentColor = "da-danger",
  unit = "GB",
  className,
}: {
  points: SeriesPoint[];
  color?: string;
  accentAbove?: number;
  accentColor?: string;
  unit?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));

  return (
    <div className={cn("relative flex items-end gap-[0.1875rem]", className)}>
      {points.map((p, i) => {
        const hot = accentAbove !== undefined && p.value >= accentAbove;
        return (
          <span
            key={p.t}
            className="group relative flex h-full min-w-0 flex-1 items-end"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="w-full rounded-t-[0.0625rem] transition-[height] duration-500 ease-out"
              style={{
                // 6% floor so an empty bucket still reads as a bucket.
                height: `${Math.max(6, (p.value / max) * 100)}%`,
                backgroundColor: `var(--color-${hot ? accentColor : color})`,
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
            />
          </span>
        );
      })}

      {hover !== null && (
        <span
          className="da-nums pointer-events-none absolute -top-[1.125rem] z-10 -translate-x-1/2 whitespace-nowrap rounded-[0.1875rem] bg-da-tooltip px-[0.375rem] py-[0.125rem] text-[0.5rem] font-semibold text-da-tooltip-text shadow-lg"
          style={{ left: `${((hover + 0.5) / points.length) * 100}%` }}
        >
          {formatHour(points[hover].t)} · {points[hover].value.toLocaleString("en-US")}
          {unit && ` ${unit}`}
        </span>
      )}
    </div>
  );
}
