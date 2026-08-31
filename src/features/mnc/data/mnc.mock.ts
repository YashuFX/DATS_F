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
 * Antenna pointing envelope — what the dish can see from this site.
 *
 * A STATIC rectangular pyramid rising from the station: apex at the antenna,
 * axis along the local vertical, `halfWidthDeg` either side of that axis in
 * azimuth AND in elevation, reaching `rangeKm`.
 *
 * Square, not circular. A ±30° / ±30° limit is two independent axis limits, so
 * its cross-section is a square of half-width `range · tan(30°)` — a cone
 * would be the envelope of a single ±30° limit measured in every direction at
 * once, which is a different and strictly smaller volume. The corners are the
 * difference: a target 30° off in azimuth AND 30° off in elevation is inside
 * these limits but ~39° off-axis, so a cone would wrongly report it out.
 *
 * Centred on zenith rather than on a commanded boresight, because the fence is
 * a fixed property of the installation — the limit the mount was built with —
 * not a readout that swings with whatever the antenna happens to be tracking.
 * Centring it on the live boresight would have made it move under the passes
 * it is supposed to be judging, which is exactly backwards.
 */
export const ANTENNA_FENCE = {
  /** Half-width from the vertical axis, degrees — applied in azimuth and in
   *  elevation independently, which is what makes the envelope square. */
  halfWidthDeg: 30,
  /** Range the fence is drawn to along its axis, km. */
  rangeKm: 800,
} as const;

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
