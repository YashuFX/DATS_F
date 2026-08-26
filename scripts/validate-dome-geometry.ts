/**
 * Geometry validation report.
 *
 * Reads Must_cord.xlsx and the runtime reconstruction, and prints the
 * accuracy figures. Same checks the test suite asserts on, reported as numbers.
 *
 *   npm run validate:geometry
 */
import { readWorkbook } from "../src/features/dome-monitor/lib/__tests__/readWorkbook";
import {
  ALL_FACES, PRESENT_FACES, FACE_MAP, ADJACENCY,
  getFaceElements, TOTAL_ELEMENTS, DOME_CIRCUMRADIUS, EDGE_LENGTH,
} from "../src/features/dome-monitor/data/geometry";
import { FACES, VERTICES } from "../src/features/dome-monitor/data/generated/domeGeometry.generated";

const rows = readWorkbook("src/features/dome-monitor/data/Must_cord.xlsx");
const byFace = new Map<number, { x: number; y: number; z: number }[]>();
for (const r of rows) {
  if (!byFace.has(r.fceNum)) byFace.set(r.fceNum, []);
  byFace.get(r.fceNum)!.push(r);
}

let maxErr = 0, sumSq = 0, sumAbs = 0, count = 0, matched = 0;
const perFace: [number, number][] = [];
for (const face of PRESENT_FACES) {
  const real = byFace.get(face.fceNum);
  if (!real) continue;
  matched++;
  const gen = getFaceElements(face);
  const taken = new Set<number>();
  let faceWorst = 0;
  for (const g of gen) {
    let bi = -1, bd = Infinity;
    for (let i = 0; i < real.length; i++) {
      if (taken.has(i)) continue;
      const d = Math.hypot(g[0] - real[i].x, g[1] - real[i].y, g[2] - real[i].z);
      if (d < bd) { bd = d; bi = i; }
    }
    taken.add(bi);
    faceWorst = Math.max(faceWorst, bd);
    maxErr = Math.max(maxErr, bd); sumSq += bd * bd; sumAbs += bd; count++;
  }
  perFace.push([face.fceNum, faceWorst]);
}

function planeFitNormal(pts: { x: number; y: number; z: number }[]) {
  const n = pts.length;
  const c = [pts.reduce((s,p)=>s+p.x,0)/n, pts.reduce((s,p)=>s+p.y,0)/n, pts.reduce((s,p)=>s+p.z,0)/n];
  const A = [[0,0,0],[0,0,0],[0,0,0]];
  for (const p of pts) { const d=[p.x-c[0],p.y-c[1],p.z-c[2]];
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) A[i][j]+=d[i]*d[j]; }
  const V = [[1,0,0],[0,1,0],[0,0,1]];
  for (let it=0; it<100; it++) {
    let p=0,q=1,mx=0;
    for (let i=0;i<3;i++) for (let j=i+1;j<3;j++) if (Math.abs(A[i][j])>mx){mx=Math.abs(A[i][j]);p=i;q=j;}
    if (mx<1e-18) break;
    const th=0.5*Math.atan2(2*A[p][q], A[q][q]-A[p][p]), cs=Math.cos(th), sn=Math.sin(th);
    for (let k=0;k<3;k++){const a=cs*A[k][p]-sn*A[k][q],b=sn*A[k][p]+cs*A[k][q];A[k][p]=a;A[k][q]=b;}
    for (let k=0;k<3;k++){const a=cs*A[p][k]-sn*A[q][k],b=sn*A[p][k]+cs*A[q][k];A[p][k]=a;A[q][k]=b;}
    for (let k=0;k<3;k++){const a=cs*V[k][p]-sn*V[k][q],b=sn*V[k][p]+cs*V[k][q];V[k][p]=a;V[k][q]=b;}
  }
  let s0=0; for (let i=1;i<3;i++) if (A[i][i]<A[s0][s0]) s0=i;
  let nr=[V[0][s0],V[1][s0],V[2][s0]]; const L2=Math.hypot(...nr); nr=nr.map(v=>v/L2);
  if (nr[0]*c[0]+nr[1]*c[1]+nr[2]*c[2] < 0) nr = nr.map(v=>-v);
  return nr;
}
let nrmMax = 0, nrmSum = 0;
for (const [fce, pts] of byFace) {
  const m = planeFitNormal(pts), f = FACE_MAP[fce];
  const d = Math.min(1, Math.abs(m[0]*f.normal[0] + m[1]*f.normal[1] + m[2]*f.normal[2]));
  const deg = Math.acos(d) * 180 / Math.PI;
  nrmMax = Math.max(nrmMax, deg); nrmSum += deg;
}

let edgeGap = 0, edges = 0;
for (const a of FACES) for (const b of FACES) {
  if (b.fceNum <= a.fceNum) continue;
  const shared = a.vertexIndices.filter((v) => b.vertexIndices.includes(v));
  if (shared.length !== 2) continue;
  edges++;
  for (const v of shared) {
    const pa = FACE_MAP[a.fceNum].polygon[a.vertexIndices.indexOf(v)];
    const pb = FACE_MAP[b.fceNum].polygon[b.vertexIndices.indexOf(v)];
    edgeGap = Math.max(edgeGap, Math.hypot(pa[0]-pb[0], pa[1]-pb[1], pa[2]-pb[2]));
  }
}

let radMin = Infinity, radMax = -Infinity;
for (const v of VERTICES) {
  const r = Math.hypot(v[0], v[1], v[2]);
  radMin = Math.min(radMin, r); radMax = Math.max(radMax, r);
}

const e = (x: number) => x.toExponential(3);
const L = (k: string, v: string) => console.log("  " + k.padEnd(28) + v);
console.log("=".repeat(64));
console.log("  DOME GEOMETRY VALIDATION — Must_cord.xlsx");
console.log("=".repeat(64));
L("total faces", `${ALL_FACES.length} (${PRESENT_FACES.length} present + ${ALL_FACES.length - PRESENT_FACES.length} foot opening)`);
L("  pentagons / hexagons", `${ALL_FACES.filter(f=>f.kind==="pentagon").length} / ${ALL_FACES.filter(f=>f.kind==="hexagon").length}`);
L("correctly matched faces", `${matched} / ${byFace.size}`);
L("total elements", `${count} (workbook: ${rows.length}, model: ${TOTAL_ELEMENTS})`);
console.log("-".repeat(64));
L("max XYZ error", `${e(maxErr)} m`);
L("RMS XYZ error", `${e(Math.sqrt(sumSq / count))} m`);
L("mean XYZ error", `${e(sumAbs / count)} m`);
L("face-normal error (max)", `${e(nrmMax)} deg`);
L("face-normal error (mean)", `${e(nrmSum / byFace.size)} deg`);
L("edge-gap error", `${e(edgeGap)} m  (${edges} shared edges)`);
console.log("-".repeat(64));
L("circumradius", `${DOME_CIRCUMRADIUS} m`);
L("vertex radius spread", `${e(radMax - radMin)} m`);
L("edge length", `${EDGE_LENGTH.toFixed(9)} m`);
L("adjacency degrees", [...ADJACENCY.values()].every((n, i) =>
    n.length === (FACES[i].kind === "pentagon" ? 5 : 6)) ? "all correct (5 pent / 6 hex)" : "MISMATCH");
console.log("=".repeat(64));
perFace.sort((a, b) => b[1] - a[1]);
console.log("  worst faces: " + perFace.slice(0, 5).map(([f, d]) => `F${f} ${e(d)}`).join("  "));
console.log("=".repeat(64));
