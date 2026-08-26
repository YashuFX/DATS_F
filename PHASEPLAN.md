# Dome Array Dashboard — Phase Plan & Handoff

**Read this file completely before touching any code.** It is the single source of
truth for this feature: what the data proves, what is built, what is left, and
which traps have already cost time.

Feature lives in `src/features/dome-monitor/`. Route is `/dashboard`.

Last updated: 2026-08-26. Phase 1 complete and validated.

---

## 1. What we are building

An interactive 3D operational dashboard for a **geodesic phased-array antenna**.
The operator sees the real antenna geometry, clicks a panel, and reads that
panel's health and telemetry beside it.

The 3D model is a **true reconstruction of `Must_cord.xlsx`** — not an
approximation, not a decorative dome. This is the non-negotiable constraint of
the whole feature. Max positional error is currently 1.3 nanometres and there
are automated tests that fail if it regresses.

---

## 2. The antenna — verified facts

Everything in this section was computed from the workbook. Treat it as settled.

| Property | Value |
|---|---|
| Solid | Truncated icosahedron ("soccer ball") |
| Circumradius | **exactly 3.000000 m** (6 m diameter) |
| Edge length | 1.210644637 m |
| Faces total | 32 (12 pentagons + 20 hexagons) |
| Faces present in data | **26** (11 pentagons + 15 hexagons) |
| Faces absent | 6 — the **foot opening** (1 pentagon at nz −1.0, 5 hexagons at nz −0.7947) |
| Elements total | **7 557** |
| Elements per hexagon face | 374 |
| Elements per pentagon face | 177 |
| Element pitch (hexagon faces) | **0.1 m**, equilateral triangular lattice |
| Element pitch (pentagon faces) | in-row 0.0866 m, row spacing 0.100 m — a **different lattice** |
| Orientation | Icosahedral **vertex-at-pole**; face azimuths are exact multiples of 36°/72° |
| Coordinate frame | Local Cartesian, origin at dome centre |
| Vertical extent | Z −1.841 to +2.818 → spans ~130° of elevation, **not a hemisphere** |

### FceNum means "dome face index", nothing else

`FceNum` is the **geometric face index (1..32)** of the dome. It is **NOT** a Tile
ID and **NOT** an LRU ID. There is no tile, LRU, sub-array or health column
anywhere in the workbook.

Evidence: values span 1..32 = the face count of a truncated icosahedron; the 11
present pentagons + 15 present hexagons + 6 absent indices reconstruct the full
12+20 solid; and the 6 missing indices are precisely the bottom cap, matching the
sheet name `gdome_foot_top` ("dome, foot to top").

### Face rings (boresight elevation)

| Ring | Faces | Elements | Elevation | Present |
|---|---|---|---|---|
| Pentagon, apex | 1 | 177 | +90.00° | yes |
| Hexagon, upper | 5 | 1 870 | +52.63° | yes |
| Pentagon, upper | 5 | 885 | +26.56° | yes |
| Hexagon, upper mid | 5 | 1 870 | +10.81° | yes |
| Hexagon, lower mid | 5 | 1 870 | −10.81° | yes |
| Pentagon, lower | 5 | 885 | −26.56° | yes |
| Hexagon, bottom | 5 | 1 870 | −52.63° | **no — foot** |
| Pentagon, base | 1 | 177 | −90.00° | **no — foot** |

A complete solid would carry 9 604 elements.

### Two array-physics facts that drive the UI

1. **Only a fraction of the array serves any one beam.** At ±60° element scan
   limit, a single beam is served by **6–10 faces / 1 653–2 952 of the 7 557
   elements**. Whole-dome availability % uses the wrong denominator.

