/**
 * Readiness verdict — Go / Degraded / No-Go / Unknown (PHASEPLAN §Phase 4).
 *
 * Judged against `THRESHOLDS` in config.ts, which are DEMO placeholders: the
 * real EIRP / G-T / peak-sidelobe floor is blocker B3, still open. Swap the
 * threshold reads here for the client's real figures once they land — the
 * shape (always name the driving constraint, always fail closed to UNKNOWN
 * on stale data) shouldn't need to change.
 */

import { THRESHOLDS } from "../config";
import type { DomeTelemetry } from "../types";

export type ReadinessVerdict = "GO" | "DEGRADED" | "NO_GO" | "UNKNOWN";

export interface Readiness {
  verdict: ReadinessVerdict;
  /** Always names the constraint that drove the verdict — never a bare label. */
  reason: string;
}

/** 3 missed ticks at the mock feed's 4 s cadence. */
export const STALE_THRESHOLD_MS = 12_000;

export function computeReadiness(telemetry: DomeTelemetry, now: number): Readiness {
  const age = now - telemetry.timestamp;
  if (age > STALE_THRESHOLD_MS) {
    // A stale verdict is UNKNOWN, never GO — an operator must never read
    // stale data as healthy.
    return { verdict: "UNKNOWN", reason: `Telemetry stale — last update ${Math.round(age / 1000)}s ago` };
  }

  const faces = Object.values(telemetry.faces);

  let worstVswrFace = faces[0] ?? null;
  for (const f of faces) if (f.vswr > (worstVswrFace?.vswr ?? -Infinity)) worstVswrFace = f;
  if (worstVswrFace && worstVswrFace.vswr > THRESHOLDS.vswrMax) {
    return {
      verdict: "NO_GO",
      reason: `VSWR ${worstVswrFace.vswr.toFixed(2)} on Face ${worstVswrFace.fceNum} exceeds ${THRESHOLDS.vswrMax}`,
    };
  }

  const hotFace = faces.find((f) => f.tempC >= THRESHOLDS.tempCritC);
  if (hotFace) {
    return {
      verdict: "NO_GO",
      reason: `Face ${hotFace.fceNum} at ${hotFace.tempC.toFixed(1)}°C exceeds the ${THRESHOLDS.tempCritC}°C critical threshold`,
    };
  }

  const { worstClusterSize, worstClusterFace } = telemetry.totals;
  if (worstClusterSize >= 40) {
    return {
      verdict: "NO_GO",
      reason: `Worst cluster ${worstClusterSize} el on Face ${worstClusterFace} — pattern impact likely severe`,
    };
  }
  if (worstClusterSize >= 10) {
    return { verdict: "DEGRADED", reason: `Worst cluster ${worstClusterSize} el on Face ${worstClusterFace}` };
  }

  // Calibration, judged before the face-count sweep below: an aperture out
  // of phase spec is degraded even when every element reports nominal, and
  // naming the residual is more actionable to an operator than "n faces off
  // nominal". Ruze: gain loss ~ exp(-sigma^2), so 12 deg RMS is already
  // ~0.2 dB off peak with a correspondingly raised sidelobe floor.
  const { peakPhaseErrorDeg, peakPhaseErrorFace } = telemetry.totals;
  if (peakPhaseErrorDeg > THRESHOLDS.phaseJitterDeg) {
    return {
      verdict: "DEGRADED",
      reason: `Face ${peakPhaseErrorFace} phase error ${peakPhaseErrorDeg.toFixed(1)}° RMS exceeds ${THRESHOLDS.phaseJitterDeg}°`,
    };
  }

  const degradedFaces = telemetry.totals.facesTotal - telemetry.totals.facesHealthy;
  if (degradedFaces > 0) {
    return { verdict: "DEGRADED", reason: `${degradedFaces} face${degradedFaces > 1 ? "s" : ""} off nominal` };
  }

  return { verdict: "GO", reason: "All faces nominal, no cluster above threshold" };
}
