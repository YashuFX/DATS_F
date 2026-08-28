/**
 * Geometry validation against Must_cord.xlsx.
 *
 * These tests are the contract for the dome reconstruction. They exist because
 * an earlier implementation produced a dome that looked plausible but had
 * elements up to 0.167 m out of position (1.7x the element pitch) and no two
 * panels sharing an edge. Eyeballing a render does not catch that; this does.
 *
 * Run with:  npm run test:geometry
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { readWorkbook } from "./readWorkbook";
import {
  ALL_FACES,
  PRESENT_FACES,
  FACE_MAP,
  ADJACENCY,
  getFaceElements,
  TOTAL_ELEMENTS,
  DOME_CIRCUMRADIUS,
  EDGE_LENGTH,
} from "../../data/geometry";
import { FACES, VERTICES } from "../../data/generated/domeGeometry.generated";

/* ---------- tolerances ---------- */

/** Element positions reconstruct to ~1.3e-9 m; 1e-6 leaves headroom without hiding drift. */
const ELEMENT_TOL_M = 1e-6;
/** Normals register to ~1.2e-6 deg. */
const NORMAL_TOL_DEG = 1e-3;
/** Shared vertices are the same array entry, so any gap at all is a regression. */
const EDGE_TOL_M = 1e-12;

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKBOOK = join(HERE, "..", "..", "data", "Must_cord.xlsx");

/* ---------- helpers ---------- */

type V3 = readonly [number, number, number] | number[];

