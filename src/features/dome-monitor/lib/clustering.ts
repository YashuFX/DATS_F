/**
 * Connected-component labelling over failed elements, using the lattice
 * adjacency of the element's own measured (u, v) position — not row/col
 * indices we don't have, and not "consecutive array index", which is what
 * the mock previously used as a stand-in and which only happens to look
 * right because the mock also builds its fault cluster as a contiguous index
 * run. Real telemetry won't be that convenient.
 *
 * This is the basis for the headline KPI (PHASEPLAN §2): clustered failures
 * are ~15–26 dB worse than scattered ones at equal element count, so
 * "largest contiguous cluster" — not raw failure count — is what the
 * operator needs surfaced.
 */

import { getTemplate } from "../data/geometry";
import type { FaceKind, HealthId } from "../types";

/** Adjacency list, memoized per face kind (only two distinct templates exist). */
const adjacencyCache = new Map<FaceKind, number[][]>();

/**
 * Build adjacency by connecting each element to any other within ~1.2× its
 * own nearest-neighbour distance. That factor is derived from the template
 * itself (not a hardcoded pitch), so it adapts to the hexagon's uniform
 * triangular lattice and the pentagon's anisotropic one (0.0866 m in-row,
 * 0.100 m row spacing) without assuming either.
 */
function buildAdjacency(kind: FaceKind): number[][] {
  const cached = adjacencyCache.get(kind);
  if (cached) return cached;

  const template = getTemplate(kind);
  const n = template.length;
  const nearest = new Array(n).fill(Infinity);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = template[i][0] - template[j][0];
      const dy = template[i][1] - template[j][1];
      const d = Math.hypot(dx, dy);
      if (d < nearest[i]) nearest[i] = d;
      if (d < nearest[j]) nearest[j] = d;
    }
  }

  const threshold = Math.max(...nearest) * 1.2;
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = template[i][0] - template[j][0];
      const dy = template[i][1] - template[j][1];
      if (Math.hypot(dx, dy) <= threshold) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }

  adjacencyCache.set(kind, adjacency);
  return adjacency;
}

/** Size of every connected component of non-nominal elements, largest first. */
export function connectedComponentSizes(
  healths: HealthId[],
  kind: FaceKind,
): number[] {
  const adjacency = buildAdjacency(kind);
  const n = healths.length;
  const visited = new Array(n).fill(false);
  const sizes: number[] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i] || healths[i] === "nominal") continue;
    let size = 0;
    const stack = [i];
    visited[i] = true;
    while (stack.length > 0) {
      const cur = stack.pop()!;
      size++;
      for (const nb of adjacency[cur] ?? []) {
        if (!visited[nb] && healths[nb] !== "nominal") {
          visited[nb] = true;
          stack.push(nb);
        }
      }
    }
    sizes.push(size);
  }

  return sizes.sort((a, b) => b - a);
}

/** The single number the headline KPI needs: the worst contiguous cluster. */
export function worstClusterSize(healths: HealthId[], kind: FaceKind): number {
  const sizes = connectedComponentSizes(healths, kind);
  return sizes[0] ?? 0;
}
