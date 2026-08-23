/**
 * Domain types for the Array Monitor.
 *
 * The array is 24x24 = 576 dual-polarised radiating elements, partitioned into
 * nine 8x8 subarray tiles (A1..C3). Everything on this screen is either a tile
 * or one of its 64 elements, so those two shapes carry the whole model.
 */

export type HealthId = "nominal" | "degraded" | "critical";

export type PolarizationId = "H" | "V";

/** One of the 64 radiating elements inside a tile. */
export interface ArrayElement {
  /** 0..7 within the tile. */
  row: number;
  col: number;
  /** 0..1 — normalised gain, drives the heat map. */
  amplitude: number;
  /** -180..180 degrees. */
  phase: number;
  polarization: PolarizationId;
  health: HealthId;
}

export interface Tile {
  /** A1 .. C3 */
  id: string;
  health: HealthId;
  /** Celsius at the chassis inlet. */
  tempC: number;
  /** Regulated DC draw, watts. */
  powerW: number;
  /** Beam weights currently loaded, of 8. */
  beams: number;
  clocksLocked: number;
  clocksTotal: number;
  auroraLink: boolean;
  fanOn: boolean;
  /** RMS across the tile's 64 elements. */
  phaseErrorDeg: number;
  gainErrorDb: number;
  vswr: number;
  elements: ArrayElement[];
}

export interface ArrayTotals {
  elementsTotal: number;
  elementsOnline: number;
  beamsActive: number;
  beamsTotal: number;
  meanPhaseErrorDeg: number;
  availabilityPercent: number;
}

/** What the heat map is currently colouring by. */
export type MetricId = "amplitude" | "phase";

/** Feed filter on the toolbar. */
export type PolarizationFilter = "all" | PolarizationId;
