/**
 * Dome geometry — REAL data, reconstructed from Must_cord.xlsx.
 *
 * Every position here traces back to the workbook. The heavy lifting (analytic
 * solid, global registration, per-face clocking) happens offline and lands in
 * `generated/domeGeometry.generated.ts`; this module is the runtime surface.
 *
 * Two invariants are worth stating because the previous implementation broke
 * both, and the tests in `lib/__tests__/geometry.test.ts` now guard them:
 *
 *   1. Face polygons are built from SHARED vertex indices, so adjacent faces
 *      share edges exactly — the gap is 0 by construction, not by tolerance.
 *   2. The in-plane frame is anchored to the face's own first polygon vertex,
 *      not to an arbitrary world axis. Deriving it from a reference vector
 *      spins each patch to a random angle within its plane.
 */

import {
  FACES,
  VERTICES,
  HEX_TEMPLATE,
  PENT_TEMPLATE,
  DOME_CIRCUMRADIUS,
  EDGE_LENGTH,
  ELEMENT_PITCH,
  type GeneratedFace,
} from "./generated/domeGeometry.generated";
import { vec3Normalize, vec3Cross, vec3Sub, type Vec3 } from "../lib/truncatedIcosahedron";
import type { Face } from "../types";

export { DOME_CIRCUMRADIUS, EDGE_LENGTH, ELEMENT_PITCH };

/* ---------- faces ---------- */

/** All 32 faces of the truncated icosahedron. */
export const ALL_FACES: Face[] = FACES.map((f) => ({
  fceNum: f.fceNum,
  kind: f.kind,
  elementCount: f.elementCount,
  normal: f.normal as [number, number, number],
  centroid: f.centre as [number, number, number],
  planeDistance: f.planeDistance,
  polygon: f.vertexIndices.map((i) => VERTICES[i] as [number, number, number]),
  present: f.present,
  azimuthDeg: f.azimuthDeg,
  elevationDeg: f.elevationDeg,
}));

/** The 26 faces carried by the workbook. The other 6 are the foot opening. */
export const PRESENT_FACES: Face[] = ALL_FACES.filter((f) => f.present);

/** Lookup by FceNum. */
export const FACE_MAP: Record<number, Face> = Object.fromEntries(
  ALL_FACES.map((f) => [f.fceNum, f]),
);

const GENERATED_BY_FCE: Record<number, GeneratedFace> = Object.fromEntries(
  FACES.map((f) => [f.fceNum, f]),
);

/* ---------- adjacency ---------- */

/**
 * Two faces are adjacent when they share an edge — which, given shared vertex
 * indices, means sharing exactly two vertices. No angle threshold needed.
 */
export const ADJACENCY: Map<number, number[]> = (() => {
  const map = new Map<number, number[]>();
  for (const a of FACES) {
    const neighbours: number[] = [];
    for (const b of FACES) {
      if (b.fceNum === a.fceNum) continue;
      let shared = 0;
      for (const v of a.vertexIndices) if (b.vertexIndices.includes(v)) shared++;
      if (shared === 2) neighbours.push(b.fceNum);
    }
    map.set(a.fceNum, neighbours.sort((x, y) => x - y));
  }
  return map;
})();

/* ---------- element positions ---------- */

/** The face's own in-plane frame: e1 points at its first polygon vertex. */
export function faceBasis(face: GeneratedFace): { e1: Vec3; e2: Vec3 } {
  const centre = face.centre;
  const v0 = VERTICES[face.vertexIndices[0]];
  const e1 = vec3Normalize(vec3Sub(v0 as Vec3, centre as Vec3));
  const e2 = vec3Cross(face.normal as Vec3, e1);
  return { e1, e2 };
}

/** Get the canonical (u, v) lattice template for a face kind. */
export function getTemplate(kind: "pentagon" | "hexagon"): readonly (readonly [number, number])[] {
  return kind === "pentagon" ? PENT_TEMPLATE : HEX_TEMPLATE;
}

/**
 * Place one template position onto a face, applying that face's measured
 * clocking and handedness.
 */
export function templateToWorld(uv: readonly [number, number], face: Face): Vec3 {
  const gen = GENERATED_BY_FCE[face.fceNum];
  const { e1, e2 } = faceBasis(gen);
  const cos = Math.cos(gen.thetaRad);
  const sin = Math.sin(gen.thetaRad);
  const a = uv[0];
  const b = uv[1] * gen.mirror;
  const u = a * cos - b * sin;
  const v = a * sin + b * cos;
  const c = gen.centre;
  return [
    c[0] + u * e1[0] + v * e2[0],
    c[1] + u * e1[1] + v * e2[1],
    c[2] + u * e1[2] + v * e2[2],
  ];
}

/** All element positions for a face, in dome-local metres. */
export function getFaceElements(face: Face): Vec3[] {
  const gen = GENERATED_BY_FCE[face.fceNum];
  if (!gen.present) return [];
  const { e1, e2 } = faceBasis(gen);
  const cos = Math.cos(gen.thetaRad);
  const sin = Math.sin(gen.thetaRad);
  const c = gen.centre;
  const template = getTemplate(gen.kind);

  const out: Vec3[] = new Array(template.length);
  for (let i = 0; i < template.length; i++) {
    const a = template[i][0];
    const b = template[i][1] * gen.mirror;
    const u = a * cos - b * sin;
    const v = a * sin + b * cos;
    out[i] = [
      c[0] + u * e1[0] + v * e2[0],
      c[1] + u * e1[1] + v * e2[1],
      c[2] + u * e1[2] + v * e2[2],
    ];
  }
  return out;
}

/** Every element on the dome, tagged with the face it belongs to. */
export function getAllElements(): { fceNum: number; position: Vec3 }[] {
  const out: { fceNum: number; position: Vec3 }[] = [];
  for (const face of PRESENT_FACES) {
    for (const position of getFaceElements(face)) {
      out.push({ fceNum: face.fceNum, position });
    }
  }
  return out;
}

/** Total elements carried by the workbook. */
export const TOTAL_ELEMENTS = PRESENT_FACES.reduce((n, f) => n + f.elementCount, 0);
