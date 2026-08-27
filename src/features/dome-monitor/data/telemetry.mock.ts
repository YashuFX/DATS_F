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
    const phase = Math.round(Math.sin(i * 0.1) * 40 + (rng() - 0.5) * 10);
    const tempC = 35 + rng() * 12;

    elements.push({
      health,
      amplitude: Number(amplitude.toFixed(3)),
      phase,
      tempC: Number(tempC.toFixed(1)),
    });
  }

  return elements;
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

  for (const face of PRESENT_FACES) {
    const elements = buildFaceElements(face.fceNum, face.elementCount, rng);
    const online = elements.filter((e) => e.health !== "offline" && e.health !== "critical").length;
    const health = worstHealth(elements);
    const cluster = worstClusterSize(elements.map((e) => e.health), face.kind);

    const meanGain = elements.reduce((s, e) => s + e.amplitude, 0) / elements.length;
    const phases = elements.map((e) => e.phase);
    const meanPhase = phases.reduce((s, p) => s + p, 0) / phases.length;
    const phaseRms = Math.sqrt(
      phases.reduce((s, p) => s + (p - meanPhase) ** 2, 0) / phases.length,
    );
    const meanTemp = elements.reduce((s, e) => s + e.tempC, 0) / elements.length;

    faceTelemetry[face.fceNum] = {
      fceNum: face.fceNum,
      health,
      online,
      total: face.elementCount,
      availabilityPercent: (online / face.elementCount) * 100,
      meanGainDb: Number(((meanGain - 1) * 20).toFixed(2)),
      phaseRmsDeg: Number(phaseRms.toFixed(2)),
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
  }

  const totals: DomeTotals = {
    elementsTotal: totalElements,
    elementsOnline: totalOnline,
    facesTotal: PRESENT_FACES.length,
    facesHealthy: totalHealthy,
    availabilityPercent: Number(((totalOnline / totalElements) * 100).toFixed(2)),
    worstClusterSize: globalWorstCluster,
    worstClusterFace: globalWorstFace,
  };

  return {
    timestamp: Date.now(),
    faces: faceTelemetry,
    totals,
  };
}

/** Singleton instance. */
export const MOCK_TELEMETRY: DomeTelemetry = buildMockTelemetry();
