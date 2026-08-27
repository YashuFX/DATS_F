/**
 * Readiness verdict tests (PHASEPLAN §Phase 4) — the one safety-critical
 * rule is that stale telemetry must never read as GO, so that gets its own
 * assertion rather than trusting the happy path to cover it.
 *
 * Run with:  npm run test:geometry
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeReadiness, STALE_THRESHOLD_MS } from "../readiness";
import { PRESENT_FACES } from "../../data/geometry";
import { THRESHOLDS } from "../../config";
import type { DomeTelemetry, FaceTelemetry } from "../../types";

function baseFaceTelemetry(fceNum: number, total: number): FaceTelemetry {
  return {
    fceNum,
    health: "nominal",
    online: total,
    total,
    availabilityPercent: 100,
    meanGainDb: 0,
    phaseRmsDeg: 5,
    vswr: 1.1,
    tempC: 35,
    worstClusterSize: 0,
    elements: [],
  };
}

function buildTelemetry(overrides: Partial<Record<number, Partial<FaceTelemetry>>> = {}): DomeTelemetry {
  const faces: Record<number, FaceTelemetry> = {};
  for (const f of PRESENT_FACES) {
    faces[f.fceNum] = { ...baseFaceTelemetry(f.fceNum, f.elementCount), ...overrides[f.fceNum] };
  }
  return {
    timestamp: Date.now(),
    faces,
    totals: {
      elementsTotal: 7557,
      elementsOnline: 7557,
      facesTotal: PRESENT_FACES.length,
      facesHealthy: PRESENT_FACES.length,
      availabilityPercent: 100,
      worstClusterSize: 0,
      worstClusterFace: 0,
    },
  };
}

describe("readiness verdict", () => {
  test("an all-nominal dome is GO", () => {
    const { verdict } = computeReadiness(buildTelemetry(), Date.now());
    assert.equal(verdict, "GO");
  });

  test("stale telemetry is UNKNOWN, never GO", () => {
    const telemetry = buildTelemetry();
    telemetry.timestamp = Date.now() - (STALE_THRESHOLD_MS + 5000);
    const { verdict, reason } = computeReadiness(telemetry, Date.now());
    assert.equal(verdict, "UNKNOWN");
    assert.match(reason, /stale/i);
  });

  test("VSWR over threshold is NO_GO and names the face", () => {
    const face = PRESENT_FACES[0].fceNum;
    const telemetry = buildTelemetry({ [face]: { vswr: THRESHOLDS.vswrMax + 0.5 } });
    const { verdict, reason } = computeReadiness(telemetry, Date.now());
    assert.equal(verdict, "NO_GO");
    assert.match(reason, new RegExp(`Face ${face}`));
  });

  test("a large worst cluster is NO_GO", () => {
    const telemetry = buildTelemetry();
    telemetry.totals.worstClusterSize = 45;
    telemetry.totals.worstClusterFace = PRESENT_FACES[0].fceNum;
    const { verdict } = computeReadiness(telemetry, Date.now());
    assert.equal(verdict, "NO_GO");
  });

  test("a handful of off-nominal faces without a large cluster is DEGRADED, not NO_GO", () => {
    const telemetry = buildTelemetry({
      [PRESENT_FACES[0].fceNum]: { health: "degraded" },
    });
    telemetry.totals.facesHealthy = PRESENT_FACES.length - 1;
    const { verdict } = computeReadiness(telemetry, Date.now());
    assert.equal(verdict, "DEGRADED");
  });
});
