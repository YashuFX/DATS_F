/**
 * Seed data for the M&C console.
 *
 * Static literals, not a generator: unlike the dome's 7 557 elements these are
 * a couple of dozen rows an operator reads individually, so listing them keeps
 * the numbers greppable and reviewable against the console they came from. No
 * `Math.random()` anywhere — server render and client hydration must produce
 * identical markup.
 *
 * File is named .mock.ts to signal non-real data, same convention as
 * dome-monitor/data/telemetry.mock.ts.
 */

import type {
  GroundStationMarker,
  McTask,
  TrackedSatellite,
  ParameterRow,
} from "../types";

/* ---------- tracking ---------- */

/**
 * This console's own site. Surveyed coordinates, so they are carried at full
 * precision rather than rounded to the two decimals a map marker would need —
 * the antenna fence is built from this position and a rounded origin walks the
 * fence footprint by hundreds of metres.
 */
export const SITE = {
  id: "GS-01",
  name: "Bengaluru (ISTRAC)",
  latDeg: 13.035571678248347,
  lonDeg: 77.51063448300057,
  /** Site elevation, metres. */
  heightM: 900,
} as const;

/**
 * The station's tracking volume, and what limits it.
 *
 * MUST-01 is a geodesic dome, and hemispherical coverage is the entire reason
 * it is one: a planar array is limited to roughly ±60° off its own boresight
 * before scan loss and grating lobes end the useful pattern, so covering the
 * sky with one flat face is impossible. Twenty-six faces pointing in different
 * directions cover azimuth 0-360° and elevation 0-90° between them, and any
 * given target is served by whichever face it happens to sit in front of.
 *
 * That is why the volume below is a hemisphere rather than the ±30° pyramid
 * this once drew. The ±30° figure was never the DOME's limit; it is a single
 * FACE's scan limit, and it survives as `faceScanLimitDeg` — the test for
 * whether a particular face can serve a particular target.
 */
export const TRACKING = {
  /** Lowest elevation the station will track to, degrees. Below this the path
   *  through the atmosphere is long enough that the link budget stops closing. */
  elevationMaskDeg: 5,
  /** Farthest slant range tracked, km. */
  maxRangeKm: 4000,
  /** Half-angle a single face can steer off its own boresight, degrees. */
  faceScanLimitDeg: 30,
} as const;

/**
 * Beam budget.
 *
 * A tracked target costs SIX beams: a five-beam monopulse cluster — one on
 * boresight and four squinted off it — whose amplitude differences give the
 * angle error that keeps the pointing loop closed, plus one data beam
 * carrying the downlink. That is the arrangement a real tracking array uses,
 * and it is the reason "how many satellites can we track" is not the same
 * question as "how many can we see".
 *
 * `beamsPerFace` is the digital beamformer's channel count on each face —
 * the hard limit, since forming a beam costs a receiver chain whether or not
 * the aperture could geometrically support another.
 */
export const BEAMS = {
  trackingBeamsPerTarget: 5,
  dataBeamsPerTarget: 1,
  beamsPerFace: 16,
  /**
   * Half-power beamwidth of one beam, degrees — the full cone, not the half.
   *
   * This is the number an antenna engineer quotes, so it is the one stated
   * here; everything angular below is DERIVED from it rather than tuned
   * beside it. The three constants used to be independent literals that had
   * to be kept in a fixed ratio by hand, which is a standing invitation to
   * move one and silently open a gap in the cluster.
   */
  beamwidthDeg: 4.5,
  /**
   * Relative excitation weight of each beam in the six-beam cluster.
   *
   * A cluster is not six equal beams. Forming a beam spends a share of the
   * face's finite receive aperture, and the three roles want different
   * shares:
   *
   *   DATA       the largest. Downlink rate scales with G/T, so the beam
   *              carrying the payload data is the one worth spending on.
   *   SUM        the boresight reference — tracking AND ranging come off it,
   *              so it needs enough gain to hold a lock on its own.
   *   DIFFERENCE the four squinted error channels. They only have to measure
   *              an IMBALANCE, and the null they work at is deep, so they
   *              close their loop on materially less gain than the sum beam.
   *
   * Relative, not absolute: what matters is the ratio between them. The
   * normalised share of the target's allocation is derived in
   * `beamDirections`, so these can be retuned without touching any consumer.
   */
  weights: {
    sum: 1,
    difference: 0.55,
    data: 1.2,
  },
} as const;