2. **Clustered failures are catastrophically worse than scattered ones.**
   Same element count, same gain loss, ~26 dB apart in pattern impact:

   | Failure | M | Clustered | Scattered | Δ |
   |---|---|---|---|---|
   | One hexagon face dead | 374 | −15.8 dBc | −41.5 dBc | 25.7 dB |
   | One pentagon face dead | 177 | −22.3 dBc | −44.8 dBc | 22.5 dB |
   | 10% of one hex face | 37 | −35.9 dBc | −51.6 dBc | 15.7 dB |

   **Therefore the headline KPI is worst-contiguous-cluster, not availability %.**
   Gain loss is negligible at realistic failure rates (1% failures ≈ 0.04 dB on
   receive) — leading with it would be reassuring while the array is unusable.
   This is also the engineering justification for building a spatial 3D view at
   all: clustering is what a spatial view shows well and a table of element IDs
   shows terribly.

---

## 3. BLOCKERS — what we still need from the client

### B1. Element → Tile → LRU map  🔴 blocks Phase 2 drill-down

A client dashboard mockup shows the array as a dome with **LRU-1 … LRU-16** and
**256 tiles**. But:

- 7 557 = 3 × 11 × 229 — **not divisible by 16, 64 or 256**
- hexagon face = 374 = 2 × 11 × 17 — not divisible either
- pentagon face = 177 = 3 × 59 — not divisible either
- the mockup contradicts itself: header says "64 × 64 = 4 096" while the panel
  says 256 tiles × (16×16 = 256) = 65 536, a factor of 16 apart

So the mockup's counts **cannot** be the real partition. We need, machine-readable:
**which elements belong to which tile, and which tiles to which LRU** — ideally a
CSV keyed to `(FceNum, u, v)`.

**Until it arrives:** hierarchy ships as `Array → Face → Element`. Build the LRU
and Tile breadcrumb levels but leave them dormant. **Do not invent a partition.**

### B2. Per-element telemetry contract  🔴 blocks Phase 4

Does it exist? Boolean alive/dead, or amplitude/phase/temperature/VSWR? Update
rate? Fault-code enum? Matters more than it looks — a stuck phase shifter causes
up to **6 dB more pattern error** than simply removing the element, so a boolean
model would materially understate impact.

### B3. Performance floor  🟠 blocks the readiness verdict

Required EIRP, G/T, and especially **peak sidelobe level**. Without the SLL spec
no failure threshold can be justified: the same 1% random failure rate is
irrelevant for a −25 dB design and fatal for a −45 dB one.

### B4. Confirmations (non-blocking but ask)

- Units are metres? (implies 6.000 m dome, 100 mm pitch)
- Operating frequency? (0.1 m is λ/2 at 1.5 GHz → L-band, unconfirmed)
- Is +Z true zenith and +X true north?
- Element scan limit, and is pointing direction telemetered?
- Is the pentagon panels' different lattice intentional?
- Confirm panels are the **26 geodesic faces**, not the lat/long quad tiles the
  mockup draws.
- Tx, Rx or both? (determines whether one or two gain figures are shown)
- Monitor-only, or does the dashboard command anything?

---

## 4. Tech stack — decided, do not relitigate

