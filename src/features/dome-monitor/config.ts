/**
 * Dome Monitor configuration — camera presets, thresholds, colour semantics.
 */

import type { CameraPreset } from "./types";

/* ---------- camera ---------- */

/** Distance clamp in metres. */
export const CAMERA_MIN_DISTANCE = 4.5;
export const CAMERA_MAX_DISTANCE = 30;
/** Default framing (no selection) — closer than before so the dome reads
 *  as the hero of the screen; FACE_FRAME_DISTANCE (selected-face framing)
 *  is unchanged. */
export const CAMERA_DEFAULT_DISTANCE = 8;

/** Transition timing in ms for preset changes. */
export const CAMERA_TRANSITION_MS = 450;

/**
 * Semantic zoom, not geometric LOD (PHASEPLAN §4 tech stack): at the distance
 * where the dome fills the viewport, elements are already ~9 px apart, so you
 * never zoom out far enough for a geometric LOD to help. Past this distance
 * each face instead hides its 7 557-instance dot layer and shows an
 * aggregate status texture — cheaper, and legible where 7 557 anti-aliased
 * sub-pixel dots would just read as noise.
 *
 * Two thresholds, not one: once the face-select camera reframe animates
 * `target` as well as `position` (see cameraFraming.ts), distance-to-target
 * is no longer guaranteed to change monotonically over the transition. A
 * single threshold could flip the 7 557-instance layer on and off more than
 * once mid-animation; this hysteresis band means it only flips once you're
 * clearly on one side or the other.
 */
export const ELEMENT_VISIBILITY_SHOW_DISTANCE = 13;
export const ELEMENT_VISIBILITY_HIDE_DISTANCE = 15;

/** Framing distance used when a face is selected — close enough to read the
 *  selected face clearly, far enough that the whole dome silhouette (not
 *  just one face filling the frame) still fits in the left half. */
export const FACE_FRAME_DISTANCE = 9.5;

/**
 * Projection-level left-shift applied via `camera.setViewOffset` while a
 * face is selected (see DomeScene.tsx) — NOT a change to where the camera
 * orbits around (that stays the dome's true centre always, so free rotation
 * never feels "stuck" around an artificial pivot). This is the ratio of a
 * virtual widened frame to the real canvas width: 1.0 = no shift; 1.25 means
 * the camera renders as if its sensor were 25% wider than the canvas, with
 * the real canvas aligned to the right edge of that wider sensor — which
 * pushes the (still dead-centre-targeted) dome toward the left of the
 * visible frame by roughly half that extra width. Tuned by eye.
 */
export const VIEWPORT_SHIFT_RATIO = 1.28;

/**
 * Detail panel width — roughly half the viewport, per spec, clamped so it
 * stays readable at 1366px and doesn't sprawl at 2560px+.
 */
export const PANEL_WIDTH_CSS = "clamp(24rem, 50%, 44rem)";

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "iso",   label: "ISO",   azimuth:  35, elevation:  25, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "top",   label: "TOP",   azimuth:   0, elevation:  89, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "north", label: "N",     azimuth:   0, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "east",  label: "E",     azimuth:  90, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "south", label: "S",     azimuth: 180, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "west",  label: "W",     azimuth: 270, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
];

/* ---------- health thresholds ---------- */

export const THRESHOLDS = {
  phaseJitterDeg: 12,
  gainJitterDb: 0.25,
  vswrMax: 1.5,
  tempWarnC: 50,
  tempCritC: 65,
} as const;

/* ---------- dome constants ---------- */

/** Circumradius of the truncated icosahedron (metres). */
export const DOME_CIRCUMRADIUS = 3.0;

/** Edge length of the truncated icosahedron (metres). */
export const DOME_EDGE_LENGTH = 1.210645;

/** Total face count of a full truncated icosahedron. */
export const TOTAL_FACE_COUNT = 32;

/** Faces present in Must_cord.xlsx. */
export const PRESENT_FACE_COUNT = 26;

/** FceNum values absent from the data (bottom cap). */
export const ABSENT_FACE_NUMS = [1, 4, 7, 9, 10, 11] as const;

/** All FceNum values present in the data. */
export const PRESENT_FACE_NUMS = [
  2, 3, 5, 6, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

/* ---------- element counts ---------- */

export const PENTAGON_ELEMENT_COUNT = 177;
export const HEXAGON_ELEMENT_COUNT = 374;
export const TOTAL_ELEMENT_COUNT = 7557;

/* ---------- health colour tokens ---------- */

/**
 * Face shell colours — intentionally neutral when healthy.
 * Colour means deviation from nominal, not status confirmation.
 */
export const FACE_COLOURS = {
  nominal:  { fill: "#3a4556", edge: "#4f6175" },
  degraded: { fill: "#7a5c2e", edge: "#c4922e" },
  critical: { fill: "#7a2e2e", edge: "#c44040" },
  offline:  { fill: "#252d38", edge: "#3a4556" },
  selected: { edge: "#2dd4bf" },
  hovered:  { fill: "#455568" },
  absent:   { fill: "#1a2230", edge: "#2a3545" },
} as const;

/** Element point colours per health state. */
export const ELEMENT_COLOURS = {
  nominal:  "#5a6a7e",
  degraded: "#fbbf24",
  critical: "#f87171",
  offline:  "#2a3545",
} as const;

/** Selection highlight — kept off the nominal/brand hue (trap T5): selection
 *  and "healthy" must never share a colour, or hue stops meaning anything. */
export const SELECTED_ELEMENT_COLOUR = "#2dd4bf";

/**
 * Continuous ramp anchors for analysis modes (Gain / Phase / Temp). These are
 * literal hex, not CSS custom properties — three.js materials read raw
 * colour values, not the DOM cascade, so the app's `var(--color-*)` tokens
 * can't reach the GPU. Interpolation happens in OKLab (see colorRamp.ts) so
 * a ramp's midpoint looks like a perceptual midpoint.
 */
export const GAIN_RAMP: readonly [string, string] = ["#3b82f6", "#f59e0b"];
export const TEMP_RAMP: readonly [string, string] = ["#3b82f6", "#ef4444"];
/** Normalised-gain and temperature bounds the two linear ramps map onto. */
export const GAIN_RAMP_RANGE: readonly [number, number] = [0, 1];
export const TEMP_RAMP_RANGE: readonly [number, number] = [20, THRESHOLDS.tempCritC];
