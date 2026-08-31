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

/**
 * Face selected when the console opens with nothing in the URL.
 *
 * The board is more useful with a face already in hand than empty: the M&C
 * Health Overview's element grid and the Health Preview's parameter table are
 * both scoped to a selection, so an unselected default greets the operator
 * with two panels asking them to pick something before either says anything.
 *
 * `?face=` still wins — the URL is hydrated after the store is constructed
 * (useSelectionUrlSync), so a shared link or a reload lands where it should
 * and this only fills the gap when there is no instruction.
 *
 * Must be a member of PRESENT_FACE_NUMS; the 6 foot faces carry no data.
 */
export const DEFAULT_SELECTED_FACE = 8;

/** Framing distance used when a face is selected — close enough to read the
 *  selected face clearly, far enough that the whole dome silhouette (not
 *  just one face filling the frame) still fits in the left half. */
export const FACE_FRAME_DISTANCE = 9.5;

/**
 * How far off the horizon a face may be framed from, in degrees.
 *
 * At ±90° the camera sits on the up axis, where azimuth is undefined and
 * both `lookAt` and OrbitControls' spherical coordinates degenerate — the
 * view would roll to an arbitrary angle and a drag would flip it. 85° keeps
 * a 5° margin. Only face 27, the zenith pentagon, is clamped by it.
 */
export const FACE_FRAME_MAX_ELEVATION = 85;

/** Vertical FOV the camera is authored at (DomeCanvas creates it with this). */
export const CAMERA_BASE_FOV = 50;

/**
 * Widest the fit-guard may open the vertical FOV to when the visible strip
 * of the viewport is too narrow to hold the dome (see `fitFov` in
 * lib/cameraFraming.ts). Past ~70 deg the perspective exaggeration starts
 * reading as fisheye — better a dome that crowds its strip than one that
 * looks like a different instrument.
 */
export const CAMERA_MAX_FIT_FOV = 70;

/**
 * Bounding radius the fit-guard keeps on screen, in metres. Larger than the
 * dome's actual silhouette radius (~2.83 m — DOME_CIRCUMRADIUS is the vertex
 * bound, and the bottom cap is absent) so "fits" means fits with breathing
 * room, not hugging the edge.
 */
export const DOME_FIT_RADIUS = 3.36;

/**
 * Ceiling on how much of the canvas the detail panel is allowed to count as
 * obstructed, as a fraction of canvas width. PANEL_WIDTH_CSS is normally at
 * most 50%, but its `clamp()` floor (24rem) can exceed that on a narrow
 * card — without this cap the framing would shove the dome off the left
 * edge chasing a strip barely wider than the panel.
 */
export const MAX_OBSTRUCTED_FRACTION = 0.6;

/**
 * Detail panel width — roughly half the viewport, per spec, clamped so it
 * stays readable at 1366px and doesn't sprawl at 2560px+.
 *
 * Nothing recomputes this clamp in JS. It resolves against a root font-size
 * that is itself viewport-derived (`min(1.1111vw, 1.8223vh)`, globals.css),
 * so on any viewport taller than ~16:10 the panel's share of the card grows
 * with HEIGHT while the canvas width stays put — 38% of the card windowed
 * vs 46% in fullscreen at 1920x1080. The 3D framing therefore measures the
 * rendered panel (DetailPanel -> domeStore.panelWidth) instead of holding a
 * second copy of this rule that would drift the moment either value is
 * retuned. An earlier version shifted the dome by a fixed fraction of canvas
 * width, which is exactly the assumption this comment exists to kill.
 */
export const PANEL_WIDTH_CSS = "clamp(24rem, 50%, 44rem)";

/**
 * Preset framings, in the SAME angle convention as the face geometry:
 * azimuth counter-clockwise from +X, elevation up from the XY plane, +Z at
 * the zenith (see `frameToPosition` in lib/cameraFraming.ts, the one place
 * these become a world position). The compass labels name world axes —
 * +Y is North, +X is East — which is why N reads 90 and E reads 0 rather
 * than the other way round.
 *
 * They were previously authored in a second, compass convention (0 = +Y,
 * clockwise) that only the scene's own inline maths spoke. That is what made
 * face framing point at the wrong face, and it left N and S degenerate: at
 * elevation 0 both put the camera on ±Y, which under the old Y-up camera was
 * the up vector itself, so `lookAt` had no defined roll.
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "iso",   label: "ISO",   azimuth:  55, elevation:  25, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "top",   label: "TOP",   azimuth:  90, elevation:  85, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "north", label: "N",     azimuth:  90, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "east",  label: "E",     azimuth:   0, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "south", label: "S",     azimuth: 270, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
  { id: "west",  label: "W",     azimuth: 180, elevation:   0, distance: CAMERA_DEFAULT_DISTANCE },
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