/**
 * Half-width of one beam's footprint, degrees.
 *
 * ---- why the angular constants are one design, not three knobs ----
 *
 * The reason a target costs five tracking beams instead of one:
 *
 *   the array is steered to a PREDICTED direction and holds it;
 *   the spacecraft drifts off that direction by up to `repointDeg`;
 *   wherever inside that circle it ends up, some beam must still hold it.
 *
 * Five beams spaced `monopulseSquintDeg` apart in a plus pattern only cover
 * that circle without a gap if their footprints OVERLAP. Tangent footprints
 * leave the diagonals uncovered: a target that has drifted `q` at 45° is
 * 0.77q from the nearest beam centre, well outside a footprint of q/2, and
 * the contact would be dropped in the one direction nobody checks.
 *
 * So the squint is derived from the beamwidth at the ratio that closes the
 * diagonal — three quarters of a squint per half-width — which also puts the
 * beam crossovers near the half-power contour, where a real monopulse cluster
 * is designed to cross. Changing `beamwidthDeg` alone now rescales the whole
 * cluster and keeps the covering property; it cannot be half-changed.
 *
 * `npm test` asserts that property rather than these numbers, so the design
 * can be retuned without the test having to be rewritten around it.
 */
export const BEAM_HALF_WIDTH_DEG = BEAMS.beamwidthDeg / 2;

/** Angular offset of the four squinted monopulse beams, degrees. */
export const MONOPULSE_SQUINT_DEG = BEAM_HALF_WIDTH_DEG / 0.75;

/** How far the target may drift off the commanded direction before the array
 *  re-steers, degrees. Exactly one footprint half-width: past that, the beam
 *  holding the target is no longer the one it was handed to. */
export const REPOINT_DEG = BEAM_HALF_WIDTH_DEG;

export const BEAMS_PER_TARGET = BEAMS.trackingBeamsPerTarget + BEAMS.dataBeamsPerTarget;

export const GROUND_STATIONS: GroundStationMarker[] = [
  { id: SITE.id, name: SITE.name, latDeg: SITE.latDeg, lonDeg: SITE.lonDeg },
];

export const TRACKED_SATELLITES: TrackedSatellite[] = [
  {
    id: "SAT-01",
    rangeKm: 2358,
    azimuthDeg: 142.35,
    elevationDeg: 36.21,
    velocityKmS: 7.66,
    latDeg: 22.4,
    lonDeg: 88.2,
    altitudeM: 705_000,
    token: "da-info",
  },
  {
    id: "SAT-02",
    rangeKm: 4125,
    azimuthDeg: 265.12,
    elevationDeg: 12.45,
    velocityKmS: 7.63,
    latDeg: 8.1,
    lonDeg: 66.4,
    altitudeM: 812_000,
    token: "da-danger",
  },
];

/* ---------- parameter panel ---------- */

export const ANTENNA_PARAMETERS: ParameterRow[] = [
  { parameter: "Gain Setting",           value: "32.0",     unit: "dB",  status: "nominal", min: "0",    max: "40" },
  { parameter: "Polarization",           value: "LHCP",     unit: "-",   status: "nominal", min: "-",    max: "-" },
  { parameter: "Beam Pointing Azimuth",  value: "142.35",   unit: "deg", status: "nominal", min: "0",    max: "360" },
  { parameter: "Beam Pointing Elevation", value: "36.21",   unit: "deg", status: "nominal", min: "0",    max: "90" },
  { parameter: "Operating Frequency",    value: "8.20",     unit: "GHz", status: "nominal", min: "7.90", max: "8.50" },
  { parameter: "System Mode",            value: "Tracking", unit: "-",   status: "nominal", min: "-",    max: "-" },
  { parameter: "Drive Status",           value: "Normal",   unit: "-",   status: "nominal", min: "-",    max: "-" },
];

