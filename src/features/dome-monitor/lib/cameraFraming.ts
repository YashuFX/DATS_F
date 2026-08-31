/**
 * Camera framing math — geometry-in, numbers-out, no React/store access.
 *
 * WHICH WAY to look when a face is selected is a face's own measured
 * boresight (`azimuthDeg`/`elevationDeg`, real geometry from Must_cord.xlsx)
 * plus a tighter distance. That's the whole job of this module.
 *
 * ONE angle convention, defined here and used by everything that frames the
 * camera — `frameToPosition` below is the only place a CameraFrame ever
 * becomes a world position, so there is nowhere for a second convention to
 * hide. See its comment for the two bugs that came from having had one.
 *
 * The "shift the dome into the left half for the detail panel" effect is
 * deliberately NOT here, and deliberately NOT done by biasing the orbit
 * target sideways — an earlier version did exactly that, and it broke free
 * rotation: OrbitControls always orbits around `target`, so an off-centre
 * target meant every drag pivoted around empty space near the dome instead
 * of the dome itself, which reads as "stuck"/"rotating from the wrong
 * point". The target here is always the dome's true centre, at every
 * selection state, so orbiting stays natural always.
 *
 * The left-shift instead lives in DomeScene.tsx as a `camera.setViewOffset`
 * projection-level crop (see the comment there) — a pure post-projection
 * shift that has no opinion about, and no effect on, where the camera
 * orbits around. `viewportFraming` below computes the numbers that crop
 * needs; DomeScene only applies them.
 */

import type { Face } from "../types";
import {
  FACE_FRAME_DISTANCE,
  FACE_FRAME_MAX_ELEVATION,
  CAMERA_BASE_FOV,
  CAMERA_MAX_FIT_FOV,
  DOME_FIT_RADIUS,
  MAX_OBSTRUCTED_FRACTION,
} from "../config";

export interface CameraFrame {
  azimuth: number;
  elevation: number;
  distance: number;
  target: [number, number, number];
}

/** The dome's true centre — where every preset, selected or not, looks. */
export const DOME_CENTER_TARGET: [number, number, number] = [0, 0, 0.5];

/** The dome's axis. Z, not three.js's default Y — see DomeScene's `camera.up`. */
export const DOME_UP: [number, number, number] = [0, 0, 1];

/**
 * Spherical framing -> world position, in the ONE convention this feature
 * uses: azimuth CCW from +X in the XY plane, elevation up from that plane,
 * +Z at the zenith. That is exactly `atan2(n.y, n.x)` / `asin(n.z)` of a face
 * normal — which is how `Face.azimuthDeg`/`Face.elevationDeg` are derived in
 * the generated geometry — so `frameToPosition(faceFrame(face))` puts the
 * camera on that face's outward normal and nowhere else.
 *
 * Two bugs used to live in the inline version of this, and both read to an
 * operator as "the tile I clicked isn't facing me":
 *
 *   1. It computed `x = sin(az), y = cos(az)`: a COMPASS azimuth (0 = +Y,
 *      clockwise) fed from face data that is a MATH azimuth (0 = +X,
 *      counter-clockwise). Mixing the two reflects the direction about the
 *      45° line — az -> 90 - az — so face 18 (az 180°) was framed from 270°
 *      and face 21 from 154° away, i.e. from the far side of the dome. Only
 *      the reflection's two fixed points were ever framed correctly; the
 *      mean error over the 26 present faces was 72°.
 *
 *   2. It anchored that position at the WORLD ORIGIN while OrbitControls
 *      orbits `target` (0, 0, 0.5). The camera has to sit on the ray leaving
 *      the target or the boresight isn't the one that was asked for (a
 *      further ~3° at FACE_FRAME_DISTANCE), and `distance` stops being the
 *      distance-to-target that fitFov, the semantic-zoom thresholds and
 *      OrbitControls' own min/max clamp all read it as.
 */
export function frameToPosition(frame: CameraFrame): [number, number, number] {
  const az = (frame.azimuth * Math.PI) / 180;
  const el = (frame.elevation * Math.PI) / 180;
  const d = frame.distance;
  const horizontal = d * Math.cos(el);

  return [
    frame.target[0] + horizontal * Math.cos(az),
    frame.target[1] + horizontal * Math.sin(az),
    frame.target[2] + d * Math.sin(el),
  ];
}

/**
 * The inverse of `frameToPosition` — where the camera currently sits, read
 * back as the same azimuth/elevation pair.
 *
 * Its whole reason to exist is that it is defined HERE, next to the forward
 * transform, out of the same trigonometry. The orbit puck both displays the
 * camera's heading and commands a new one; if the read-back were derived
 * anywhere else it would be a second convention by another name, which is
 * the exact mistake documented above.
 *
 * Azimuth comes back in [0, 360) because that is what a compass readout
 * wants; `frameToPosition` accepts any value, so the round trip holds.
 */
