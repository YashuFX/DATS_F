/**
 * Face adjacency for keyboard navigation and cluster analysis.
 *
 * Derived in `data/geometry.ts` from shared vertex indices: two faces are
 * adjacent when they share exactly two of the 60 vertices, i.e. an edge.
 * The old angle-threshold version is gone — it depended on the face normals
 * being accurate enough for a 42.5° cut to separate neighbours from
 * next-neighbours, which is fragile.
 */

export { ADJACENCY } from "../data/geometry";
