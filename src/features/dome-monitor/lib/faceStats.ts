/**
 * Small derived statistics for the face detail panel — dome-wide averages
 * (so a face's numbers can show a real delta against the rest of the array,
 * not an invented baseline) and value-distribution histograms (real per
 * element data already in FaceTelemetry.elements, just binned).
 */

import { PRESENT_FACES } from "../data/geometry";
import type { DomeTelemetry, FaceTelemetry } from "../types";

export interface DomeAverages {
  meanExcitationDb: number;
  phaseErrorRmsDeg: number;
  tempC: number;
}

/** Mean of each face-level metric across every present face — a real baseline. */
export function domeAverages(telemetry: DomeTelemetry): DomeAverages {
  const faces = PRESENT_FACES.map((f) => telemetry.faces[f.fceNum]).filter((f): f is FaceTelemetry => !!f);
  const n = faces.length || 1;
  return {
    meanExcitationDb: faces.reduce((s, f) => s + f.meanExcitationDb, 0) / n,
    phaseErrorRmsDeg: faces.reduce((s, f) => s + f.phaseErrorRmsDeg, 0) / n,
    tempC: faces.reduce((s, f) => s + f.tempC, 0) / n,
  };
}

export interface HistogramBin {
  label: string;
  count: number;
}

/** Bin raw values into `binCount` equal-width buckets over [min, max]. */
export function histogram(values: number[], binCount: number, min?: number, max?: number): HistogramBin[] {
  if (values.length === 0) return [];
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const counts = new Array(binCount).fill(0);
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor(((v - lo) / span) * binCount)));
    counts[idx]++;
  }
  return counts.map((count, i) => ({
    label: (lo + (span * i) / binCount).toFixed(1),
    count,
  }));
}
