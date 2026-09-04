"use client";

import { useEffect, useRef, useState } from "react";
// Type-only: erased at compile time, so it never evaluates Cesium's module
// body — which is the whole reason the real import is deferred into an effect.
import type * as CesiumNS from "cesium";
import { SITE, TRACKING, BEAM_HALF_WIDTH_DEG } from "../data/mnc.mock";
import { useSimStore, activeTarget, type BeamPointing } from "../sim/simStore";
import { orbitSample } from "../sim/lookAngles";
import { beamDirections, carryingBeamIndex } from "../sim/beamPlanner";
import type { SatelliteState } from "../sim/lookAngles";
import type { Basemap, GlobeApi, Projection } from "../globeApi";
import { TRACK_COLOUR as COLOUR } from "../trackColours";


/** Points around each beam footprint. 24 reads as a circle at any zoom the
 *  cluster is legible at, and keeps the per-frame rebuild to ~150 vertices. */
const RING_SEGMENTS = 24;
const RING_COS: number[] = [];
const RING_SIN: number[] = [];
for (let k = 0; k <= RING_SEGMENTS; k++) {
  const a = (k / RING_SEGMENTS) * Math.PI * 2;
  RING_COS.push(Math.cos(a));
  RING_SIN.push(Math.sin(a));
}

/**
 * Angular radius of each beam's footprint, degrees.
 *
 * The five tracking beams are drawn at their real half-width, so the overlaps
 * on screen are the actual overlaps — the target is inside the highlighted
 * circle because it is inside that beam, not because the circle was drawn
 * generously. The data beam is drawn at half that: it rides on top of whichever
 * tracking beam is holding the target, and a same-size ring would z-fight with
 * the one underneath instead of reading as nested in it.
 */
const RING_HALF_DEG = (() => {
  const w = BEAM_HALF_WIDTH_DEG;
  return [w, w, w, w, w, w * 0.5];
})();

/** Screen radius the sum beam's footprint is never drawn smaller than, px. */
const RING_MIN_PIXELS = 8;
/**
 * …and never magnified beyond this multiple of its TRUE angular size.
 *
 * Expressed as a magnification rather than as a fraction of slant range, which
 * is what it used to be. That older form silently broke the moment the beam
 * design changed: a 4.5° beam's true footprint is already 3.9% of slant range,
 * so a 2.5% ceiling sat BELOW the 1x floor and the `min(max(1, …), cap)`
 * collapsed to a constant — every cluster drawn at 0.64x, permanently
 * understating the geometry. A cap on the magnification cannot invert against
 * the floor it is capping, whatever the beamwidth becomes.
 */
const RING_MAX_MAGNIFICATION = 6;

/**
 * How many tracked targets get a drawn beam cluster.
 *
 * Every target the planner assigns beams to is genuinely being served, and the
 * display used to draw exactly one of them — the selection — which made an
 * aperture holding twenty passes look like an aperture holding one. Drawing
 * them all is the honest picture, but it is not free: each cluster is six
 * footprint polylines rebuilt every frame, so this is where the honesty stops
 * and the frame budget starts. Twelve is comfortably above the minimum the sky
 * now guarantees and keeps the per-frame rebuild near a thousand vertices.
 *
 * The clusters beyond this are not hidden from the operator — the capacity
 * strip still counts every one of them, so the number tracked and the number
 * drawn never silently disagree.
 */
const MAX_DRAWN_CLUSTERS = 12;

/** Shortest signed difference between two azimuths, degrees. Magnifying the
 *  cluster means differencing azimuths, and due north is where that wraps. */
function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/**
 * The spacecraft model, and how large it is drawn.
 *
 * ---- why this is not `minimumPixelSize` ----
 *
 * Cesium has a built-in version of exactly this rule, and it cannot be used
 * here, because it feeds its own output back into its input. `updateComputedScale`
 * measures the metres-per-pixel at the model using `model._boundingSphere.radius`
 * — the radius AFTER the previous frame's scale was applied — and `getPixelSize`
 * resolves that through `distanceToBoundingSphere`, which is
 * `max(0, distance - radius)`.
 *
 * So a model scaled up to stay visible from far away grows a bounding sphere
 * thousands of kilometres wide, and the moment the camera comes closer than
 * that radius the distance clamps to zero, the apparent diameter saturates,
 * the minimum-size branch stops firing, and the scale collapses to 1.0 — the
 * true eight-metre satellite, invisible. Zooming IN made the spacecraft vanish,
 * and raising the scale ceiling only moved the collapse further out.
 *
 * Measuring against a FIXED radius — the model's real one, which never changes
 * — breaks the loop. The apparent size is then genuinely constant at every
 * zoom, which is the whole point: an operator should not have to re-find a
 * spacecraft after every scroll.
 */
const SATELLITE_MODEL_URI = "/models/satellite.glb";
/** Bounding-sphere diameter of the glTF, metres — the diagonal of the bounding
 *  box written by scripts/make-satellite-model.mjs. Change the geometry there
 *  and this has to follow, or the pixel target below is mis-calibrated. */
const SATELLITE_MODEL_DIAMETER_M = 8.61;
/** How large the spacecraft is drawn on screen, pixels. Constant at all zooms.
 *  Measured across the bounding sphere, so the bus itself is about a quarter
 *  of this — the arrays spend the rest. */
const SATELLITE_PIXELS = 95;
/**
 * …except that it is never inflated past this, metres.
 *
 * Only the full-Earth overview reaches this cap, and only because holding 64
 * pixels from 34 000 km would need a spacecraft wider than the planet. Four
 * thousand kilometres is already an absurd satellite; it is the trade a
 * tracking display makes so its objects can be found at all.
 */
const SATELLITE_MAX_DIAMETER_M = 4_000_000;

/** How far the sim clock may drift before the orbit track is re-propagated. */
const ORBIT_REFRESH_SIM_MS = 60_000;

