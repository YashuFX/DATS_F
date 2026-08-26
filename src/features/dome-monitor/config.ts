/**
 * Dome Monitor configuration — camera presets, thresholds, colour semantics.
 */

import type { CameraPreset } from "./types";

/* ---------- camera ---------- */

/** Distance clamp in metres. */
export const CAMERA_MIN_DISTANCE = 4.5;
export const CAMERA_MAX_DISTANCE = 30;
export const CAMERA_DEFAULT_DISTANCE = 9;

/** Transition timing in ms for preset changes. */
export const CAMERA_TRANSITION_MS = 450;

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