export function positionToOrientation(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
): { azimuth: number; elevation: number } {
  const dx = position[0] - target[0];
  const dy = position[1] - target[1];
  const dz = position[2] - target[2];
  const radius = Math.hypot(dx, dy, dz);
  if (radius < 1e-9) return { azimuth: 0, elevation: 0 };

  const azimuth = (((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360;
  const elevation = (Math.asin(Math.max(-1, Math.min(1, dz / radius))) * 180) / Math.PI;
  return { azimuth, elevation };
}

/** Keep a hand-driven orbit inside the same safe band a face frame uses. */
export function clampOrbitElevation(elevationDeg: number): number {
  return Math.max(-FACE_FRAME_MAX_ELEVATION, Math.min(FACE_FRAME_MAX_ELEVATION, elevationDeg));
}

/** Framing for a selected face: orbit onto its real boresight, dolly in. */
export function faceFrame(face: Face): CameraFrame {
  return {
    azimuth: face.azimuthDeg,
    // Keep the framing off the poles. At elevation ±90° the camera sits on
    // the up axis, where azimuth stops meaning anything and both `lookAt`
    // and OrbitControls' spherical coords degenerate. Only the zenith
    // pentagon (face 27, elevation exactly +90°) hits this, and it lands 5°
    // off boresight rather than rolling unpredictably; the -90° side is the
    // absent foot, so the lower clamp never binds on a selectable face.
    elevation: clampOrbitElevation(face.elevationDeg),
    distance: FACE_FRAME_DISTANCE,
    target: DOME_CENTER_TARGET,
  };
}

/** The default, centred framing used whenever nothing is selected. */
export function centeredFrame(azimuth: number, elevation: number, distance: number): CameraFrame {
  return { azimuth, elevation, distance, target: DOME_CENTER_TARGET };
}


/* ---------------------------------------------------------------------------
   Viewport fit — how the dome is framed inside the part of the canvas the
   operator can actually see.

   The detail panel OVERLAYS the canvas (DomeScreen: "the canvas never
   resizes when the panel opens"), so R3F keeps reporting the full canvas
   size while up to ~46% of it is covered. Nothing in the render pipeline
   notices; the framing has to be told.
--------------------------------------------------------------------------- */

export interface ViewportFraming {
  /** Vertical FOV in degrees to render at. */
  fov: number;
  /** Canvas width, in px, hidden behind the detail panel (0 when closed). */
  obstructedPx: number;
  /** Width, in px, of the strip the dome must fit inside. */
  visibleWidthPx: number;
}

/**
 * Vertical FOV that keeps a DOME_FIT_RADIUS sphere at `distance` inside a
 * `visibleWidth x height` px region.
 *
 * A perspective camera's FOV is VERTICAL, so at a fixed distance the dome's
 * on-screen size tracks canvas height and ignores width entirely. That is
 * fine while the visible strip is wider than it is tall — the usual case,
 * where this returns CAMERA_BASE_FOV unchanged and the framing is exactly
 * as authored. It stops being fine once the panel narrows the strip past
 * square (tall window, portrait, or an operator scale cranked up in
 * Settings), where the dome would grow sideways into the panel with nothing
 * to stop it.
 *
 * Widening the FOV rather than dollying back is deliberate: distance is the
 * user's (OrbitControls zoom) and the preset animation's, and a resize that
 * fought either would feel like the camera moving on its own. FOV is nobody
 * else's, so it can snap instantly on resize with no animation to fight.
 */
export function fitFov(visibleWidth: number, height: number, distance: number): number {
  if (!(visibleWidth > 0) || !(height > 0) || !(distance > 0)) return CAMERA_BASE_FOV;

  // Half-extent the frustum must cover at `distance`, as a tangent. The
  // width term only binds when the strip is narrower than it is tall.
  const requiredTan = (DOME_FIT_RADIUS / distance) * Math.max(1, height / visibleWidth);
  const requiredFov = 2 * Math.atan(requiredTan) * (180 / Math.PI);

  return Math.min(CAMERA_MAX_FIT_FOV, Math.max(CAMERA_BASE_FOV, requiredFov));
}

/**
 * Full framing for one canvas size + panel width + camera distance.
 *
 * `panelWidth` is the MEASURED width of the rendered panel, not a recomputed
 * copy of PANEL_WIDTH_CSS — see the comment on that constant for why a
 * second copy of the clamp cannot be kept honest.
 */
export function viewportFraming(
  canvasWidth: number,
  canvasHeight: number,
  panelWidth: number,
  distance: number,
  panelOpen: boolean,
): ViewportFraming {
  const obstructedPx = panelOpen
    ? Math.max(0, Math.min(panelWidth, canvasWidth * MAX_OBSTRUCTED_FRACTION))
    : 0;
  const visibleWidthPx = Math.max(1, canvasWidth - obstructedPx);

  return {
    fov: fitFov(visibleWidthPx, canvasHeight, distance),
    obstructedPx,
    visibleWidthPx,
  };
}
