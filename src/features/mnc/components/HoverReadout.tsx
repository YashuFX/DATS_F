"use client";

import { FACE_MAP } from "@/features/dome-monitor/data/geometry";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { MC_HEALTH_META } from "../types";
import { toMcHealth } from "../lib/faceParameters";

/**
 * Hover readout, pinned to a corner of the viewport.
 *
 * The dome draws its own hover tag beside the face on the full /dome screen,
 * where a small floating label costs nothing. In a panel this size that tag
 * covers a meaningful share of the dome it is annotating, and it moves — so
 * the eye has to chase it around the viewport to read the same four fields.
 * Fixing it to a corner means the operator learns one place to look, and the
 * dome stays unobstructed. `showHoverTag={false}` on the canvas suppresses the
 * in-scene copy so the two can never both appear.
 *
 * Reads `hoveredFace` straight from the dome store, so it needs no wiring to
 * the scene and stays correct however the hover was produced.
 *
 * Always rendered, never mounted and unmounted: a box that pops in and out
 * under the pointer is the same restlessness this change exists to remove, so
 * it holds its place and swaps its contents instead.
 *
 * Top-left is the one free corner — the legend has top-right, and the orbit
 * puck and metric switch share the bottom edge.
 */
export function HoverReadout() {
  const hoveredFace = useDomeStore((s) => s.hoveredFace);
  const telemetry = useDomeStore((s) => s.telemetry);

  const face = hoveredFace === null ? undefined : FACE_MAP[hoveredFace];
  const ft = hoveredFace === null ? undefined : telemetry.faces[hoveredFace];
  const meta = ft ? MC_HEALTH_META[toMcHealth(ft.health)] : null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute top-[0.5rem] left-[0.5rem] z-10 w-[9.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface/85 px-[0.5rem] py-[0.375rem] backdrop-blur-[0.25rem]"
    >
      {face && ft && meta ? (
        <>
          <span className="flex items-baseline justify-between gap-[0.375rem]">
            <span className="text-2xs font-bold text-da-text">Face {face.fceNum}</span>
            <span className="text-3xs font-semibold" style={{ color: `var(--color-${meta.token})` }}>
              {meta.label}
            </span>
          </span>
          <span className="mt-[0.125rem] block text-3xs font-medium text-da-muted">
            {face.kind === "pentagon" ? "Pentagon" : "Hexagon"}
          </span>
          <span className="da-nums mt-[0.1875rem] block text-3xs text-da-muted">
            {ft.availabilityPercent.toFixed(1)}% · {ft.online}/{ft.total} online
          </span>
        </>
      ) : (
        <span className="text-3xs font-medium text-da-label">Hover a face…</span>
      )}
    </div>
  );
}
