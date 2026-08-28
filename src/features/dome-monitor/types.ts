/**
 * Domain types for the Dome Monitor.
 *
 * The dome is a truncated icosahedron (soccer ball) with 32 faces — 12 pentagons
 * and 20 hexagons — of which 26 are present (the bottom 6 are the removed foot).
 * Each face carries a planar lattice of antenna elements: 177 per pentagon,
 * 374 per hexagon, totalling 7 557 elements.
 *
 * The confirmed hierarchy is Array → Face → Element.  LRU / Tile / Sub-array
 * levels are designed for but absent from the data — they light up when the
 * client supplies the element-to-LRU map.
 */

/* ---------- health ---------- */

export type HealthId = "nominal" | "degraded" | "critical" | "offline";

/**
 * Colour tokens for the four health states.
 *
 * `nominal` is deliberately NOT `da-success` (green) — the dome is neutral
 * grey until something is wrong, and colour means deviation. Leading with
 * green for "fine" destroys peripheral-vision alarm detection across a
 * 26-face grid: a wash of green reads as "healthy" whether you looked or not.
 * `offline` gets its own token rather than reusing the nominal grey — a
 * missing reading must never be visually mistaken for a healthy one.
 */
export const HEALTH_META: Record<
  HealthId,
  { label: string; token: string; priority: number }
> = {
  nominal:  { label: "Nominal",  token: "da-label",   priority: 0 },
  degraded: { label: "Degraded", token: "da-warn",    priority: 1 },
  critical: { label: "Critical", token: "da-danger",  priority: 2 },
  offline:  { label: "Offline",  token: "da-offline", priority: 3 },
};

/* ---------- geometry ---------- */

export type FaceKind = "pentagon" | "hexagon";

/** One of the 32 faces of the truncated icosahedron (26 present + 6 absent). */
export interface Face {
  /** 1-based index from Must_cord.xlsx (1..32). */
  fceNum: number;
  kind: FaceKind;
  /** Number of elements on this face (177 or 374). */
  elementCount: number;
  /** Unit normal pointing outward from the dome centre. */
  normal: [number, number, number];
  /** Centroid position in dome-local coordinates (metres). */
  centroid: [number, number, number];
  /** Distance from the origin to the face plane (metres). */
  planeDistance: number;
  /** Polygon vertices in dome-local coordinates, ordered for winding. */
  polygon: [number, number, number][];
  /** Whether this face is present in the data (false = bottom cap). */
  present: boolean;
  /** Azimuth of the face boresight in degrees (0 = +X axis). */
  azimuthDeg: number;
  /** Elevation of the face boresight in degrees (+90 = zenith). */
  elevationDeg: number;
}

/** An element position in the face's local (u, v) coordinate frame. */
export interface ElementUV {
  u: number;
  v: number;
}

/* ---------- telemetry ---------- */

export interface ElementTelemetry {
  health: HealthId;
  /** Excitation amplitude, 0..1 of full scale. NOT antenna gain. */
  amplitude: number;
  /** Measured phase, −180..+180 degrees. Dominated by the beam-steering
   *  taper across the face, so this is a picture of the COMMAND, not of
   *  calibration health — see `phaseErrorDeg` for that. */
  phase: number;
  /**
   * Calibration residual: measured phase minus commanded phase, in degrees.
   *
   * This, not `phase`, is the number that says whether the aperture is
   * calibrated. The spread of raw `phase` across a face is the steering
   * ramp — large, expected, and identical on a perfectly healthy array —
   * so an RMS taken over it measures where the beam points, not how well
   * the face is behaving. Phase error is also what drives the Ruze gain
   * loss (exp(-sigma^2)) and the sidelobe floor.
   */
  phaseErrorDeg: number;
  /** Celsius. */
  tempC: number;
}

export interface FaceTelemetry {
  fceNum: number;
  health: HealthId;
  /** Number of elements online. */
  online: number;
  /** Total elements on this face. */
  total: number;
  availabilityPercent: number;
  /**
   * Mean element excitation across the face, in dB relative to full scale.
   *
   * Named for what it is. It was `meanGainDb`, which reads as antenna gain
   * (dBi) — a different quantity by orders of magnitude, and one this
   * dashboard cannot compute: array gain needs the element pattern, the
   * lattice, and the taper, none of which are in the feed.
   */
  meanExcitationDb: number;
  /** RMS of the per-element calibration residual, in degrees. See
   *  ElementTelemetry.phaseErrorDeg for why this is not the RMS of `phase`. */
  phaseErrorRmsDeg: number;
  vswr: number;
  tempC: number;
  /** Largest connected cluster of failed elements. */
  worstClusterSize: number;
  /** Per-element telemetry. */
  elements: ElementTelemetry[];
}

export interface DomeTelemetry {
  /** Unix timestamp (ms) of the last update. */
  timestamp: number;
  /** Per-face telemetry keyed by FceNum. */
  faces: Record<number, FaceTelemetry>;
  /** Dome-level rollup. */
  totals: DomeTotals;
}

export interface DomeTotals {
  elementsTotal: number;
  elementsOnline: number;
  facesTotal: number;
  /**
   * Faces with zero off-nominal elements.
   *
   * Kept for the readiness verdict, deliberately NOT shown as a headline
   * stat. At 374 elements per face even a healthy array rarely has a face
   * that is perfectly clean, so this reads ~8/26 on a dome that is 99.8%
   * available — a number that looks alarming and means almost nothing. The
   * header used to show it as "Faces Active", which was worse still: a face
   * with one flagged element out of 374 is entirely active.
   */
  facesHealthy: number;
  availabilityPercent: number;
  worstClusterSize: number;
  worstClusterFace: number;
  /** Highest VSWR on any face, and where — the reading that trips NO-GO. */
  peakVswr: number;
  peakVswrFace: number;
  /** Highest chassis temperature on any face, and where — the other NO-GO trip. */
  peakTempC: number;
  peakTempFace: number;
  /** Worst per-face calibration residual on the dome, and where. */
  peakPhaseErrorDeg: number;
  peakPhaseErrorFace: number;
}

/* ---------- selection ---------- */

export type SelectionLevel = "array" | "face" | "element";

export interface SelectionRef {
  level: SelectionLevel;
  faceNum?: number;
  elementIdx?: number;
}

/* ---------- camera ---------- */

export interface CameraPreset {
  id: string;
  label: string;
  /** Azimuth in degrees. */
  azimuth: number;
  /** Elevation in degrees. */
  elevation: number;
  /** Distance from dome centre (metres). */
  distance: number;
}

/* ---------- metric modes ---------- */

export type MetricMode = "states" | "gain" | "phase" | "temp";
