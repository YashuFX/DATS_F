/**
 * Camera framing math — geometry-in, numbers-out, no React/store access.
 *
 * WHICH WAY to look when a face is selected is a face's own measured
 * boresight (`azimuthDeg`/`elevationDeg`, real geometry from Must_cord.xlsx)
 * plus a tighter distance. That's the whole job of this module.
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

/** Framing for a selected face: orbit toward its real boresight, dolly in. */
export function faceFrame(face: Face): CameraFrame {
  return {
    azimuth: face.azimuthDeg,
    // Keep the framing inside a sane viewing band — a face at the pole
    // (±90°) would otherwise put the camera looking straight down/up.
    elevation: Math.max(-65, Math.min(75, face.elevationDeg)),
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
