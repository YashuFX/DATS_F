/**
 * The POC tile's geometry, computed once and shared by both renderers.
 *
 * The 2D SVG fallback and the 3D tile must draw the SAME tile — same sites,
 * same pitch, same square carrier — or "switch to 3D" would silently become
 * "switch to a different picture". Keeping the derivation here rather than in
 * either component is what makes that guaranteed instead of maintained.
 *
 * Pure: template + telemetry in, sites out. No React, no store, no three.js.
 */

import { getTemplate } from "@/features/dome-monitor/data/geometry";
import type { Face, FaceTelemetry, HealthId } from "@/features/dome-monitor/types";

export interface LatticeSite {
  /** Face-local lattice coordinates, in metres. */
  u: number;
  v: number;
  /** null = a lattice site carrying no radiating element. */
  health: HealthId | null;
}

export interface FaceLattice {
  sites: LatticeSite[];
  /** Nearest-neighbour spacing, metres. */
  pitch: number;
  /** Circumradius of a site's Voronoi hexagon, metres, backed off for a gap. */
  cellRadius: number;
  /** Extent of the generated lattice, metres. */
  width: number;
  height: number;
  /** Whether the face snapped onto a triangular lattice — see below. */
  isLattice: boolean;
  counts: Record<HealthId, number>;
  /** Sites with no radiating element. */
  inert: number;
}

/**
 * Build one face's lattice, squared off with inert sites.
 *
 * A hexagon face's 374 elements sit on a triangular lattice — 0.1 m pitch,
 * rows offset half a pitch and spaced pitch·√3/2 — and snap onto integer
 * (row, col) with ZERO error. That exactness is what licenses generating the
 * surrounding inert sites: they are real lattice positions the aperture simply
 * does not occupy, not invented geometry.
 *
 * A pentagon's 177 elements do NOT lie on that lattice (they miss by half a
 * cell and collide when snapped), so the fit is verified rather than assumed.
 * Those faces return their elements alone: squaring them off would mean
 * drawing lattice sites the data does not support.
 */
export function buildFaceLattice(face: Face, ft: FaceTelemetry): FaceLattice {
  const template = getTemplate(face.kind);

  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [u, v] of template) {
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  // Pitch measured, not assumed: the two templates are spaced differently.
  let pitch = Infinity;
  for (let i = 0; i < Math.min(template.length, 150); i++) {
    for (let j = i + 1; j < template.length; j++) {
      const d = Math.hypot(template[i][0] - template[j][0], template[i][1] - template[j][1]);
      if (d > 1e-9 && d < pitch) pitch = d;
    }
  }
  if (!Number.isFinite(pitch)) pitch = (maxU - minU) / 20;
  const rowPitch = (pitch * Math.sqrt(3)) / 2;

  const key = (r: number, c: number) => `${r},${c}`;
  const occupied = new Map<string, HealthId>();
  let snapError = 0;
  for (let i = 0; i < template.length; i++) {
    const [u, v] = template[i];
    const rf = (maxV - v) / rowPitch;
    const r = Math.round(rf);
    const off = r % 2 ? pitch / 2 : 0;
    const cf = (u - minU - off) / pitch;
    const c = Math.round(cf);
    snapError = Math.max(snapError, Math.abs(rf - r), Math.abs(cf - c));
    occupied.set(key(r, c), ft.elements[i]?.health ?? "offline");
  }
  const isLattice = snapError < 0.05 && occupied.size === template.length;

  const sites: LatticeSite[] = [];
  if (isLattice) {
    // Square carrier, minimal: enough inert sites to square the panel off, and
    // not one ring more — every extra is dead space to look past.
    const side = Math.max(maxU - minU, maxV - minV);
    const padU = (side - (maxU - minU)) / 2;
    const padV = (side - (maxV - minV)) / 2;
    const c0 = Math.floor(-padU / pitch);
    const c1 = Math.ceil((maxU - minU + padU) / pitch);
    const r0 = Math.floor(-padV / rowPitch);
    const r1 = Math.ceil((maxV - minV + padV) / rowPitch);

    for (let r = r0; r <= r1; r++) {
      const off = ((r % 2) + 2) % 2 ? pitch / 2 : 0;
      for (let c = c0; c <= c1; c++) {
        sites.push({
          u: minU + off + c * pitch,
          v: maxV - r * rowPitch,
          health: occupied.get(key(r, c)) ?? null,
        });
      }
    }
  } else {
    for (let i = 0; i < template.length; i++) {
      sites.push({
        u: template[i][0],
        v: template[i][1],
        health: ft.elements[i]?.health ?? "offline",
      });
    }
  }

  // Re-centre on the generated extent so both renderers get an origin-centred
  // tile — the 3D camera orbits about it and the 2D viewBox is framed on it.
  let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
  for (const s of sites) {
    if (s.u < lo) lo = s.u;
    if (s.u > hi) hi = s.u;
    if (s.v < lo2) lo2 = s.v;
    if (s.v > hi2) hi2 = s.v;
  }
  const cu = (lo + hi) / 2;
  const cv = (lo2 + hi2) / 2;
  for (const s of sites) {
    s.u -= cu;
    s.v -= cv;
  }

  const counts: Record<HealthId, number> = { nominal: 0, degraded: 0, critical: 0, offline: 0 };
  let inert = 0;
  for (const s of sites) {
    if (s.health) counts[s.health]++;
    else inert++;
  }

  return {
    sites,
    pitch,
    // Circumradius of the Voronoi hexagon is pitch/√3; back off for the gap.
    cellRadius: (pitch / Math.sqrt(3)) * 0.92,
    width: hi - lo,
    height: hi2 - lo2,
    isLattice,
    counts,
    inert,
  };
}
