/**
 * Cluster-labelling tests (PHASEPLAN §6, §2).
 *
 * The mock telemetry used to approximate "worst cluster" by counting
 * consecutive failures in array index order — which only looked right
 * because the mock also happened to build its fault cluster as a contiguous
 * index run. These tests check the real thing: connected components over the
 * element's own measured lattice position, which is what makes "clustered
 * failures are ~15-26 dB worse than scattered ones" (PHASEPLAN §2) an
 * operationally meaningful KPI instead of an artefact of array order.
 *
 * Run with:  npm run test:geometry
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { connectedComponentSizes, worstClusterSize } from "../clustering";
import { getTemplate } from "../../data/geometry";
import type { HealthId } from "../../types";

function healthArray(count: number, faultyIndices: number[]): HealthId[] {
  const healths: HealthId[] = new Array(count).fill("nominal");
  for (const i of faultyIndices) healths[i] = "critical";
  return healths;
}

describe("connected-component clustering", () => {
  test("an all-nominal face has no cluster", () => {
    const healths = healthArray(374, []);
    assert.equal(worstClusterSize(healths, "hexagon"), 0);
  });

  test("a single isolated failure is a cluster of one", () => {
    const healths = healthArray(374, [200]);
    assert.equal(worstClusterSize(healths, "hexagon"), 1);
  });

  test("two geometrically distant failures stay two separate singletons", () => {
    // Template index 0 and the last index are on opposite sides of the face —
    // far past the adjacency threshold, so they must not merge.
    const template = getTemplate("hexagon");
    const last = template.length - 1;
    const healths = healthArray(template.length, [0, last]);
    const sizes = connectedComponentSizes(healths, "hexagon");
    assert.deepEqual(sizes, [1, 1]);
  });

  test("two real lattice neighbours form a cluster of two, not two singletons", () => {
    // Verified adjacent by direct distance: HEX_TEMPLATE[0] and [11] are
    // exactly one 0.1 m lattice step apart.
    const template = getTemplate("hexagon");
    const [x0, y0] = template[0];
    const [x1, y1] = template[11];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    assert.ok(Math.abs(dist - 0.1) < 1e-6, "fixture assumption: indices 0 and 11 are one pitch apart");

    const healths = healthArray(template.length, [0, 11]);
    assert.deepEqual(connectedComponentSizes(healths, "hexagon"), [2]);
  });

  test("a fully-faulted face collapses to one component spanning every element", () => {
    // Sanity check that adjacency actually connects the whole lattice — a
    // broken/disconnected graph would instead report many small components.
    const template = getTemplate("hexagon");
    const healths = healthArray(template.length, template.map((_, i) => i));
    assert.equal(worstClusterSize(healths, "hexagon"), template.length);
  });

  test("pentagon lattice (anisotropic pitch) also clusters contiguous faults", () => {
    // The pentagon lattice isn't laid out in simple row order in the
    // template, so find index 0's actual nearest neighbour by distance
    // rather than assuming a pair — PHASEPLAN §2 documents its pitch as
    // anisotropic (0.0866 m in-row, 0.100 m row spacing).
    const template = getTemplate("pentagon");
    const [x0, y0] = template[0];
    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let i = 1; i < template.length; i++) {
      const d = Math.hypot(template[i][0] - x0, template[i][1] - y0);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    assert.ok(
      nearestDist > 0.05 && nearestDist < 0.15,
      `fixture assumption: nearest neighbour should be one lattice pitch away (got ${nearestDist})`,
    );

    const healths = healthArray(template.length, [0, nearestIdx]);
    assert.deepEqual(connectedComponentSizes(healths, "pentagon"), [2]);
  });
});