const dist = (a: V3, b: V3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function planeFitNormal(points: { x: number; y: number; z: number }[]) {
  const n = points.length;
  const c = [
    points.reduce((s, p) => s + p.x, 0) / n,
    points.reduce((s, p) => s + p.y, 0) / n,
    points.reduce((s, p) => s + p.z, 0) / n,
  ];
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = [p.x - c[0], p.y - c[1], p.z - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] += d[i] * d[j];
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] /= n;

  // Jacobi rotation; the smallest eigenvector is the plane normal.
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const A = M.map((r) => r.slice());
  for (let iter = 0; iter < 100; iter++) {
    let p = 0,
      q = 1,
      mx = 0;
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        if (Math.abs(A[i][j]) > mx) {
          mx = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
    if (mx < 1e-18) break;
    const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
    const cs = Math.cos(th),
      sn = Math.sin(th);
    for (let k = 0; k < 3; k++) {
      const akp = cs * A[k][p] - sn * A[k][q];
      const akq = sn * A[k][p] + cs * A[k][q];
      A[k][p] = akp;
      A[k][q] = akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = cs * A[p][k] - sn * A[q][k];
      const aqk = sn * A[p][k] + cs * A[q][k];
      A[p][k] = apk;
      A[q][k] = aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = cs * V[k][p] - sn * V[k][q];
      const vkq = sn * V[k][p] + cs * V[k][q];
      V[k][p] = vkp;
      V[k][q] = vkq;
    }
  }
  let smallest = 0;
  for (let i = 1; i < 3; i++) if (A[i][i] < A[smallest][smallest]) smallest = i;
  let nrm = [V[0][smallest], V[1][smallest], V[2][smallest]];
  const len = Math.hypot(...nrm);
  nrm = nrm.map((v) => v / len);
  if (nrm[0] * c[0] + nrm[1] * c[1] + nrm[2] * c[2] < 0) nrm = nrm.map((v) => -v);
  return nrm;
}

/* ---------- fixtures ---------- */

const rows = readWorkbook(WORKBOOK);
const byFace = new Map<number, { x: number; y: number; z: number }[]>();
for (const r of rows) {
  if (!byFace.has(r.fceNum)) byFace.set(r.fceNum, []);
  byFace.get(r.fceNum)!.push(r);
}

/* ---------- tests ---------- */

describe("workbook", () => {
  test("parses to 7557 elements over 26 faces", () => {
    assert.equal(rows.length, 7557, "element count changed — check the header-row skip");
    assert.equal(byFace.size, 26);
  });

  test("every face carries 177 or 374 elements", () => {
    for (const [fce, pts] of byFace) {
      assert.ok(
        pts.length === 177 || pts.length === 374,
        `face ${fce} has ${pts.length} elements`,
      );
    }
  });
});

describe("solid", () => {
  test("32 faces: 12 pentagons, 20 hexagons, 26 present", () => {
    assert.equal(ALL_FACES.length, 32);
    assert.equal(ALL_FACES.filter((f) => f.kind === "pentagon").length, 12);
    assert.equal(ALL_FACES.filter((f) => f.kind === "hexagon").length, 20);
    assert.equal(PRESENT_FACES.length, 26);
    assert.equal(TOTAL_ELEMENTS, 7557);
  });

  test("all 60 vertices lie on the circumsphere", () => {
    assert.equal(VERTICES.length, 60);
    for (const v of VERTICES) {
      assert.ok(
        Math.abs(Math.hypot(v[0], v[1], v[2]) - DOME_CIRCUMRADIUS) < 1e-9,
        `vertex off the circumsphere: ${Math.hypot(v[0], v[1], v[2])}`,
      );
    }
  });

  test("all polygon edges are the same length", () => {
    for (const f of ALL_FACES) {
      for (let i = 0; i < f.polygon.length; i++) {
        const a = f.polygon[i];
        const b = f.polygon[(i + 1) % f.polygon.length];
        assert.ok(
          Math.abs(dist(a, b) - EDGE_LENGTH) < 1e-9,
          `face ${f.fceNum} edge ${i} is ${dist(a, b)}, expected ${EDGE_LENGTH}`,
        );
      }
    }
  });
});

describe("face normals match the workbook", () => {
  test(`every present face is within ${NORMAL_TOL_DEG} deg of its plane fit`, () => {
    let worst = 0;
    for (const [fce, pts] of byFace) {
      const measured = planeFitNormal(pts);
      const face = FACE_MAP[fce];
      assert.ok(face, `no reconstructed face for FceNum ${fce}`);
      const d = Math.min(
        1,
        Math.abs(
          measured[0] * face.normal[0] +
            measured[1] * face.normal[1] +
            measured[2] * face.normal[2],
        ),
      );
      const deg = (Math.acos(d) * 180) / Math.PI;
      worst = Math.max(worst, deg);
      assert.ok(deg < NORMAL_TOL_DEG, `face ${fce} normal off by ${deg} deg`);
    }
    assert.ok(worst < NORMAL_TOL_DEG);
  });
});

describe("adjacent faces share edges", () => {
  test("neighbouring polygons meet exactly", () => {
    let checked = 0;
    let worstGap = 0;
    for (const a of FACES) {
      for (const b of FACES) {
        if (b.fceNum <= a.fceNum) continue;
        const shared = a.vertexIndices.filter((v) => b.vertexIndices.includes(v));
        if (shared.length !== 2) continue;
        checked++;
        // Shared vertices must be positionally identical, not merely close.
        for (const v of shared) {
          const pa = FACE_MAP[a.fceNum].polygon[a.vertexIndices.indexOf(v)];
          const pb = FACE_MAP[b.fceNum].polygon[b.vertexIndices.indexOf(v)];
          const gap = dist(pa, pb);
          worstGap = Math.max(worstGap, gap);
          assert.ok(gap <= EDGE_TOL_M, `faces ${a.fceNum}/${b.fceNum} gap ${gap} m`);
        }
      }
    }
    assert.equal(checked, 90, "a truncated icosahedron has 90 edges");
    assert.ok(worstGap <= EDGE_TOL_M);
  });

  test("every face has the right number of neighbours", () => {
    for (const f of FACES) {
      const expected = f.kind === "pentagon" ? 5 : 6;
      assert.equal(
        ADJACENCY.get(f.fceNum)!.length,
        expected,
        `face ${f.fceNum} (${f.kind}) has ${ADJACENCY.get(f.fceNum)!.length} neighbours`,
      );
    }
  });
});

describe("element positions match the workbook", () => {
  test(`all 7557 reconstruct within ${ELEMENT_TOL_M} m`, () => {
    let worst = 0;
    let sumSq = 0;
    let count = 0;

    for (const face of PRESENT_FACES) {
      const real = byFace.get(face.fceNum)!;
      const generated = getFaceElements(face);
      assert.equal(
        generated.length,
        real.length,
        `face ${face.fceNum}: generated ${generated.length}, workbook ${real.length}`,
      );

      // Require a bijection: each generated point claims a distinct real point.
      const taken = new Set<number>();
      for (const g of generated) {
        let bestI = -1;
        let bestD = Infinity;
        for (let i = 0; i < real.length; i++) {
          if (taken.has(i)) continue;
          const d = Math.hypot(g[0] - real[i].x, g[1] - real[i].y, g[2] - real[i].z);
          if (d < bestD) {
            bestD = d;
            bestI = i;
          }
        }
        taken.add(bestI);
        worst = Math.max(worst, bestD);
        sumSq += bestD * bestD;
        count++;
        assert.ok(
          bestD < ELEMENT_TOL_M,
          `face ${face.fceNum}: element off by ${bestD} m`,
        );
      }
      assert.equal(taken.size, real.length, `face ${face.fceNum}: not a bijection`);
    }

    assert.equal(count, 7557);
    const rms = Math.sqrt(sumSq / count);
    console.log(`      max ${worst.toExponential(3)} m · RMS ${rms.toExponential(3)} m`);
  });

  test("absent foot faces yield no elements", () => {
    for (const f of ALL_FACES.filter((x) => !x.present)) {
      assert.equal(getFaceElements(f).length, 0);
    }
  });
});