export const BEAM_PARAMETERS: ParameterRow[] = [
  { parameter: "Active Beams",       value: "6",     unit: "-",   status: "nominal", min: "0",   max: "72" },
  { parameter: "Beamwidth (3 dB)",   value: "1.85",  unit: "deg", status: "nominal", min: "1.5", max: "2.5" },
  { parameter: "Peak Sidelobe",      value: "-24.6", unit: "dB",  status: "nominal", min: "-",   max: "-20" },
  { parameter: "Scan Loss",          value: "0.42",  unit: "dB",  status: "nominal", min: "0",   max: "3" },
  { parameter: "Beam Steering Rate", value: "2.4",   unit: "deg/s", status: "nominal", min: "0", max: "10" },
  { parameter: "Taper",              value: "Taylor", unit: "-",  status: "nominal", min: "-",   max: "-" },
];

export const SYSTEM_PARAMETERS: ParameterRow[] = [
  { parameter: "Reference Clock",  value: "Locked",  unit: "-",  status: "nominal", min: "-",  max: "-" },
  { parameter: "Time Source",      value: "GPS",     unit: "-",  status: "nominal", min: "-",  max: "-" },
  { parameter: "Rack Inlet Temp",  value: "22.6",    unit: "°C", status: "nominal", min: "18", max: "30" },
  { parameter: "DC Bus",           value: "27.4",    unit: "V",  status: "nominal", min: "24", max: "30" },
  { parameter: "Total Draw",       value: "212",     unit: "A",  status: "nominal", min: "0",  max: "320" },
  { parameter: "Uptime",           value: "14d 06h", unit: "-",  status: "nominal", min: "-",  max: "-" },
];

export const THRESHOLD_PARAMETERS: ParameterRow[] = [
  { parameter: "Tile Temp Warn",   value: "60",   unit: "°C", status: "nominal", min: "-", max: "60" },
  { parameter: "Tile Temp Critical", value: "70", unit: "°C", status: "nominal", min: "-", max: "70" },
  { parameter: "VSWR Max",         value: "1.50", unit: "-",  status: "nominal", min: "-", max: "1.50" },
  { parameter: "Phase Error Max",  value: "12",   unit: "°",  status: "nominal", min: "-", max: "12" },
  { parameter: "Availability Min", value: "95",   unit: "%",  status: "nominal", min: "95", max: "-" },
];

/* ---------- scheduler preview ---------- */

export const MC_TASKS: McTask[] = [
  { id: "SCH-001", name: "Telemetry Pass - 01", type: "Telemetry",    target: "SAT-01", startIst: "29 May 2025 10:30:00", endIst: "29 May 2025 11:05:00", status: "RUNNING",   progress: 65 },
  { id: "SCH-002", name: "Telemetry Pass - 02", type: "Telemetry",    target: "SAT-02", startIst: "29 May 2025 11:50:00", endIst: "29 May 2025 12:25:00", status: "SCHEDULED", progress: 0 },
  { id: "SCH-003", name: "Calibration",         type: "Calibration",  target: "SAT-01", startIst: "29 May 2025 12:00:00", endIst: "29 May 2025 12:20:00", status: "SCHEDULED", progress: 0 },
  { id: "SCH-004", name: "Telemetry Pass - 03", type: "Telemetry",    target: "SAT-01", startIst: "29 May 2025 12:45:00", endIst: "29 May 2025 13:20:00", status: "SCHEDULED", progress: 0 },
  { id: "SCH-005", name: "Housekeeping",        type: "Housekeeping", target: "ALL",    startIst: "29 May 2025 13:30:00", endIst: "29 May 2025 13:45:00", status: "SCHEDULED", progress: 0 },
];
