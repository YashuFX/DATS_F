"use client";

import { useMemo } from "react";
import { FACE_MAP, getTemplate } from "@/features/dome-monitor/data/geometry";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { ELEMENT_COLOURS } from "@/features/dome-monitor/config";
import type { HealthId } from "@/features/dome-monitor/types";

/** Cells across and down. Nine cells, matching the console's 3x3 idiom. */
const N = 3;

/**
 * The selected face's elements, drawn where they actually sit, over a 3x3
 * grouping.
 *
 * The elements are the point. An earlier version aggregated each cell to a
 * single worst-state swatch and a fault count, which is a summary of the view
 * rather than the view — nine coloured squares tell you a cell is unwell but
 * not whether the failures inside it are one contiguous patch or scattered
 * attrition, and on a phased array that difference is what decides how much
 * the pattern degrades. Every one of the 177 or 374 elements is plotted at its
 * real (u, v) lattice position; the grid lines sit on top as grouping.
 *
 * SVG rather than DOM nodes: 374 absolutely-positioned divs is 374 layout
 * boxes to style and reflow, where one <svg> with 374 <circle>s is a single
 * layer the compositor draws in one pass. It also scales to any panel size
 * from one viewBox, which is what keeps this view from ever needing to scroll.
 *
 * WHAT THE 3x3 IS NOT: an LRU or tile map. That partition does not exist —
 * blocker B1 — and 7 557 = 3 x 11 x 229 is not divisible by 16, 64 or 256, so
 * the client's "256 tiles" cannot be it. These are spatial thirds of the
 * face's own lattice: they answer "which part of this face is unwell", not
 * "which box do I swap". When the real map arrives, the binning below is the
 * only thing that changes.
 */
export function FaceTileGrid({ faceNum }: { faceNum: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const face = FACE_MAP[faceNum];
  const ft = telemetry.faces[faceNum];

  const plot = useMemo(() => {
    if (!face || !ft) return null;
    const template = getTemplate(face.kind);

    // Normalise the lattice into a unit square so one viewBox serves both a
    // pentagon (177 elements) and a hexagon (374) with no per-kind constant.
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [u, v] of template) {
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const spanU = maxU - minU || 1;
    const spanV = maxV - minV || 1;

    const points: { x: number; y: number; health: HealthId }[] = [];
    const cellFlagged = new Array<number>(N * N).fill(0);

    for (let i = 0; i < template.length; i++) {
      const el = ft.elements[i];
      if (!el) continue;
      const [u, v] = template[i];
      // 0..100 in both axes; y flipped so the plot reads the way the face is
      // drawn rather than mirrored about the horizontal.
      const x = ((u - minU) / spanU) * 100;
      const y = ((maxV - v) / spanV) * 100;
      points.push({ x, y, health: el.health });

      if (el.health !== "nominal") {
        const col = Math.min(N - 1, Math.floor((x / 100) * N));
        const row = Math.min(N - 1, Math.floor((y / 100) * N));
        cellFlagged[row * N + col]++;
      }
    }

    // Faults last, so a single critical element is never painted over by the
    // hundreds of nominal ones around it.
    points.sort((a, b) => Number(a.health !== "nominal") - Number(b.health !== "nominal"));

    return { points, cellFlagged, flagged: cellFlagged.reduce((s, n) => s + n, 0) };
  }, [face, ft]);

  if (!face || !ft || !plot) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[0.375rem]">
      <div className="flex shrink-0 items-baseline justify-between gap-[0.5rem]">
        <span className="text-2xs font-bold text-da-text">
          Face {faceNum}
          <span className="ml-[0.25rem] font-medium text-da-muted">
            {face.kind === "pentagon" ? "Pentagon" : "Hexagon"}
          </span>
        </span>
        <span className="da-nums text-3xs font-semibold text-da-muted">
          {ft.online} / {ft.total} online
          {plot.flagged > 0 && (
            <span className="ml-[0.375rem] font-bold text-da-warn-text">{plot.flagged} flagged</span>
          )}
        </span>
      </div>

      {/* Square and centred, sized by the shorter axis, so the plot always
          fits whatever shape the panel is — this view must never scroll. */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          viewBox="-3 -3 106 106"
          role="img"
          aria-label={`Face ${faceNum}: ${ft.total} elements, ${plot.flagged} flagged`}
          className="aspect-square h-full max-h-full w-auto max-w-full"
        >
          {/* Cell grouping, drawn under the elements. */}
          {Array.from({ length: N * N }, (_, i) => {
            const col = i % N;
            const row = Math.floor(i / N);
            const bad = plot.cellFlagged[i] > 0;
            return (
              <rect
                key={i}
                x={(col * 100) / N}
                y={(row * 100) / N}
                width={100 / N}
                height={100 / N}
                rx={1.5}
                fill={bad ? "color-mix(in srgb, var(--color-da-warn) 10%, transparent)" : "transparent"}
                stroke="var(--color-da-border)"
                strokeWidth={0.5}
              />
            );
          })}

          {plot.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.health === "nominal" ? 1.05 : 1.7}
              fill={ELEMENT_COLOURS[p.health]}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
