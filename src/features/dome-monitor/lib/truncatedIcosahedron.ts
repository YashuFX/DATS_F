/**
 * Small vector helpers and polygon utilities for the dome.
 *
 * The solid itself is no longer built here. It used to be: faces were derived
 * from guessed normal directions and each was given an in-plane frame from an
 * arbitrary world axis, which left adjacent panels unable to meet and put
 * elements up to 0.167 m out of position. The solid is now built offline from
 * the vertex edge graph and registered against Must_cord.xlsx — see
 * `data/generated/domeGeometry.generated.ts` and the tests in `__tests__/`.
 */

export type Vec3 = [number, number, number];

/* ---------- vector maths ---------- */

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const l = vec3Length(v);
  return l === 0 ? [0, 0, 0] : [v[0] / l, v[1] / l, v[2] / l];
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/* ---------- polygons ---------- */

/**
 * Triangulate a convex polygon as a fan from vertex 0.
 * Returns flat indices: [0,1,2, 0,2,3, 0,3,4, ...]
 *
 * A pentagon becomes 3 triangles and a hexagon 4, so the whole 32-face shell
 * is 116 triangles.
 */
export function fanIndices(vertexCount: number): number[] {
  const indices: number[] = [];
  for (let i = 1; i < vertexCount - 1; i++) {
    indices.push(0, i, i + 1);
  }
  return indices;
}

/** Expand a convex polygon into fan triangle vertices. */
export function triangulateFace(polygon: Vec3[]): Vec3[] {
  const tris: Vec3[] = [];
  for (const i of fanIndices(polygon.length)) tris.push(polygon[i]);
  return tris;
}
