/**
 * Mock telemetry — seeded PRNG, never Math.random().
 *
 * Same discipline as array-monitor/data/tiles.ts: Mulberry32 with a fixed seed
 * so the server render and client hydration produce identical markup.
 *
 * File is named .mock.ts to clearly signal non-real data.
 */

import { PRESENT_FACES } from "./geometry";
import { worstClusterSize } from "../lib/clustering";
import type {
  DomeTelemetry,
  DomeTotals,
  ElementTelemetry,
  FaceTelemetry,
  HealthId,
} from "../types";

/** Mulberry32 — small, fast, and reproducible across server and client. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickHealth(rng: () => number, degradedChance: number, criticalChance: number): HealthId {
  const r = rng();
  if (r < criticalChance) return "critical";
  if (r < criticalChance + degradedChance) return "degraded";
  return "nominal";
}

/**
 * Generate mock element telemetry for a face.
 *
 * One face (fceNum 5) gets a cluster of degraded elements for visual interest
 * — this simulates the "is the failure clustered or scattered?" scenario the
 * dome view is built to answer.
 */
function buildFaceElements(
  fceNum: number,
  count: number,
  rng: () => number,
): ElementTelemetry[] {
  const elements: ElementTelemetry[] = [];
  const isFaultyFace = fceNum === 5;

  for (let i = 0; i < count; i++) {
    let health: HealthId;

    if (isFaultyFace && i >= 150 && i <= 165) {
      // A cluster of degraded elements
      health = rng() < 0.7 ? "degraded" : "critical";
    } else if (isFaultyFace && i === 200) {
      health = "critical";
    } else {
      health = pickHealth(rng, 0.003, 0.001);
    }

    const amplitude = Math.min(1, Math.max(0.1, 0.85 + (rng() - 0.5) * 0.15));

    // Beam-steering ramp across the face. Large, smooth, and IDENTICAL on a
    // perfectly calibrated array — this is where the beam is pointed, not a
    // fault. It is what the 3D "Phase" metric mode colours, because a stuck
    // element shows up as a break in an otherwise smooth gradient.
    const commandedPhase = Math.sin(i * 0.1) * 40;

    // Calibration residual on top of it. A healthy T/R module holds a few
    // degrees; a degraded one drifts; a critical one is typically a stuck or
    // free-running phase shifter, which lands anywhere in the circle. That
    // last case is why a boolean alive/dead element model understates impact
    // (PHASEPLAN B2): a stuck shifter radiates power into the wrong place
    // rather than simply not radiating.
    const errorScale = health === "critical" ? 90 : health === "degraded" ? 22 : 3.2;
    const phaseErrorDeg = (rng() - 0.5) * 2 * errorScale;

    const tempC = 35 + rng() * 12;

    elements.push({
      health,
      amplitude: Number(amplitude.toFixed(3)),
      phase: Math.round(wrapPhase(commandedPhase + phaseErrorDeg)),
      phaseErrorDeg: Number(phaseErrorDeg.toFixed(2)),
      tempC: Number(tempC.toFixed(1)),
    });
  }

  return elements;
}

/** Fold a phase into (-180, +180]. */
function wrapPhase(deg: number): number {
  const wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
  return wrapped;
}

function worstHealth(elements: ElementTelemetry[]): HealthId {
  const hasCritical = elements.some((e) => e.health === "critical");
  if (hasCritical) return "critical";
  const hasDegraded = elements.some((e) => e.health === "degraded");
  if (hasDegraded) return "degraded";
  return "nominal";
}

/**
 * Build mock telemetry for the full dome.
 *
 * `seed` lets a live-feed simulation advance the PRNG stream deterministically
 * per tick (still never `Math.random()` — see the file header) instead of
 * every tick reproducing the exact same snapshot.
 */
export function buildMockTelemetry(seed = 0xd0_e1): DomeTelemetry {
  const rng = makeRng(seed);
  const faceTelemetry: Record<number, FaceTelemetry> = {};

  let totalElements = 0;
  let totalOnline = 0;
  let totalHealthy = 0;
  let globalWorstCluster = 0;
  let globalWorstFace = 0;
  let peakVswr = 0;
  let peakVswrFace = 0;
  let peakTempC = -Infinity;
  let peakTempFace = 0;
  let peakPhaseErrorDeg = 0;
  let peakPhaseErrorFace = 0;

  for (const face of PRESENT_FACES) {
    const elements = buildFaceElements(face.fceNum, face.elementCount, rng);
    const online = elements.filter((e) => e.health !== "offline" && e.health !== "critical").length;
    const health = worstHealth(elements);
    const cluster = worstClusterSize(elements.map((e) => e.health), face.kind);

    const meanGain = elements.reduce((s, e) => s + e.amplitude, 0) / elements.length;

    // RMS of the calibration residual — NOT the spread of raw phase. Taking
    // an RMS over `phase` would measure the steering ramp built into every
    // face above, so a perfectly calibrated array pointed off-boresight
    // would report tens of degrees of "phase RMS" and look broken.
    const phaseErrorRms = Math.sqrt(
      elements.reduce((s, e) => s + e.phaseErrorDeg ** 2, 0) / elements.length,
    );
    const meanTemp = elements.reduce((s, e) => s + e.tempC, 0) / elements.length;

    faceTelemetry[face.fceNum] = {
      fceNum: face.fceNum,
      health,
      online,
      total: face.elementCount,
      availabilityPercent: (online / face.elementCount) * 100,
      meanExcitationDb: Number(((meanGain - 1) * 20).toFixed(2)),
      phaseErrorRmsDeg: Number(phaseErrorRms.toFixed(2)),
      vswr: Number((1.1 + rng() * 0.15).toFixed(2)),
      tempC: Number(meanTemp.toFixed(1)),
      worstClusterSize: cluster,
      elements,
    };

    totalElements += face.elementCount;
    totalOnline += online;
    if (health === "nominal") totalHealthy++;
    if (cluster > globalWorstCluster) {
      globalWorstCluster = cluster;
      globalWorstFace = face.fceNum;
    }

    // Dome-level peaks, carried with the face that drives them: a peak with
    // no location is not actionable, and these three are exactly the
    // readings the readiness verdict trips on (lib/readiness.ts).
    const ft = faceTelemetry[face.fceNum];
    if (ft.vswr > peakVswr) {
      peakVswr = ft.vswr;
      peakVswrFace = face.fceNum;
    }
    if (ft.tempC > peakTempC) {
      peakTempC = ft.tempC;
      peakTempFace = face.fceNum;
    }
    if (ft.phaseErrorRmsDeg > peakPhaseErrorDeg) {
      peakPhaseErrorDeg = ft.phaseErrorRmsDeg;
      peakPhaseErrorFace = face.fceNum;
    }
  }

  const totals: DomeTotals = {
    elementsTotal: totalElements,
    elementsOnline: totalOnline,
    facesTotal: PRESENT_FACES.length,
    facesHealthy: totalHealthy,
    availabilityPercent: Number(((totalOnline / totalElements) * 100).toFixed(2)),
    worstClusterSize: globalWorstCluster,
    worstClusterFace: globalWorstFace,
    peakVswr,
    peakVswrFace,
    peakTempC: peakTempC === -Infinity ? 0 : peakTempC,
    peakTempFace,
    peakPhaseErrorDeg,
    peakPhaseErrorFace,
  };

  return {
    timestamp: Date.now(),
    faces: faceTelemetry,
    totals,
  };
}

/** Singleton instance. */
export const MOCK_TELEMETRY: DomeTelemetry = buildMockTelemetry();
