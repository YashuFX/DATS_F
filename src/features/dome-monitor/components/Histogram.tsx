"use client";

import { useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import type { HistogramBin } from "../lib/faceStats";

/**
 * Value-distribution histogram — same flex-basis-bars technique as
 * data-archival's BarChart (crisp edges at any board scale, no SVG
 * viewBox smearing at small heights), but generic over a value axis
 * instead of BarChart's fixed hourly time axis.
 */
export function Histogram({
  bins,
  color = "da-c1",
  unit = "",
  className,
}: {
  bins: HistogramBin[];
  color?: string;
  unit?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bins.map((b) => b.count));

  if (bins.length === 0) {
    return <div className={cn("flex items-center justify-center text-3xs text-da-label", className)}>No data</div>;
  }

  return (
    <div className={cn("relative flex items-end gap-[0.125rem]", className)}>
      {bins.map((b, i) => (
        <span
          key={i}
          className="group relative flex h-full min-w-0 flex-1 items-end"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span
            className="w-full rounded-t-[0.0625rem] transition-[height] duration-500 ease-out"
            style={{
              height: `${Math.max(4, (b.count / max) * 100)}%`,
              backgroundColor: `var(--color-${color})`,
              opacity: hover === null || hover === i ? 0.85 : 0.4,
            }}
          />
        </span>
      ))}

      {hover !== null && (
        <span
          className="da-nums pointer-events-none absolute -top-[1.125rem] z-10 -translate-x-1/2 whitespace-nowrap rounded-[0.1875rem] bg-da-tooltip px-[0.375rem] py-[0.125rem] text-[0.5rem] font-semibold text-da-tooltip-text shadow-lg"
          style={{ left: `${((hover + 0.5) / bins.length) * 100}%` }}
        >
          {bins[hover].label}
          {unit} · {bins[hover].count}
        </span>
      )}
    </div>
  );
}
