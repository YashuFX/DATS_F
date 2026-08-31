/**
 * Domain types for the Monitoring & Controlling (M&C) console — the /dashboard
 * route's one-screen rollup of tracking, array health and the schedule.
 *
 * The M&C screen owns no telemetry of its own. Every panel is a PREVIEW of a
 * section that already exists (`/tracking`, `/dome`, `/monitor/array`,
 * `/scheduler`), which is why each panel carries an expand affordance rather
 * than a drill-down of its own: the full instrument is one click away and
 * duplicating it here would mean two implementations drifting apart.
 */

/** Four-state health, matching the dome and array monitors so a colour means
 *  the same thing on every screen in the console. */
export type McHealth = "healthy" | "warning" | "critical" | "offline";

export const MC_HEALTH_META: Record<McHealth, { label: string; token: string }> = {
  healthy:  { label: "Healthy",  token: "da-success" },
  warning:  { label: "Warning",  token: "da-warn" },
  critical: { label: "Critical", token: "da-danger" },
  offline:  { label: "Offline",  token: "da-offline" },
};

/* ---------- tracking ---------- */

/** A tracked spacecraft as the tracking panel reads it. */
export interface TrackedSatellite {
  id: string;
  /** Slant range to the ground station, km. */
  rangeKm: number;
  /** Look angles from the station, degrees. */
  azimuthDeg: number;
  elevationDeg: number;
  /** Orbital speed, km/s. */
  velocityKmS: number;
  /** Sub-satellite point, degrees — where the marker sits on the globe. */
  latDeg: number;
  lonDeg: number;
  /** Altitude of the sub-satellite point, metres. */
  altitudeM: number;
  /** Accent token used for the marker and its readout card. */
  token: string;
}

export interface GroundStationMarker {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
}

/* ---------- health preview / parameter panel ---------- */

/**
 * One row of a parameter readout.
 *
 * `threshold` is free text rather than a parsed range because the limits it
 * has to render are not one shape — "< 60", "24 - 30" and "> 95" all appear
 * on the same table, and formatting them from a parsed model would be more
 * code for an identical result.
 */
export interface ParameterRow {
  parameter: string;
  value: string;
  unit: string;
  status: McHealth | "nominal";
  /** Health-preview form: a single limit expression. */
  threshold?: string;
  /** Parameter-panel form: an explicit operating band. */
  min?: string;
  max?: string;
}

/* ---------- scheduler preview ---------- */

export type McTaskStatus = "RUNNING" | "SCHEDULED" | "COMPLETED" | "FAILED";

export interface McTask {
  id: string;
  name: string;
  type: "Telemetry" | "Calibration" | "Housekeeping";
  target: string;
  startIst: string;
  endIst: string;
  status: McTaskStatus;
  /** 0..100. */
  progress: number;
}
