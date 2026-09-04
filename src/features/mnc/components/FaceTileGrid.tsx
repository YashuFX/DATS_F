"use client";

import { useMemo } from "react";
import { FACE_MAP } from "@/features/dome-monitor/data/geometry";
import { buildFaceLattice } from "../lib/faceLattice";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { HEALTH_META, type HealthId } from "@/features/dome-monitor/types";

const FILL: Record<HealthId, string> = {
  nominal: "var(--color-da-success)",
  degraded: "var(--color-da-warn)",
  critical: "var(--color-da-danger)",
  offline: "var(--color-da-offline)",
};

/**
 * Lattice sites carrying no radiating element.
 *
 * Distinct from `offline`, and the distinction matters: an offline element is
 * hardware that should be radiating and is not — a fault. These sites hold no
 * element at all, by design, because the panel is square and the aperture
 * inscribed in it is not. One is a problem, the other is the shape of the
 * thing, and colouring them alike would invent 200-odd faults per face.
 */
const INERT = "var(--color-da-lattice-unused)";

/** Longest edge of the plot, in viewBox units. */
const SPAN = 100;

interface Point {
  x: number;
  y: number;
  /** null = a lattice site with no radiating element. */
  health: HealthId | null;
}

/** Andrew's monotone chain — the aperture outline is the hull of its elements. */
function convexHull(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 3) return pts;
  const sorted = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Point2, a: Point2, b: Point2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  type Point2 = { x: number; y: number };
  const build = (input: Point2[]) => {
    const out: Point2[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

/** Regular hexagon path, pointy-top — the Voronoi cell of a triangular lattice. */
function hexPath(x: number, y: number, r: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const a = ((30 + i * 60) * Math.PI) / 180;
    d += `${i === 0 ? "M" : "L"}${(x + r * Math.cos(a)).toFixed(2)} ${(y + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + "Z";
}

/**
 * One face's aperture as a flat honeycomb — the 2D rendering of the POC tile,
 * and the fallback the panel shows when WebGL is unavailable.
 *
 * Geometry comes from `buildFaceLattice`, the same function the 3D tile reads,
 * so the two cannot drift apart: same sites, same pitch, same square carrier,
 * same inert population. This file owns only the projection and the painting.
 *
 * The elements sit on a TRIANGULAR lattice — 0.1 m pitch, rows offset half a
 * pitch and spaced 0.0866 m (= pitch·√3/2). Every element's Voronoi cell is
 * therefore a regular hexagon, and drawing them that way makes the plot a
 * picture of the actual aperture rather than a chart of it.
 *
 * This replaced a 3×3 grid of square blocks, and the reason is worth keeping:
 * a hexagonal face forced into a rectangular split gave nine groups holding
 * between 23 and 56 elements, with ~23% of the map inert filler padding the
 * corners. It read as broken because it was — a square structure imposed on a
 * hex lattice. The grouping was invented in the first place (the real
 * element→tile map is blocker B1, and 7 557 = 3 × 11 × 229 is not divisible by
 * 16, 64 or 256), so there was nothing real being given up by dropping it.
 *
 * With cells tessellating, no filler is needed at all: the hexagonal silhouette
 * of the face emerges from the elements themselves, which is both truthful and
 * the thing that makes one face recognisable from another.
 *
 * Faults carry a ring as well as a hue, so a single bad element is findable in
 * 374 without relying on colour — the same non-colour redundancy rule the dome
 * scene follows.
 */
export function FaceTileGrid({ faceNum }: { faceNum: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const face = FACE_MAP[faceNum];
  const ft = telemetry.faces[faceNum];

  const plot = useMemo(() => {
    if (!face || !ft) return null;
    const lattice = buildFaceLattice(face, ft);

    // Shared lattice is centred on the origin in metres; the SVG wants a
    // top-left origin in viewBox units.
    const scale = SPAN / Math.max(lattice.width || 1, lattice.height || 1);
    const points: Point[] = lattice.sites.map((site) => ({
      x: (site.u + lattice.width / 2) * scale,
      y: (lattice.height / 2 - site.v) * scale, // +v is up; SVG y runs down
      health: site.health,
    }));

    // Faults last so one bad cell is never overdrawn by its healthy neighbours.
    points.sort(
      (a, b) =>
        Number(a.health !== null && a.health !== "nominal") -
        Number(b.health !== null && b.health !== "nominal"),
    );

    // The outline traces the RADIATING aperture, not the carrier — that
    // boundary is the point of showing the inert sites at all.
    const hull = convexHull(points.filter((p) => p.health).map((p) => ({ x: p.x, y: p.y })));
    const hullPath = hull.length
      ? hull.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("") + "Z"
      : "";

    return {
      points,
      radius: lattice.cellRadius * scale,
      width: lattice.width * scale,
      height: lattice.height * scale,
      hullPath,
      counts: lattice.counts,
      inert: lattice.inert,
    };
  }, [face, ft]);

  if (!face || !ft || !plot) return null;

  const { points, radius, width, height, hullPath, counts, inert } = plot;
  const pad = radius * 2.2;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[0.4375rem]">
      <div className="flex shrink-0 items-baseline justify-between gap-[0.5rem]">
        <span className="text-2xs font-bold whitespace-nowrap text-da-text">
          Face {faceNum}
          <span className="ml-[0.3125rem] font-medium text-da-muted">
            {face.kind === "pentagon" ? "Pentagon" : "Hexagon"}
          </span>
        </span>
        <span className="da-nums shrink-0 text-3xs font-semibold whitespace-nowrap text-da-muted">
          {ft.online}/{ft.total} online
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
          role="img"
          aria-label={`Face ${faceNum}: ${ft.total} elements, ${ft.total - counts.nominal} flagged`}
          className="h-full max-h-full w-full max-w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Carrier ground, square. */}
          <rect
            x={-pad * 0.55}
            y={-pad * 0.55}
            width={width + pad * 1.1}
            height={height + pad * 1.1}
            rx={radius}
            fill="var(--color-da-lattice-ground)"
          />

          {points.map((p, i) => (
            <path
              key={i}
              d={hexPath(p.x, p.y, radius)}
              fill={p.health ? FILL[p.health] : INERT}
            />
          ))}

          {/* Outline of the radiating aperture, over the cells rather than
              under them: it is a boundary between two populations, so it has
              to be legible against both. */}
          {hullPath && (
            <path
              d={hullPath}
              fill="none"
              stroke="var(--color-da-border-strong)"
              strokeWidth={radius * 0.2}
              strokeLinejoin="round"
              opacity={0.85}
              transform={`translate(${width / 2} ${height / 2}) scale(1.045) translate(${-width / 2} ${-height / 2})`}
            />
          )}

          {/* Non-colour redundancy: a fault is ringed as well as recoloured. */}
          {points
            .filter((p) => p.health && p.health !== "nominal")
            .map((p, i) => (
              <path
                key={`r${i}`}
                d={hexPath(p.x, p.y, radius * 1.75)}
                fill="none"
                stroke={FILL[p.health as HealthId]}
                strokeWidth={radius * 0.28}
                opacity={0.62}
              />
            ))}
        </svg>
      </div>

      {/* Counts by state — the legend with numbers on it, which is what an
          operator actually wants here. States at zero are dropped rather than
          shown as "0": a row of zeroes is noise, and their absence is the
          same information. */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-[0.75rem] gap-y-[0.25rem]">
        {(Object.keys(counts) as HealthId[])
          .filter((h) => counts[h] > 0)
          .map((h) => (
            <span key={h} className="flex items-center gap-[0.3125rem]">
              <span className="size-[0.4375rem] shrink-0 rounded-[0.125rem]" style={{ backgroundColor: FILL[h] }} />
              <span className="da-nums text-3xs font-bold text-da-text">{counts[h]}</span>
              <span className="text-3xs font-medium text-da-muted">{HEALTH_META[h].label}</span>
            </span>
          ))}
        {inert > 0 && (
          <span className="flex items-center gap-[0.3125rem]" title="Lattice sites with no radiating element — the square panel around a hexagonal aperture, not a fault">
            <span className="size-[0.4375rem] shrink-0 rounded-[0.125rem]" style={{ backgroundColor: INERT }} />
            <span className="da-nums text-3xs font-bold text-da-text">{inert}</span>
            <span className="text-3xs font-medium text-da-muted">Not radiating</span>
          </span>
        )}
      </div>
    </div>
  );
}
