"use client";

import { useMemo } from "react";
import { FACE_MAP } from "@/features/dome-monitor/data/geometry";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { HEALTH_META, type HealthId } from "@/features/dome-monitor/types";
import { buildFaceLattice } from "../lib/faceLattice";

/** Matches the 3D tile's literal hex, which three.js needs, and the 2D view's
 *  tokens resolve to the same values per theme. */
const SWATCH: Record<HealthId, string> = {
  nominal: "var(--color-da-success)",
  degraded: "var(--color-da-warn)",
  critical: "var(--color-da-danger)",
  offline: "var(--color-da-offline)",
};
const INERT = "var(--color-da-lattice-unused)";

/**
 * Face identity and element tallies, shown under the tile in either renderer.
 *
 * Lives apart from both so the 3D canvas does not have to reproduce the
 * flat view's chrome, and so the two can never label the same tile
 * differently. Counts come from `buildFaceLattice`, the same source that
 * places the cells.
 *
 * States at zero are dropped rather than printed as "0": a row of zeroes is
 * noise, and their absence carries the same information.
 */
export function TileFooter({ faceNum }: { faceNum: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const face = FACE_MAP[faceNum];
  const ft = telemetry.faces[faceNum];

  const lattice = useMemo(() => (face && ft ? buildFaceLattice(face, ft) : null), [face, ft]);
  if (!face || !ft || !lattice) return null;

  const { counts, inert } = lattice;

  return (
    <div className="flex shrink-0 flex-col gap-[0.3125rem]">
      <div className="flex items-baseline justify-between gap-[0.5rem]">
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

      <div className="flex flex-wrap items-center justify-center gap-x-[0.75rem] gap-y-[0.25rem]">
        {(Object.keys(counts) as HealthId[])
          .filter((h) => counts[h] > 0)
          .map((h) => (
            <span key={h} className="flex items-center gap-[0.3125rem]">
              <span className="size-[0.4375rem] shrink-0 rounded-[0.125rem]" style={{ backgroundColor: SWATCH[h] }} />
              <span className="da-nums text-3xs font-bold text-da-text">{counts[h]}</span>
              <span className="text-3xs font-medium text-da-muted">{HEALTH_META[h].label}</span>
            </span>
          ))}
        {inert > 0 && (
          <span
            className="flex items-center gap-[0.3125rem]"
            title="Lattice sites with no radiating element — the square panel around a hexagonal aperture, not a fault"
          >
            <span className="size-[0.4375rem] shrink-0 rounded-[0.125rem]" style={{ backgroundColor: INERT }} />
            <span className="da-nums text-3xs font-bold text-da-text">{inert}</span>
            <span className="text-3xs font-medium text-da-muted">Not radiating</span>
          </span>
        )}
      </div>
    </div>
  );
}