| Choice | Version | Why |
|---|---|---|
| three.js | **pinned 0.184.0** | `three-stdlib` (drei's dep) was last published 2025-11-10, before r184/r185. r185 purged deprecated code and stdlib's peer range is a permissive `>=0.128.0`, so npm will **not** warn if it breaks. |
| @react-three/fiber | ^9.x | Peer requires `react >=19 <19.3`. R3F v9 bundles its own reconciler. **Pin React exactly** — do not drift to 19.3. |
| @react-three/drei | ^10.x | OrbitControls, Html, PerformanceMonitor, AdaptiveDpr |
| Node test runner | built-in | `node:test` + `--experimental-strip-types`. No test dependency added. |

**Do NOT add:** `three-mesh-bvh` (largest single mesh is 4 triangles), `three-stdlib`
as a direct dep (drei owns it), postprocessing, Draco/Meshopt/KTX2 (geometry is
procedural — compression would make the bundle *larger*).

**Cesium is deliberately NOT used here.** Its value is ECEF double-precision,
planetary depth, terrain and 3D Tiles. This object spans 6 m in a local Cartesian
frame where float32 gives sub-micron precision. Cesium stays for the *globe* view
(satellite tracks, ground station); couple the two through the zustand store, not
the renderer.

### Rendering strategy

- **One `InstancedMesh` per face** (26), not one big 7 557-instance mesh.
  Reason: `InstancedMesh.raycast` is a brute-force loop over `this.count` doing a
  matrix inversion per instance. One big mesh = ~450 k inversions/sec at 60 Hz
  pointermove. Per-face = 26 sphere tests + 374 → **20× cheaper**, plus free
  per-face frustum culling and `mesh.visible` toggling.
- **One `<mesh>` per face shell.** Do not merge — total shell geometry is only
  **93 triangles** (11×3 + 15×4). Merging would cost free picking and per-face
  colour to save 25 draw calls out of a ~1 000 budget.
- Budget: ~55 draw calls, 15 k–91 k triangles, ~130 KB GPU memory.
- `frameloop="demand"` — zero frames when idle.
- **Semantic zoom, not geometric LOD.** At the distance where the dome fills the
  viewport, elements are already 15 px apart; you never zoom out far enough for
  geometric LOD to save real cost. Instead: beyond ~20 m hide elements and colour
  faces by aggregate. Add horizon culling (~26% of the sphere faces the camera).
- **Telemetry must never pass through React on its way to the GPU.** Vanilla
  zustand store outside React; mutate a `Uint8Array` in place, write
  `instanceColor`, call `invalidate()` once. Zero component re-renders.

---

## 5. File map

```
src/features/dome-monitor/
├── PHASEPLAN.md is at repo root, not here
├── data/
│   ├── Must_cord.xlsx                    ← the engineering input, checked in
│   ├── geometry.ts                       ← runtime API (STABLE, don't break)
│   ├── telemetry.mock.ts                 ← MOCK data, seeded PRNG
│   └── generated/
│       └── domeGeometry.generated.ts     ← GENERATED, do not hand-edit
├── lib/
│   ├── truncatedIcosahedron.ts           ← vec helpers + fanIndices only
│   ├── adjacency.ts                      ← re-exports ADJACENCY
│   └── __tests__/
│       ├── readWorkbook.ts               ← minimal xlsx reader (test only)
│       └── geometry.test.ts              ← 10 validation tests
├── components/
│   ├── DomeScreen.tsx                    ← the screen grid
│   ├── DomeCanvas.tsx                    ← dynamic(ssr:false) WebGL boundary
│   ├── DomeScene.tsx                     ← 26 × (FaceShell + ElementLayer)
│   ├── FaceShell.tsx  ElementLayer.tsx
│   ├── DomeNetView.tsx                   ← 2D fallback / companion view
│   ├── CameraPresets.tsx  MetricLegend.tsx
│   ├── KpiStrip.tsx  SelectionRail.tsx  DomeShell.tsx  ScreenFallback.tsx
├── store/domeStore.ts
├── config.ts   types.ts   index.ts
scripts/
├── validate-dome-geometry.ts             ← prints the validation report
├── register-test-hooks.mjs               ← Node ESM resolver for extensionless TS
└── resolve-ts.mjs
```

### Public API of `data/geometry.ts` — keep stable

`ALL_FACES` · `PRESENT_FACES` · `FACE_MAP` · `ADJACENCY` · `getFaceElements(face)`
· `getAllElements()` · `templateToWorld(uv, face)` · `getTemplate(kind)` ·
`faceBasis(genFace)` · `TOTAL_ELEMENTS` · `DOME_CIRCUMRADIUS` · `EDGE_LENGTH` ·
`ELEMENT_PITCH`

---

## 6. Commands

```bash
npm run dev                 # dev server
npm run build               # production build
npm run test:geometry       # 10 geometry validation tests
npm run validate:geometry   # prints the accuracy report
npx tsc --noEmit            # typecheck
npx eslint src scripts      # lint
```

---

## 7. PHASE 1 — COMPLETE ✅

3D model + camera + rendering, geometry reconstructed and validated.

### Validation report (current, reproducible via `npm run validate:geometry`)

```
total faces                 32 (26 present + 6 foot opening)
  pentagons / hexagons      12 / 20
correctly matched faces     26 / 26
total elements              7557 (workbook: 7557, model: 7557)
────────────────────────────────────────────────────────────
max XYZ error               1.255e-9 m
RMS XYZ error               6.471e-10 m
mean XYZ error              5.918e-10 m
face-normal error (max)     5.593e-5 deg
face-normal error (mean)    1.790e-5 deg
edge-gap error              0.000e+0 m   (90 shared edges)
────────────────────────────────────────────────────────────
circumradius                3.000 m
vertex radius spread        1.230e-10 m
edge length                 1.210644637 m
adjacency degrees           all correct (5 pent / 6 hex)
```

### How the reconstruction works (4 steps)

1. **Analytic solid from the edge graph.** 60 canonical vertices → 90 edges of
   equal length → every vertex degree 3 → 32 face planes. **No orientation is
   assumed.** (An earlier attempt grouped faces by *guessed* normal directions and
   failed its own flatness assertion.)
2. **PCA plane fit per FceNum** to get each measured normal. **Not**
   `normalize(centroid)` — the element patch is not centred on its face, which
   biases pentagons by ~0.075°.
3. **One global rotation** (Horn quaternion / Kabsch) mapping analytic normals
   onto measured ones. Correspondence found by anchoring a pentagon + neighbour
   over 60 candidate pairings, then refined over all 26 matches.
   Worst residual 1.2e-6 deg; plane distances agree to 2.6e-10 m.
4. **Per-face in-plane clocking + handedness** fitted against the real lattice.
   In the polygon-anchored frame these land on **exact multiples of 36°
   (pentagons) and 60° (hexagons)** — the panels sit on the polyhedron's own
   symmetry axes, which is strong evidence the registration is right rather than
   merely fitted. 11 faces need a handedness flip.

Face polygons are built from **shared vertex indices**, so adjacent faces share
edges *by construction* — the gap is 0 structurally, not by tolerance.

### Tests (10, all passing)

They read `Must_cord.xlsx` **directly** via a small zip/xlsx reader using Node's
`zlib` — no dependency, and no derived fixture that could only prove the generator
agrees with itself.

| Suite | Asserts |
|---|---|
| workbook | 7 557 elements over 26 faces; every face 177 or 374 |
| solid | 32 faces / 12 pent / 20 hex / 26 present; all 60 vertices on circumsphere; all edges equal |
| face normals | every present face within 1e-3 deg of its plane fit |
| adjacent faces share edges | 90 shared edges, gap ≤ 1e-12 m; correct neighbour degrees |
| element positions | all 7 557 within 1e-6 m, **bijectively** matched; absent faces yield none |

**Mutation-verified** (proof they are not vacuous):

| Mutation | Result |
|---|---|
| Rotate one face 0.5° | `face 27: element off by 0.0061 m` → 1 fail |
| Nudge a shared vertex 1 mm | circumsphere + edge-length → 2 fail |
| Restored | 10 pass |

⚠️ **Honest caveat:** the edge-gap assertion **cannot fail** while faces share
vertex indices — moving a shared vertex moves it for both. It is a regression
guard against a future refactor that reintroduces per-face polygon computation,
not an independently-failing check today.

ℹ️ The report's face-normal figure (5.6e-5 deg) is larger than the build
pipeline's (1.2e-6 deg) because the test harness runs its own Jacobi plane-fit
that converges less tightly. Both are far inside tolerance. Not model error.

---

## 8. TRAPS — every one of these already cost time

### T1. Row 1 of the sheet is a header stored as SHARED STRINGS
Read as numbers it becomes a phantom element at `(0, 1, 2)` on face 3, sitting 2 m
off that face's plane. **Skip rows containing any `t="s"` cell** — do not trust a
row index. Always assert the final count is 7 557.

### T2. Never build an in-plane frame from an arbitrary world axis
The original code did:
```ts
const up = Math.abs(normal[0]) < 0.9 ? [1,0,0] : [0,1,0];
const tangentU = normalize(cross(up, normal));
```
That reference vector has nothing to do with the panel's true orientation, and is
discontinuous across `|nx| = 0.9`. Result: **23 of 26 faces had elements up to
0.167 m out of position (1.7× the element pitch), and 0 of 65 adjacent face pairs
shared an edge** (median gap 0.34 m). The dome looked plausible and was wrong.
The in-plane frame must be anchored to the face's **own first polygon vertex**.

### T3. Convex hull does NOT recover the face polygon
The element lattice is inset ~0.135 m from the panel edge. Hull-then-simplify
gives a correct-shaped but **11% undersized** hexagon, and for pentagons a 14-gon
that is not a pentagon at all. **Derive polygons analytically**; use the hull only
as a validation assertion.

### T4. Phase is cyclic — do not colour it with a linear ramp
`TileCard.tsx:51` (in the *other* feature, `array-monitor`) does
`((el.phase + 180) / 360) * 100`. −179° and +179° are 1° apart physically but
render at opposite ends of the scale, so a nearly-aligned array displays as
maximally scrambled. `schedular`'s `array-grid.tsx` has the same defect.
**The dome must use a cyclic 4-anchor map that wraps.** Fix the others too.

### T5. `--color-da-gauge` equals `--color-da-brand` in dark mode
Both `#2dd4bf` → "healthy" and "selected" share a hue. **Never encode selection by
hue alone.** Recommended: move gauge to `#3ddc9a`.

### T6. WebGL guard must run BEFORE the first render
`useState(true)` + `useEffect(() => setWebGLOk(detect()))` renders `<Canvas>`
before the check can disable it. Use a **lazy initialiser**: `useState(detectWebGL)`.
Safe because the component is behind `dynamic(ssr:false)`.
Also: a React error boundary **cannot** catch this — R3F creates the renderer
asynchronously, so the failure arrives as an unhandled promise rejection. A
`window` `unhandledrejection` listener is required.

### T7. Node ESM needs file extensions; the app uses bundler resolution
Do not add `.ts` extensions to app imports. `scripts/resolve-ts.mjs` is a
test-only resolver hook that retries failed relative specifiers with `.ts`/`.tsx`.

### T8. Do not import from `dats-app 1`
Its `globals.css` and `antenna-array-old/antenna-array.css` contain `!important`
rules that match on Tailwind class names and attribute substrings. Anything
sharing a page with them inherits that.

---

## 9. KNOWN ISSUE — fix first thing

**`src/features/dome-monitor/components/DomeCanvas.tsx`** currently has:
```ts
const [webGLOk, setWebGLOk] = useState<boolean>(true);
useEffect(() => { setWebGLOk(detectWebGL()); }, []);
```
This is trap **T6** — it reintroduces the dev-server crash. ESLint flags it
(`react-hooks/set-state-in-effect`) and it is **the one remaining lint error in
the feature**.

**Fix:** replace both lines with `const [webGLOk, setWebGLOk] = useState<boolean>(detectWebGL);`

(It was left in place because it was an edit made outside this work, not a
deliberate design choice we validated.)

---

## 10. Remaining phases

### PHASE 2 — Selection  ⬜ next
- Face picking, then element picking via `event.instanceId`
  (`globalElementId = faceOffset[faceId] + instanceId`)
- Hover = **identify only** (tooltip ≤3 lines). Click = **commit**.
- **Selection must never move the camera implicitly.** Camera motion only on
  explicit action (alarm click, search, `F`, Locate button).
- Breadcrumb `Dome › Face 18 › u17 v09`, each crumb a camera target.
- **Selection state lives in URL search params** — reuse the existing
  `useDrillParams` hook from `features/array-monitor`. Screens using it must sit
  inside `<Suspense>`.
- Keyboard nav on real topology (`ADJACENCY` for faces, lattice for elements).
  **`N` = jump to next non-nominal object** — the single most valuable key.
- `Esc` steps up one selection level; `Home` resets camera. **Keep them separate.**
- Build LRU/Tile breadcrumb levels but leave dormant until **B1**.
- Exit gate: pick latency < 16 ms; a pasted URL restores selection exactly.

### PHASE 3 — Health visualisation  ⬜
- **The dome is neutral grey until something is wrong.** Colour means deviation.
  **Do not use green for healthy** — it destroys peripheral-vision alarm detection.
- Four discrete states at overview + a **redundant non-colour cue** (hatch, badge,
  or word) so the display works in greyscale. Verify by screenshotting to grey.
- Continuous heat scales only at face/element level, in an explicitly labelled
  analysis mode with a legend. **Never mix a heat scale and alarm colours in one
  render** — put it on a mode selector (`States | Gain | Phase | Temp`).
- Element colour priority: fault overrides everything (full opacity, 1.35× point
  size — a fault must be findable by size as well as hue) → offline muted →
  metric ramp. Ramps interpolate in **OKLab, not sRGB**.
- Per-face status **texture** for sub-face granularity — a cluster shows as a
  blotch, scattered failures as faint noise. Do **not** draw 7 557 individual
  coloured points at overview.
- **Connected-component labelling** over failed elements per face → worst-cluster
  KPI (see §2).
- Ship the **2D unfolded net view** here, co-equal with the 3D — the dome can only
  ever show about half its faces. Use a fixed hand-tuned layout that never
  changes between releases (operators build spatial memory). No unfolding
  animation.
- Semantic zoom + horizon culling.
- Exit gate: greyscale screenshot fully readable; a single failure findable by
  keyboard alone.

### PHASE 4 — Telemetry  ⬜ (needs B2)
- Vanilla-store transport (see §4). Mock → live behind one interface.
- **Staleness is the one safety-critical requirement.** An operator must never
  read stale data as healthy:
  - global data-age indicator always visible
  - per-object no-data is a **distinct visual state**, never nominal grey
  - `NO_DATA` excluded from the availability numerator **and** flagged separately
  - values freeze with timestamp; sparklines draw a **visible gap**, never
    interpolate through an outage
  - a stale readiness verdict is `UNKNOWN`, never `GO`
- **Alarm on aggregates, not elements.** 7 557 alarmable elements is an
  alarm-flood machine — one PSU drop could raise 374 alarms in a second.
  Elements log *events*; alarms fire on face/cluster metrics. Show suppression
  counts visibly, never silently.
- Acknowledge = "I have seen it", **not** "it is fixed" — must not clear or hide
  the alarm. Shelve requires a mandatory expiry.
- Readiness verdict (Go / Degraded / No-Go) against the **B3** floor, naming the
  driving constraint.
- Exit gate: 7 557 simultaneous colour changes at 10 Hz stay under 16 ms/frame.

### PHASE 5 — Polish & performance  ⬜
- Motion: hover 100 ms, selection 160 ms, camera 440 ms. Camera transitions
  **slerped on the orbit sphere** — never lerp position (paths through the dome
  interior). All interruptible.
- **No auto-rotate, ever. No bloom, glow, HDR, lens flare, skybox.**
  Tone mapping stays `NoToneMapping` so scene colours match the badge colours.
- In-scene fault tags with leader lines for **critical faces only**, capped at 4.
- Labels as **HTML overlay, not SDF text** — inherits fonts/tokens, stays crisp.
- `PerformanceMonitor` adaptive quality, reduced-motion paths, light/dark parity.
- Verify at 1366×768 **and** 2560. Give the dome its own `:has()` root clamp with
  a **14 px floor** — the archival clamp resolves to 13.99 px at 1366, putting
  `text-3xs` at 7.87 px which is unreadable for a shift.
- Exit gate: Spector.js capture archived as an acceptance artefact.

### PHASE 6 — Testing  ⬜
- Geometry regression tests already exist — **keep them green**.
- Add: cluster-labelling unit tests; keyboard-only pass; screen-reader pass
  (canvas selection state mirrored into an ARIA live region); greyscale audit.
- Verify both `next build` and `next build --webpack`.

---

## 11. Design decisions already made

- **Concept B "Premium Engineering"** chosen (scored 83 vs 73 Mission Control, 59
  Digital Twin). Deciding factor: element pitch on screen — 8.8 px at B's ~66%
  area budget vs 6.3 px at A's, where the lattice degrades to texture and you'd
  get most of the value from a 26-cell grid with no 3D at all.
- Viewport is **borderless**, separated from the board by a value step, not a
  hairline. That is what makes the dome read as hero.
- Face table survives as a **collapsible bottom deck** (key `T`), closed by default.
- Structural dimensions match the existing shells: header `4rem`, module rail
  `13.75rem`, detail rail `18.5rem`, footer `2.75rem`, gutter `0.75rem`,
  screen padding `0.875rem`.
- **Attitude gizmo (az/el compass), not a view cube.** A cube implies six
  box-aligned faces; this solid has 26 faces at truncated-icosahedron angles and
  no meaningful "front". Az/el also matches what `RotorControl.tsx` already speaks.
- Reuse unchanged: `data-archival/components/ui/{Card,Badge,Button,DataTable,
  ProgressBar,StatusBits}`, `lib/cn.ts`, `lib/format.ts`, `useDrillParams.ts`.

---

## 12. Real vs mock data — keep visibly separate

| Layer | Status |
|---|---|
| Dome geometry | ✅ **REAL** — reconstructed from `Must_cord.xlsx` |
| Face / element addressing | ✅ **REAL** — FceNum + lattice index |
| LRU / Tile / Sub-array map | ❌ **ABSENT** — see B1 |
| Element health, temp, power, RF | ⚠️ **MOCK** — `telemetry.mock.ts` |
| Alarms and thresholds | ⚠️ **MOCK** — placeholder values |

Mock modules use a fixed-seed Mulberry32 PRNG (never `Math.random()`, so SSR and
hydration match), are named `*.mock.ts`, and the UI must carry a persistent
**DEMO DATA** marker while any mock source is active.
**Never present a fabricated value as actual antenna health.**

---

## 13. If you regenerate the geometry

`data/generated/domeGeometry.generated.ts` was produced by an offline pipeline
(analytic solid → PCA plane fit → Kabsch → per-face clocking). The build scripts
were run outside the repo. If you need to regenerate:

1. Re-implement the 4 steps in §7 — they are fully described there.
2. Emit with **12 decimal places** (needed to preserve 1e-9 accuracy).
3. `npm run test:geometry` must stay green, and `npm run validate:geometry` must
   still report max XYZ error < 1e-6 m and edge-gap 0.

For most work you will **never need to regenerate** — the geometry is settled.

---

## 14. Reference

Full research and architecture proposal (Excel analysis, stack comparison, UX
concepts, layout, component tree, risks):
<https://claude.ai/code/artifact/9305ae96-86a5-4484-99f9-77ae04f1c79a>

---

## Quick start tomorrow

```bash
npm install
npm run test:geometry      # expect 10 pass
npm run validate:geometry  # expect max XYZ error 1.255e-9 m
npm run dev                # → /dashboard
```

Then: fix §9, and start Phase 2. Chase blocker **B1** in parallel — it gates the
drill-down depth, not Phase 2 itself.