/**
 * How far past the newest snapshot the tween may carry an object, in units of
 * one propagator interval.
 *
 * Above 1 this is EXTRAPOLATION, and that is the point. `setInterval(250)` is
 * a floor, not a promise: a busy main thread, a garbage collection, or the
 * ~140 ms pass search delivers the next snapshot late, and a tween that stops
 * dead at its destination holds every object still for the overrun and then
 * jumps when the snapshot lands. Holding still and jumping is precisely what
 * reads as stutter — the eye forgives a small position error far more readily
 * than it forgives discontinuous velocity.
 *
 * So past the expected arrival the object keeps flying along the segment it
 * was already on, and the next ingest starts its new segment from wherever it
 * actually got to (`prev` is the DISPLAYED position, not the previous
 * snapshot), which makes the correction continuous instead of a snap.
 *
 * The ceiling is what makes that safe, and 1.6 is not arbitrary. Overrunning
 * by less than a FULL tick guarantees the display can never get ahead of the
 * snapshot it will be handed next, so a late tick makes an object briefly slow
 * — never reverse. It also covers the worst hitch this scene actually has: the
 * ~140 ms pass search that fires every 20 s fits inside 0.6 of a 250 ms tick,
 * which is why that search now costs a few metres of extrapolation error
 * instead of a visible freeze.
 */
const TWEEN_MAX_ALPHA = 1.6;

/**
 * Cesium globe for the tracking panel.
 *
 * Dynamic import INSIDE an effect: Cesium reads `window.CESIUM_BASE_URL` while
 * its module body evaluates, so that global has to be set first. A top-level
 * import would evaluate before any component code could set it, and Cesium
 * would fetch its workers from the page URL and fail.
 *
 * Entities are created ONCE and then mutated in place. Clearing and rebuilding
 * 70 entities four times a second would thrash Cesium's primitive batches and
 * garbage-collect the labels, which shows up as visible flicker; moving a
 * position is a matrix write.
 *
 * ---- why the scene is not driven by the store tick ----
 *
 * The propagator runs at 4 Hz and the display at 60. Writing propagated
 * positions straight into entities means every object holds still for fifteen
 * frames and then teleports — and at 120x, where a LEO object covers 210 km
 * between ticks, that is not a subtle stutter but a visible hop. So the store
 * tick only INGESTS a snapshot; the scene tweens from the previous snapshot to
 * it inside Cesium's own `preUpdate`, one frame before each render. That costs
 * one tick of latency (250 ms of a simulated pass) and buys continuous motion
 * at whatever rate the display runs.
 */
