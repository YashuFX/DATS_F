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
 * orbits around.
 */

import type { Face } from "../types";
import { FACE_FRAME_DISTANCE } from "../config";

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
