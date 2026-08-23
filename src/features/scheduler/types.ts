/**
 * Domain types for the Multi-Satellite Telemetry & Tracking Scheduler.
 *
 * Shaped against tender section J.1: pass prediction from TLE, prioritisation,
 * dynamic rescheduling, and per-pass logging for J.1.4 history.
 */

export type OrbitClass = "LEO" | "MEO" | "GEO" | "HEO" | "SSO";

/** 1 = Critical, 2 = High, 3 = Standard (J.1.2 prioritisation). */
export type Priority = 1 | 2 | 3;

export type PassStatus =
  "TRACKING" | "SCHEDULED" | "CONFLICT" | "COMPLETED" | "MISSED" | "CANCELLED";

export type LinkLock = "LOCKED" | "ACQUIRING" | "DEGRADED" | "UNLOCKED";

export interface GroundStation {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
}

export interface Antenna {
  id: string;
  stationId: string;
}

export interface SatellitePass {
  id: string;
  satName: string;
  noradId: number;
  orbitClass: OrbitClass;
  stationId: string;
  /**
   * The antenna this pass is booked on. This — not an abstract "channel" — is
   * what the timeline lays out in lanes, and what two passes contend for when
   * the scheduler reports a conflict.
   */
  antennaId: string;

  /** Seconds from now to acquisition of signal. Negative once the pass is up. */
  aosOffsetSec: number;
  durationSec: number;
  priority: Priority;
  status: PassStatus;

  /* Orbit, from the TLE the prediction ran against. */
  inclinationDeg: number;
  apogeeKm: number;
  perigeeKm: number;
  periodMin: number;

  /* RF link. */
  frequencyMHz: number;
  dataRateKbps: number;
  linkMarginDb: number;
  modulation: string;

  /* Geometry predicted by SGP4 and seeded into the task (J.1.1). */
  aosAzimuthDeg: number;
  losAzimuthDeg: number;
  maxElevationDeg: number;
  aosRangeKm: number;

  /* Live/among-completed state. */
  linkLock: LinkLock;
  signalStrengthPct: number;
  plannedVolumeMb: number;
  downlinkedMb: number;
}

/** One finished pass, as J.1.4 requires it to be logged. */
export interface PassRecord {
  pass: SatellitePass;
  /** Epoch ms. */
  completedAt: number;
  aosAt: number;
  /** Any issue encountered during the pass — empty when the pass was clean. */
  issues: string[];
  meanSignalPct: number;
  dopplerDriftHz: number;
  efficiencyPct: number;
}

export interface Conflict {
  antennaId: string;
  /** The two passes contending for the antenna. */
  passIds: [string, string];
  overlapSec: number;
}

/** One line of the command uplink log. */
export interface LogEntry {
  /** Mission-clock time of the event, HH:MM:SS. */
  time: string;
  /**
   * What kind of event it was. The uplink is scanned, not read, so the level is
   * carried as data and rendered as a fixed-width tag rather than inferred from
   * substrings of the message.
   */
  level: "SYS" | "PLAN" | "ACQ" | "WARN" | "FAULT";
  message: string;
}