export function CesiumGlobe({ onReady }: { onReady?: (api: GlobeApi) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Mutator handed up by the setup effect, called on every simulation tick.
  const apiRef = useRef<{
    update: (states: SatelliteState[], trackedIds: Set<string>, target: SatelliteState | null) => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let viewer: { destroy: () => void; isDestroyed: () => boolean } | null = null;
    let cancelled = false;

    (async () => {
      try {
        (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium";
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        if (cancelled) return;

        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
        if (token) Cesium.Ion.defaultAccessToken = token;

        const v = new Cesium.Viewer(host, {
          // A stencil buffer is not requested by default, and without one
          // Cesium silently declines to draw model silhouettes — which is how
          // an in-view spacecraft carries its status colour.
          contextOptions: { webgl: { stencil: true } },
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement("div"),
          baseLayer: token
            ? undefined
            : Cesium.ImageryLayer.fromProviderAsync(
                Promise.resolve(
                  new Cesium.UrlTemplateImageryProvider({
                    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    maximumLevel: 18,
                    credit: "Esri World Imagery",
                  }),
                ),
                {},
              ),
        });
        if (cancelled) {
          v.destroy();
          return;
        }
        viewer = v;

        /* ---- camera controller ----
         *
         * Cesium's defaults are tuned for looking AT the globe, and they fight
         * a space scene in two specific ways.
         *
         * `maximumZoomDistance` is unbounded by default but the inertia and
         * zoom-factor defaults make crossing four orders of magnitude — a
         * 12 000 km overview down to a spacecraft 700 km up — take dozens of
         * wheel notches. And `enableCollisionDetection` refuses to let the
         * camera descend below terrain, which on approach to a low target
         * reads as the zoom simply jamming.
         *
         * The floor is 50 m rather than 0: at zero the camera can pass through
         * the point it is orbiting, after which the controls invert and the
         * scene appears to spin the wrong way.
         */
        const controller = v.scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 50;
        controller.maximumZoomDistance = 8e7;
        controller.enableCollisionDetection = false;
        controller.inertiaZoom = 0.75;
        controller.inertiaSpin = 0.6;
        controller.inertiaTranslate = 0.6;
        // Zoom toward the cursor rather than the screen centre, so aiming at a
        // satellite and scrolling actually approaches it.
        controller.zoomEventTypes = [
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH,
        ];

        v.scene.globe.enableLighting = false;
        if (v.scene.skyAtmosphere) v.scene.skyAtmosphere.show = true;
        /* Explicitly black, not TRANSPARENT.
         *
         * Cesium defaults its drawing buffer to `alpha: false` (Context.js), so
         * a transparent clear colour composites to black anyway — the scene
         * only LOOKED like it was letting the panel through. Saying black says
         * what actually happens, and keeps it true if a stencil/alpha context
         * option is ever changed above. */
        v.scene.backgroundColor = Cesium.Color.BLACK;
        v.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0b141d");

        const sitePos = Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg, SITE.heightM);
        const rangeM = TRACKING.maxRangeKm * 1000;

        /* ---- the station ---- */
        v.entities.add({
          position: sitePos,
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString(COLOUR.site),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.5,
          },
          label: {
            text: `${SITE.id} · ${SITE.name}`,
            font: "600 11px system-ui, sans-serif",
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("rgba(11,20,29,0.78)"),
            pixelOffset: new Cesium.Cartesian2(0, -30),
            scale: 0.9,
          },
        });

        /* ---- tracking volume ----
         *
         * A hemisphere, not the ±30° pyramid this used to draw. MUST-01 is a
         * geodesic dome and hemispherical coverage is the whole reason it is
         * one: 26 faces pointing in different directions cover azimuth 0-360°
         * and elevation 0-90° between them. The ±30° figure is a single FACE's
         * scan limit and lives in the beam planner, where it decides which
         * face can serve a target — not here, where it would understate the
         * aperture by a factor of about twenty.
         */
        const fenceEntities = [
          v.entities.add({
            position: sitePos,
            ellipsoid: {
              radii: new Cesium.Cartesian3(rangeM, rangeM, rangeM),
              maximumCone: Cesium.Math.toRadians(90 - TRACKING.elevationMaskDeg),
              material: Cesium.Color.fromCssColorString(COLOUR.fov).withAlpha(0.14),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(COLOUR.fov).withAlpha(0.9),
              slicePartitions: 12,
              stackPartitions: 8,
            },
          }),
        ];

        /* ---- station frame ----
         * One rigid transform and its inverse, built once. Look angles are
         * read back out of the interpolated world position rather than
         * interpolated as az/el/range of their own, so the beam cluster is
         * welded to the dot it is pointing at instead of drifting a kilometre
         * off it between ticks.
         */
        const enuFrame = Cesium.Transforms.eastNorthUpToFixedFrame(sitePos);
        const worldToEnu = Cesium.Matrix4.inverseTransformation(enuFrame, new Cesium.Matrix4());

        const scratchLocal = new Cesium.Cartesian3();
        const enuToWorld = (
          azDeg: number,
          elDeg: number,
          rangeKm: number,
          result: CesiumNS.Cartesian3,
        ) => {
          const az = Cesium.Math.toRadians(azDeg);
          const el = Cesium.Math.toRadians(elDeg);
          const r = rangeKm * 1000;
          scratchLocal.x = r * Math.cos(el) * Math.sin(az);
          scratchLocal.y = r * Math.cos(el) * Math.cos(az);
          scratchLocal.z = r * Math.sin(el);
          return Cesium.Matrix4.multiplyByPoint(enuFrame, scratchLocal, result);
        };

        /** Topocentric look angles of a world position, from the station. */
        const lookFromSite = (world: CesiumNS.Cartesian3) => {
          const local = Cesium.Matrix4.multiplyByPoint(worldToEnu, world, scratchLocal);
          const r = Cesium.Cartesian3.magnitude(local);
          return {
            azimuthDeg: ((Math.atan2(local.x, local.y) * 180) / Math.PI + 360) % 360,
            elevationDeg: r > 0 ? (Math.asin(local.z / r) * 180) / Math.PI : 0,
            rangeKm: r / 1000,
          };
        };

        /* ---- satellites ---- */
        interface SatRender {
          entity: CesiumNS.Entity;
          position: CesiumNS.ConstantPositionProperty;
          /** Which way the spacecraft is flying, for the model's attitude. */
          orientation: CesiumNS.ConstantProperty;
          /** Rewritten every frame to hold the model at a constant pixel size. */
          scale: CesiumNS.ConstantProperty;
          /** Inside the tracking volume, so drawn as a spacecraft not a dot. */
          modelled: boolean;
          /** Snapshot the tween starts from, the one it runs to, and the
           *  interpolated position every other bit of geometry points at. */
          prev: CesiumNS.Cartesian3;
          next: CesiumNS.Cartesian3;
          cur: CesiumNS.Cartesian3;
          slant: CesiumNS.Entity | null;
          slantPositions: CesiumNS.Cartesian3[];
          colour: string;
          size: number;
          labelled: boolean;
        }
        // The model's real radius, never the scaled one — this is the fixed
        // reference that keeps the size computation from feeding on itself.
        const modelSphere = new Cesium.BoundingSphere(sitePos, SATELLITE_MODEL_DIAMETER_M / 2);
        const scratchVelocity = new Cesium.Cartesian3();
        const scratchRotation = new Cesium.Matrix3();
        const scratchQuaternion = new Cesium.Quaternion();
        const sats = new Map<string, SatRender>();

        /* ---- beam clusters ----
         *
         * A POOL of clusters, not one. The aperture serves everything the
         * planner assigned beams to, and drawing only the selection made a
         * dome holding twenty passes look like a dome holding one.
         *
         * Six footprints each, repositioned per frame. The circle is the beam:
         * a line from the dome to the spacecraft says where the array is
         * pointing but nothing about what it illuminates, and a monopulse
         * cluster is only legible as a cluster once the footprints are drawn —
         * five overlapping circles whose crossovers are the difference
         * channels the pointing loop nulls.
         *
         * Only the PRIMARY cluster draws its six axes back to the dome. Twelve
         * clusters' worth would be seventy-two full-range lines converging on
         * one point, which is the same yellow starburst the slant paths are
         * already kept faint to avoid; the axes are context for one cluster
         * being read closely, not a permanent fixture.
         *
         * Positions go in as `CallbackProperty(..., false)`. A ConstantProperty
         * marks the geometry static, so Cesium rebuilds it only when the
         * property raises a change event — fine at 4 Hz, useless at 60. The
         * non-constant callback puts these polylines on the dynamic updater,
         * which re-reads them every frame.
         */

        /* ---- footprint styling ----
         *
         * `PolylineOutlineMaterialProperty`, not a flat colour. A one-pixel
         * translucent yellow line over Esri world imagery is invisible: it is
         * competing with cloud, desert and sunlit ocean, all of which are
         * brighter than it is. Casing every ring in a dark outline gives it
         * contrast against whatever is behind it, which is the difference
         * between a beam you have to hunt for and one you can read at a
         * glance.
         *
         * Three levels now, not two. The cluster the operator is reading is
         * drawn at full strength; the other eleven are drawn back, because a
         * dozen clusters at equal weight is a field of circles with no subject.
         * Inside each cluster the beam actually HOLDING the target is lifted
         * again — that mark moving from SUM to ΔEL+ and back is the pointing
         * loop working, and it has to survive being one of twelve.
         */
        const ringMaterial = (css: string, alpha: number) =>
          new Cesium.PolylineOutlineMaterialProperty({
            color: Cesium.Color.fromCssColorString(css).withAlpha(alpha),
            outlineColor: Cesium.Color.fromCssColorString("#04080d").withAlpha(alpha * 0.85),
            outlineWidth: 2,
          });

        const RING_STYLE = {
          primary: {
            idle: ringMaterial(COLOUR.beamTrack, 0.85),
            hold: ringMaterial(COLOUR.beamTrack, 1),
            data: ringMaterial(COLOUR.beamData, 1),
          },
          secondary: {
            idle: ringMaterial(COLOUR.beamTrack, 0.4),
            hold: ringMaterial(COLOUR.beamTrack, 0.72),
            data: ringMaterial(COLOUR.beamData, 0.6),
          },
        };

        /* ---- line weight carries beam weight ----
         *
         * The six beams of a cluster do not get equal shares of the face's
         * aperture — the data beam is the one worth spending on, the four
         * difference channels only have to measure an imbalance — so drawing
         * them at equal weight would show a design decision that was not made.
         * Stroke width is the encoding: it survives being small, it does not
         * compete with the colour that already means "which role", and it
         * reads at a glance as "this beam is carrying more".
         *
         * Sampled from a template cluster because the weights are fixed per
         * index; the angles it is built at are irrelevant and never drawn.
         */
        const RING_WIDTH = beamDirections(0, 45).map((beam) => ({
          /* Three tiers of emphasis, named for emphasis rather than for which
             cluster they belong to — a secondary cluster's held beam and a
             primary cluster's idle beam want the same weight, and naming these
             "primary"/"secondary" made that shared middle read as a bug. */
          dim: new Cesium.ConstantProperty(1 + beam.weight * 1.4),
          base: new Cesium.ConstantProperty(1.6 + beam.weight * 2.4),
          lit: new Cesium.ConstantProperty(2.8 + beam.weight * 2.4),
        }));

        interface ClusterRender {
          /** Far end of each beam axis — also the centre of its footprint. */
          ends: CesiumNS.Cartesian3[];
          axisPositions: CesiumNS.Cartesian3[][];
          ringPositions: CesiumNS.Cartesian3[][];
          axes: CesiumNS.Entity[];
          rings: CesiumNS.Entity[];
          /** Last styling written, so a frame that changes nothing writes
           *  nothing — a material assignment rebuilds the polyline's
           *  appearance, and there are up to 72 of them. */
          carrying: number;
          primary: boolean | null;
          shown: boolean;
        }

        const makeCluster = (): ClusterRender => {
          const ends = Array.from({ length: 6 }, () => new Cesium.Cartesian3());
          const axisPositions = ends.map((end) => [sitePos, end]);
          const ringPositions = Array.from({ length: 6 }, () =>
            Array.from({ length: RING_SEGMENTS + 1 }, () => Cesium.Cartesian3.clone(sitePos)),
          );
          return {
            ends,
            axisPositions,
            ringPositions,
            axes: axisPositions.map((_, i) =>
              v.entities.add({
                show: false,
                polyline: {
                  positions: new Cesium.CallbackProperty(() => axisPositions[i], false),
                  width: i === 5 ? 2 : 1.4,
                  // Faint on purpose: the axis is context for the footprint at
                  // its end, and six full-range lines at high opacity read as
                  // glare rather than as geometry.
                  material: Cesium.Color.fromCssColorString(
                    i === 5 ? COLOUR.beamData : COLOUR.beamTrack,
                  ).withAlpha(i === 5 ? 0.5 : 0.28),
                },
              }),
            ),
            rings: ringPositions.map((_, i) =>
              v.entities.add({
                show: false,
                polyline: {
                  positions: new Cesium.CallbackProperty(() => ringPositions[i], false),
                  width: RING_WIDTH[i].dim,
                  material: RING_STYLE.secondary.idle,
                },
              }),
            ),
            carrying: -1,
            primary: null,
            shown: false,
          };
        };

        const clusters = Array.from({ length: MAX_DRAWN_CLUSTERS }, makeCluster);

        const hideCluster = (c: ClusterRender) => {
          if (!c.shown) return;
          c.shown = false;
          for (let i = 0; i < 6; i++) {
            c.axes[i].show = false;
            c.rings[i].show = false;
          }
          // Reset the highlight too, not just the visibility: leaving the last
          // beam lit would show two beams holding the target the next time
          // this slot is reused for a different pass.
          c.carrying = -1;
          c.primary = null;
        };

        const ringSphere = new Cesium.BoundingSphere(sitePos, 1);
        const ringDir = new Cesium.Cartesian3();
        const ringU = new Cesium.Cartesian3();
        const ringW = new Cesium.Cartesian3();
        const ringTmp = new Cesium.Cartesian3();

        /**
         * A circle of `radiusM` about `centre`, in the plane normal to the
         * line of sight — a footprint is what the beam cuts across the sky at
         * the target, not a patch of the local horizontal, and at 10° of
         * elevation those differ by nearly a right angle.
         */
        const buildRing = (
          centre: CesiumNS.Cartesian3,
          radiusM: number,
          out: CesiumNS.Cartesian3[],
        ) => {
          Cesium.Cartesian3.subtract(centre, sitePos, ringDir);
          Cesium.Cartesian3.normalize(ringDir, ringDir);
          // Geocentric up at the footprint is never parallel to a line of
          // sight from the ground, so it is a safe reference for the first
          // basis vector; the guard covers the degenerate arithmetic anyway.
          Cesium.Cartesian3.normalize(centre, ringU);
          Cesium.Cartesian3.cross(ringDir, ringU, ringU);
          if (Cesium.Cartesian3.magnitudeSquared(ringU) < 1e-12) {
            Cesium.Cartesian3.cross(ringDir, Cesium.Cartesian3.UNIT_X, ringU);
          }
          Cesium.Cartesian3.normalize(ringU, ringU);
          Cesium.Cartesian3.cross(ringDir, ringU, ringW);
          Cesium.Cartesian3.normalize(ringW, ringW);

          for (let k = 0; k <= RING_SEGMENTS; k++) {
            const p = out[k];
            Cesium.Cartesian3.multiplyByScalar(ringU, radiusM * RING_COS[k], p);
            Cesium.Cartesian3.multiplyByScalar(ringW, radiusM * RING_SIN[k], ringTmp);
            Cesium.Cartesian3.add(p, ringTmp, p);
            Cesium.Cartesian3.add(centre, p, p);
          }
        };

        /* ---- orbit path of the active target ----
         * One ground-relative track, not seventy. It answers "where is this
         * pass going", which is the question a single selected object raises;
         * seventy overlapping ellipses would answer nothing and cost 70x the
         * propagation.
         */
        const orbitPath = v.entities.add({
          show: false,
          polyline: {
            positions: [],
            width: 1.4,
            material: Cesium.Color.fromCssColorString(COLOUR.orbit).withAlpha(0.5),
          },
        });

        /* ---- tween state ---- */
        let frameStart = performance.now();
        let lastIngest = performance.now();
        // Measured, not assumed: a busy main thread delivers the 250 ms timer
        // late, and tweening over an interval shorter than the real one makes
        // the motion finish early and sit still — the stutter it is meant to
        // remove.
        let frameSpan = 250;
        // Biased slightly long, so the common case is a few milliseconds of
        // lag rather than a few milliseconds of extrapolation. Both are smooth;
        // only one of them can guess the future wrong.
        const FRAME_SPAN_BIAS = 1.06;
        let lastStates: SatelliteState[] | null = null;
        let targetId: string | null = null;
        /* Which targets get a cluster this frame, in draw order: the selection
           first so it lands in slot 0 and gets the primary styling and the
           axes, then the rest of the served set by descending elevation. */
        let drawnIds: string[] = [];
        /* Where the array has been told to look, per target. Latched in the
           store and only re-issued when a target drifts a full beam off its
           commanded direction, so a cluster holds still while the spacecraft
           walks across it — which is the whole thing the five beams exist to
           show. Snapshotted on ingest rather than read from the store inside
           the frame loop, so a mid-frame store write cannot move half the
           clusters. */
        let pointings: Record<string, BeamPointing> = {};
        let labelsVisible = true;
        // Orbit track propagation is 46 SGP4 calls; at 4 Hz that is 184 a
        // second spent redrawing a line that moves imperceptibly.
        let orbitTargetId: string | null = null;
        let orbitComputedAt = Number.NEGATIVE_INFINITY;

        const scratchIngest = new Cesium.Cartesian3();

        const setColour = (rec: SatRender, colour: string) => {
          if (rec.colour === colour) return;
          rec.colour = colour;
          const c = Cesium.Color.fromCssColorString(colour);
          if (rec.entity.point) rec.entity.point.color = new Cesium.ConstantProperty(c);
          if (rec.entity.label) rec.entity.label.fillColor = new Cesium.ConstantProperty(c);
          // The model carries the state colour as a silhouette rather than a
          // tint: painting the whole bus red would throw away the shape that
          // is the reason for drawing a model at all, while an outline reads
          // as status at forty pixels and still leaves a satellite there.
          if (rec.entity.model) rec.entity.model.silhouetteColor = new Cesium.ConstantProperty(c);
        };

        apiRef.current = {
          update(states, trackedIds, target) {
            // A selection change publishes the same `states` array. Restarting
            // the tween on it would freeze every object for a quarter second
            // and then jump — so only a genuinely new snapshot re-times it.
            const fresh = states !== lastStates;
            if (fresh) {
              const now = performance.now();
              const dt = now - lastIngest;
              lastIngest = now;
              if (dt > 40 && dt < 2000) {
                frameSpan = frameSpan * 0.7 + dt * FRAME_SPAN_BIAS * 0.3;
              }
              frameStart = now;
              lastStates = states;
            }

            for (const s of states) {
              const isTarget = target?.id === s.id;
              const isTracked = trackedIds.has(s.id);
              const colour = isTarget
                ? COLOUR.target
                : isTracked
                  ? COLOUR.tracked
                  : s.visible
                    ? COLOUR.visible
                    : COLOUR.dormant;

              const pos = Cesium.Cartesian3.fromDegrees(
                s.lonDeg,
                s.latDeg,
                s.altitudeKm * 1000,
                undefined,
                scratchIngest,
              );

              let rec = sats.get(s.id);
              if (!rec) {
                const position = new Cesium.ConstantPositionProperty(pos);
                // Until the tween has two snapshots to difference there is no
                // velocity to align to, so the model starts level with the
                // local horizon rather than at some arbitrary attitude.
                const orientation = new Cesium.ConstantProperty(
                  Cesium.Transforms.headingPitchRollQuaternion(pos, new Cesium.HeadingPitchRoll()),
                );
                const scale = new Cesium.ConstantProperty(1);
                const entity = v.entities.add({
                  position,
                  orientation,
                  model: {
                    uri: SATELLITE_MODEL_URI,
                    // Driven from `drawFrame`. Cesium's own `minimumPixelSize`
                    // is deliberately left at its default of 0 — see the note
                    // on the constants above for why it cannot be used.
                    scale,
                    silhouetteColor: Cesium.Color.fromCssColorString(colour),
                    silhouetteSize: 1.5,
                    show: false,
                  },
                  point: {
                    pixelSize: 6,
                    color: Cesium.Color.fromCssColorString(colour),
                    // A dark rim is what makes a small dot survive bright
                    // imagery. Without it the dormant catalogue washes out over
                    // cloud and desert and the sky looks nearly empty — which
                    // is a rendering failure, not a sparse constellation.
                    outlineColor: Cesium.Color.fromCssColorString("#0b141d"),
                    outlineWidth: 1,
                    show: true,
                  },
                  label: {
                    text: s.id,
                    font: "700 10px system-ui, sans-serif",
                    fillColor: Cesium.Color.fromCssColorString(colour),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(11,20,29,0.8)"),
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    scale: 0.85,
                    show: false,
                  },
                });
                rec = {
                  entity,
                  position,
                  orientation,
                  scale,
                  modelled: false,
                  prev: Cesium.Cartesian3.clone(pos),
                  next: Cesium.Cartesian3.clone(pos),
                  cur: Cesium.Cartesian3.clone(pos),
                  slant: null,
                  slantPositions: [sitePos, new Cesium.Cartesian3()],
                  colour,
                  size: -1,
                  labelled: false,
                };
                rec.slantPositions[1] = rec.cur;
                sats.set(s.id, rec);
              } else if (fresh) {
                Cesium.Cartesian3.clone(rec.cur, rec.prev);
                Cesium.Cartesian3.clone(pos, rec.next);
              }

              setColour(rec, colour);

              /* ---- inside the fence, it is a spacecraft ----
               * Out of view the catalogue is context and a dot is the honest
               * way to draw it — seventy models would cost seventy draw calls
               * to say "these exist". Inside the tracking volume the object is
               * the work, and it gets the model: an operator can then see its
               * attitude and which way it is flying, which is the difference
               * between a plot and a display.
               */
              if (rec.modelled !== s.visible) {
                rec.modelled = s.visible;
                if (rec.entity.model) rec.entity.model.show = new Cesium.ConstantProperty(s.visible);
                if (rec.entity.point) rec.entity.point.show = new Cesium.ConstantProperty(!s.visible);
              }

              // Dormant objects recede but stay legible: the catalogue is
              // context, the visible set is the work.
              const size = isTarget ? 13 : isTracked ? 10 : s.visible ? 8 : 5;
              if (rec.size !== size && rec.entity.point) {
                rec.size = size;
                rec.entity.point.pixelSize = new Cesium.ConstantProperty(size);
              }

              // Only label what is being worked. Seventy labels is a wall of
              // text that hides the four passes that matter.
              const labelled = labelsVisible && (isTarget || isTracked);
              if (rec.labelled !== labelled && rec.entity.label) {
                rec.labelled = labelled;
                rec.entity.label.show = new Cesium.ConstantProperty(labelled);
              }

              // Slant path, drawn only for tracked passes. Its far end IS the
              // tweened position object, so the line follows the dot for free.
              if (isTracked && !rec.slant) {
                rec.slant = v.entities.add({
                  polyline: {
                    positions: new Cesium.CallbackProperty(() => rec!.slantPositions, false),
                    width: 1,
                    // Faint on purpose. There is one of these per tracked pass,
                    // each thousands of kilometres long, and at a dozen passes
                    // they add up to a yellow starburst over the station that
                    // drowns the beams they are meant to sit behind.
                    material: Cesium.Color.fromCssColorString(COLOUR.tracked).withAlpha(0.16),
                  },
                });
              }
              if (rec.slant) rec.slant.show = isTracked;
            }

            targetId = target?.id ?? null;
            pointings = useSimStore.getState().pointings;

            /* Which clusters to draw, in draw order.
             *
             * The selection leads so it takes slot 0 and its primary styling,
             * then the rest of the served set — already sorted by descending
             * elevation by the planner, which is also the order they matter
             * in: the highest pass has the shortest range and the most time
             * left on it. */
            drawnIds = targetId ? [targetId] : [];
            for (const id of trackedIds) {
              if (drawnIds.length >= MAX_DRAWN_CLUSTERS) break;
              if (id !== targetId) drawnIds.push(id);
            }

            /* Orbit path: one revolution centred on now, sampled coarsely and
             * only when it has gone stale. */
            const simTime = useSimStore.getState().simTime;
            if (!target) {
              orbitPath.show = false;
              orbitTargetId = null;
            } else if (
              target.id !== orbitTargetId ||
              Math.abs(simTime - orbitComputedAt) > ORBIT_REFRESH_SIM_MS
            ) {
              orbitTargetId = target.id;
              orbitComputedAt = simTime;
              const positions: CesiumNS.Cartesian3[] = [];
              for (let k = -45; k <= 45; k += 2) {
                const sample = orbitSample(target.id, simTime + k * 60_000);
                if (sample) {
                  positions.push(
                    Cesium.Cartesian3.fromDegrees(sample.lonDeg, sample.latDeg, sample.altitudeKm * 1000),
                  );
                }
              }
              orbitPath.show = positions.length > 1;
              if (orbitPath.polyline && positions.length > 1) {
                orbitPath.polyline.positions = new Cesium.ConstantProperty(positions);
              }
            }
          },
        };

        /* ---- the tween ----
         * Runs immediately before Cesium builds each frame, so what is drawn
         * is the position for THIS frame rather than the last one the
         * propagator happened to produce.
         */
        const drawFrame = () => {
          // Clamped at TWEEN_MAX_ALPHA, not at 1 — see the constant. Past 1 the
          // object continues along its segment rather than stopping to wait.
          const alpha = Math.min(
            TWEEN_MAX_ALPHA,
            Math.max(0, (performance.now() - frameStart) / frameSpan),
          );

          for (const rec of sats.values()) {
            Cesium.Cartesian3.lerp(rec.prev, rec.next, alpha, rec.cur);
            // A straight lerp cuts the chord, which over a 120x tick sinks the
            // object a kilometre toward the Earth and back. Restoring the
            // interpolated radius puts it back on its arc.
            const want =
              Cesium.Cartesian3.magnitude(rec.prev) +
              (Cesium.Cartesian3.magnitude(rec.next) - Cesium.Cartesian3.magnitude(rec.prev)) * alpha;
            const have = Cesium.Cartesian3.magnitude(rec.cur);
            if (have > 1) Cesium.Cartesian3.multiplyByScalar(rec.cur, want / have, rec.cur);
            rec.position.setValue(rec.cur);

            // Attitude only for what is actually drawn as a model. The
            // direction of travel comes from the two snapshots the tween is
            // already interpolating between, so it costs a subtraction; a
            // stalled clock leaves the last attitude standing rather than
            // snapping the spacecraft to a default heading.
            if (!rec.modelled) continue;

            // Constant apparent size. Measured against the model's true radius
            // rather than its drawn one, so the answer does not depend on the
            // answer from the previous frame.
            modelSphere.center = rec.cur;
            const wantedM =
              SATELLITE_PIXELS *
              v.camera.getPixelSize(
                modelSphere,
                v.scene.drawingBufferWidth,
                v.scene.drawingBufferHeight,
              );
            // Never smaller than the real spacecraft, never larger than the cap.
            const drawnM = Math.min(
              Math.max(wantedM, SATELLITE_MODEL_DIAMETER_M),
              SATELLITE_MAX_DIAMETER_M,
            );
            rec.scale.setValue(drawnM / SATELLITE_MODEL_DIAMETER_M);

            Cesium.Cartesian3.subtract(rec.next, rec.prev, scratchVelocity);
            if (Cesium.Cartesian3.magnitudeSquared(scratchVelocity) < 1) continue;
            /* MUST be a unit vector.
             *
             * `rotationMatrixFromPositionVelocity` does not normalise what it
             * is given: it writes the velocity STRAIGHT into the matrix's first
             * column and only normalises the right and up columns it derives
             * (Transforms.js). Hand it a displacement in metres — which is what
             * differencing two snapshots produces, ~1.9 km at 1x and ~113 km at
             * 60x — and the result is not a rotation but a rotation with that
             * magnitude scaled onto one axis. `Quaternion.fromRotationMatrix`
             * then returns a NON-UNIT quaternion, and `Matrix3.fromQuaternion`
             * expands a non-unit q into R·|q|², so the model matrix picks up a
             * spurious uniform scale of ~470x at 1x and ~28 000x at 60x on top
             * of the scale computed below.
             *
             * That single missing normalise was three bugs: the spacecraft grew
             * to tens of thousands of kilometres and swallowed the camera, so
             * models vanished the moment the clock started (stopped, prev ===
             * next, the guard above skips this and the initial unit quaternion
             * survives — which is why it only broke on Start), and zooming in
             * put the eye inside that shell, where the bus material — unlit,
             * double-sided, base colour #ccd1d9 — reads as a flat white field
             * with the beams and labels still drawn over it.
             *
             * Cesium's own `VelocityOrientationProperty` normalises before
             * calling this for exactly this reason. */
            Cesium.Cartesian3.normalize(scratchVelocity, scratchVelocity);
            Cesium.Transforms.rotationMatrixFromPositionVelocity(
              rec.cur,
              scratchVelocity,
              Cesium.Ellipsoid.WGS84,
              scratchRotation,
            );
            rec.orientation.setValue(
              Cesium.Quaternion.fromRotationMatrix(scratchRotation, scratchQuaternion),
            );
          }

          /* ---- the clusters ----
           * One pool slot per drawn target, in the order the ingest chose.
           * Slots past the end of that list are hidden rather than destroyed:
           * a pass setting and another rising is the normal case, and tearing
           * down twelve entities to build twelve more would thrash exactly the
           * primitive batches this whole file is arranged to keep stable. */
          for (let slot = 0; slot < clusters.length; slot++) {
            const c = clusters[slot];
            const id = drawnIds[slot];
            const rec = id ? sats.get(id) : undefined;
            if (!rec) {
              hideCluster(c);
              continue;
            }
            drawCluster(c, rec, id, slot === 0);
          }
        };

        /**
         * Draw one target's six beams.
         *
         * `primary` is the selection: full-strength styling and the six axes
         * back to the dome. Everything else is drawn back, so a dozen clusters
         * still has a subject.
         */
        const drawCluster = (
          c: ClusterRender,
          rec: SatRender,
          id: string,
          primary: boolean,
        ) => {
          // Where the spacecraft actually is, read back off the tweened
          // position so the geometry is smooth and self-consistent rather than
          // lagging behind the dot it is drawn around.
          const look = lookFromSite(rec.cur);

          /* ---- the cluster is drawn about the COMMANDED direction ----
           *
           * Not about the spacecraft. The array is steered to a predicted
           * direction and holds it; the target keeps moving and walks off that
           * direction until the pointing is re-issued. Drawing the cluster on
           * the live position would hide exactly that error and make the four
           * squinted beams look like decoration around a dot that is always
           * dead centre — when the reason they exist is that it is not.
           *
           * Falling back to the target's own direction covers the frame
           * between a pass being assigned beams and the store latching a
           * commanded direction for it.
           */
          const commanded = pointings[id];
          const dirs = beamDirections(
            commanded ? commanded.azimuthDeg : look.azimuthDeg,
            commanded ? commanded.elevationDeg : look.elevationDeg,
          );

          // Which beam is holding the target right now, in true angles —
          // the data beam rides it, so this is decided before any drawing
          // scale is applied.
          const holding = carryingBeamIndex(dirs, look.azimuthDeg, look.elevationDeg);

          /* ---- how big to draw the footprints ----
           *
           * At true scale a 4.5° beam at 2 000 km is a 157 km circle — legible
           * from a close approach, and a fraction of a pixel from the 34 000 km
           * overview, where the cluster would silently collapse back into the
           * dot it is drawn to explain.
           *
           * So the picture is magnified ABOUT THE SPACECRAFT: footprint radii,
           * the squint offsets, and the target's own offset from the commanded
           * direction all by the same factor. Magnifying the beams alone would
           * leave the target's true drift unscaled and float the dot outside a
           * cluster that is supposed to contain it. The factor floors at 1, so
           * a close-up is the honest geometry, and is capped so an overview
           * cannot draw a cluster wider than the pass it belongs to.
           */
          const trueSumM = look.rangeKm * 1000 * Math.tan(Cesium.Math.toRadians(RING_HALF_DEG[0]));
          ringSphere.center = rec.cur;
          const metresPerPixel = v.camera.getPixelSize(
            ringSphere,
            v.scene.drawingBufferWidth,
            v.scene.drawingBufferHeight,
          );
          const cluster = Math.min(
            Math.max(1, (metresPerPixel * RING_MIN_PIXELS) / trueSumM),
            RING_MAX_MAGNIFICATION,
          );

          for (let i = 0; i < 6; i++) {
            // The data beam has no direction of its own: it is steered onto
            // whichever tracking beam the spacecraft is in, because that is
            // the beam the downlink is actually arriving through.
            const dir = dirs[i === 5 ? holding : i];
            const end = c.ends[i];
            enuToWorld(
              look.azimuthDeg + wrapDeg(dir.azimuthDeg - look.azimuthDeg) * cluster,
              look.elevationDeg + (dir.elevationDeg - look.elevationDeg) * cluster,
              look.rangeKm,
              end,
            );
            buildRing(
              end,
              look.rangeKm * 1000 * Math.tan(Cesium.Math.toRadians(RING_HALF_DEG[i])) * cluster,
              c.ringPositions[i],
            );
          }

          /* ---- styling ----
           * Written only when it actually changes. A material or width
           * assignment rebuilds a polyline's appearance, and with twelve
           * clusters there are seventy-two of them — doing that every frame to
           * say nothing is the difference between this being free and this
           * being the frame budget. */
          if (c.primary !== primary || !c.shown) {
            const level = primary ? RING_STYLE.primary : RING_STYLE.secondary;
            for (let i = 0; i < 6; i++) {
              c.axes[i].show = primary;
              c.rings[i].show = true;
              const line = c.rings[i].polyline;
              if (!line) continue;
              line.material = i === 5 ? level.data : level.idle;
              line.width = primary ? RING_WIDTH[i].base : RING_WIDTH[i].dim;
            }
            c.primary = primary;
            c.shown = true;
            // The highlight below is written relative to the styling above, so
            // it has to be re-applied after a level change rather than skipped
            // because the carrying beam happens not to have moved.
            c.carrying = -1;
          }

          if (holding !== c.carrying) {
            const level = primary ? RING_STYLE.primary : RING_STYLE.secondary;
            if (c.carrying >= 0 && c.rings[c.carrying].polyline) {
              c.rings[c.carrying].polyline!.material = level.idle;
              c.rings[c.carrying].polyline!.width = primary
                ? RING_WIDTH[c.carrying].base
                : RING_WIDTH[c.carrying].dim;
            }
            const held = c.rings[holding].polyline;
            if (held) {
              held.material = level.hold;
              // One tier up from whatever this cluster's idle weight is, so the
              // handover stays visible in a dimmed cluster without shouting.
              held.width = primary ? RING_WIDTH[holding].lit : RING_WIDTH[holding].base;
            }
            c.carrying = holding;
          }
        };
        v.scene.preUpdate.addEventListener(drawFrame);

        /* ---- click to select ----
         * Picking a satellite makes it the active target, which drives the
         * beam cluster here and the readouts in every other panel. Without
         * this the operator can see forty objects and interrogate none of them.
         */
        const handler = new Cesium.ScreenSpaceEventHandler(v.scene.canvas);
        handler.setInputAction((movement: { position: CesiumNS.Cartesian2 }) => {
          const picked = v.scene.pick(movement.position);
          const id = picked?.id;
          if (!id) return;
          for (const [satId, rec] of sats) {
            if (rec.entity === id) {
              useSimStore.getState().selectSatellite(satId);
              return;
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Far enough out that most of the 70-object catalogue is in frame.
        // At 12 000 km the globe fills the view and the constellation reads as
        // a handful of dots, because everything past the limb is occluded —
        // which looked like a missing catalogue rather than a near-side view.
        const HOME = {
          destination: Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg - 12, 34_000_000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-80), roll: 0 },
        };
        v.camera.setView(HOME);

        const streetLayer = Cesium.ImageryLayer.fromProviderAsync(
          Promise.resolve(new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })),
          {},
        );

        onReadyRef.current?.({
          resetView: () => v.camera.flyTo({ ...HOME, duration: 0.8 }),
          focusSite: () =>
            v.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(SITE.lonDeg, SITE.latDeg - 8, 5_200_000),
              orientation: { heading: 0, pitch: Cesium.Math.toRadians(-65), roll: 0 },
              duration: 0.9,
            }),
          fitAll: () => {
            void v.flyTo(v.entities, { duration: 0.9 });
          },
          zoomToTarget: () => {
            const target = activeTarget(useSimStore.getState());
            if (!target) return;
            const rec = sats.get(target.id);
            if (!rec) return;
            // `flyTo` on an entity frames it with a sensible standoff and
            // handles the fact that the point has no extent of its own.
            void v.flyTo(rec.entity, {
              duration: 0.9,
              offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-25), 900_000),
            });
          },
          setFollowTarget: (follow: boolean) => {
            if (!follow) {
              v.trackedEntity = undefined;
              return;
            }
            const target = activeTarget(useSimStore.getState());
            if (!target) return;
            // trackedEntity keeps the camera locked on as the object moves —
            // the only way to watch a 7 km/s pass without chasing it by hand.
            v.trackedEntity = sats.get(target.id)?.entity;
          },
          setFenceVisible: (visible: boolean) => {
            for (const e of fenceEntities) e.show = visible;
          },
          setLabelsVisible: (visible: boolean) => {
            // Held as state, not stamped once: the per-tick pass decides which
            // satellites deserve a label, and would otherwise undo this on the
            // next tick.
            labelsVisible = visible;
            for (const rec of sats.values()) {
              const show = visible && rec.labelled;
              if (rec.entity.label) rec.entity.label.show = new Cesium.ConstantProperty(show);
              rec.labelled = show;
            }
          },
          setBasemap: (basemap: Basemap) => {
            const layers = v.imageryLayers;
            const hasStreet = layers.contains(streetLayer);
            if (basemap === "street" && !hasStreet) layers.add(streetLayer);
            if (basemap === "satellite" && hasStreet) layers.remove(streetLayer, false);
          },
          setProjection: (projection: Projection) => {
            if (projection === "2d") v.scene.morphTo2D(0.8);
            else v.scene.morphTo3D(0.8);
          },
        });

        // Paint whatever the store already holds, so a globe mounted mid-run
        // is populated on its first frame.
        const s = useSimStore.getState();
        apiRef.current.update(
          s.states,
          new Set(s.plan.assignments.map((a) => a.satelliteId)),
          activeTarget(s),
        );
      } catch (err) {
        if (!cancelled) setFailed(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      apiRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  // Push every simulation tick into the scene. Subscribing outside React's
  // render cycle keeps 4 Hz of telemetry from re-rendering the M&C board.
  useEffect(() => {
    return useSimStore.subscribe((s) => {
      apiRef.current?.update(
        s.states,
        new Set(s.plan.assignments.map((a) => a.satelliteId)),
        activeTarget(s),
      );
    });
  }, []);

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center px-[1rem] text-center">
        <span className="text-2xs font-semibold text-da-muted">Globe unavailable — {failed}</span>
      </div>
    );
  }

  return <div ref={hostRef} className="size-full [&_.cesium-viewer-bottom]:hidden" />;
}
