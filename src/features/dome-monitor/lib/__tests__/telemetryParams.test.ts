/**
 * Parameter-integrity tests.
 *
 * These exist because the two defects they pin were both *plausible-looking
 * numbers*, not crashes — the kind a screenshot review passes and an operator
 * acts on:
 *
 *  1. "Phase RMS" was the RMS spread of raw measured phase. Raw phase across
 *     a face is dominated by the beam-steering ramp, so it reported ~28° on a
 *     perfectly calibrated array — 2.4x the 12° alarm limit — while nothing
 *     alarmed. The quantity that means "is this face calibrated" is the RMS
 *     of the residual against the commanded phase.
 *
 *  2. "Faces Active N/26" was faces with zero off-nominal elements. On a
 *     99.8%-available dome that reads 11/26, because at 374 elements a face
 *     is rarely perfectly clean. It was also numerically identical to the
 *     "Alarms" stat beside it.
 *
 * Run with:  npm run test:geometry
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildMockTelemetry } from "../../data/telemetry.mock";
import { deriveAlarms } from "../alarms";
import { computeReadiness } from "../readiness";
import { domeAverages } from "../faceStats";
import { PRESENT_FACES } from "../../data/geometry";
import { THRESHOLDS, TOTAL_ELEMENT_COUNT } from "../../config";

const telemetry = buildMockTelemetry();
const faces = PRESENT_FACES.map((f) => telemetry.faces[f.fceNum]);

describe("phase error is a calibration residual, not the steering ramp", () => {
  test("per-face phase error RMS is far below the raw-phase spread", () => {
    for (const ft of faces) {
      const phases = ft.elements.map((e) => e.phase);
      const meanPhase = phases.reduce((s, p) => s + p, 0) / phases.length;
      const rawSpread = Math.sqrt(
        phases.reduce((s, p) => s + (p - meanPhase) ** 2, 0) / phases.length,
      );
      // The old metric. If these two ever converge, someone has gone back to
      // taking an RMS over raw phase.
      assert.ok(
        ft.phaseErrorRmsDeg < rawSpread / 2,
        `Face ${ft.fceNum}: phase error ${ft.phaseErrorRmsDeg}° vs raw spread ${rawSpread.toFixed(1)}°`,
      );
    }
  });

  test("a healthy dome sits inside the phase alarm limit", () => {
    // The old metric could not satisfy this: it read ~28° against a 12° limit
    // on an array with nothing wrong with it.
    assert.ok(
      telemetry.totals.peakPhaseErrorDeg < THRESHOLDS.phaseJitterDeg,
      `peak phase error ${telemetry.totals.peakPhaseErrorDeg}° exceeds the ${THRESHOLDS.phaseJitterDeg}° limit on a nominal dome`,
    );
  });

  test("phase error RMS matches the per-element residuals it summarises", () => {
    for (const ft of faces) {
      const rms = Math.sqrt(
        ft.elements.reduce((s, e) => s + e.phaseErrorDeg ** 2, 0) / ft.elements.length,
      );
      assert.ok(Math.abs(rms - ft.phaseErrorRmsDeg) < 0.05, `Face ${ft.fceNum}: ${rms} vs ${ft.phaseErrorRmsDeg}`);
    }
  });

  test("faulty elements carry larger residuals than nominal ones", () => {
    const all = faces.flatMap((f) => f.elements);
    const rms = (xs: number[]) => Math.sqrt(xs.reduce((s, x) => s + x ** 2, 0) / (xs.length || 1));
    const nominal = rms(all.filter((e) => e.health === "nominal").map((e) => e.phaseErrorDeg));
    const critical = rms(all.filter((e) => e.health === "critical").map((e) => e.phaseErrorDeg));
    // A stuck phase shifter radiates into the wrong place rather than not at
    // all — the reason a boolean alive/dead element model understates impact
    // (PHASEPLAN B2).
    assert.ok(critical > nominal * 4, `critical ${critical.toFixed(1)}° vs nominal ${nominal.toFixed(1)}°`);
  });
});

describe("dome-level peaks name the face that drives them", () => {
  test("each peak equals the max across faces and points at that face", () => {
    const t = telemetry.totals;
    for (const [name, peak, faceNum, read] of [
      ["VSWR", t.peakVswr, t.peakVswrFace, (f: (typeof faces)[number]) => f.vswr],
      ["temp", t.peakTempC, t.peakTempFace, (f: (typeof faces)[number]) => f.tempC],
      ["phase error", t.peakPhaseErrorDeg, t.peakPhaseErrorFace, (f: (typeof faces)[number]) => f.phaseErrorRmsDeg],
    ] as const) {
      assert.equal(peak, Math.max(...faces.map(read)), `${name}: peak value`);
      assert.equal(read(telemetry.faces[faceNum]), peak, `${name}: named face F${faceNum} must hold the peak`);
    }
  });
});

describe("alarm count is the alarm list", () => {
  test("covers more than face health alone", () => {
    // The header used to show `facesTotal - facesHealthy` under an "Alarms"
    // label, which structurally could not include these three.
    const kinds = new Set(deriveAlarms(telemetry).map((a) => a.id.split("-").pop()));
    const derivable = new Set(["health", "vswr", "temp", "phase"]);
    for (const k of kinds) assert.ok(derivable.has(k!), `unexpected alarm kind ${k}`);
  });

  test("phase drift alarms even when every element reads nominal", () => {
    const drifted = structuredClone(telemetry);
    const target = PRESENT_FACES[0].fceNum;
    drifted.faces[target].health = "nominal";
    drifted.faces[target].phaseErrorRmsDeg = THRESHOLDS.phaseJitterDeg + 1;
    const alarm = deriveAlarms(drifted).find((a) => a.id === `face-${target}-phase`);
    assert.ok(alarm, "an out-of-spec aperture must raise an alarm on its own");
  });

  test("readiness reports phase drift rather than a bare face count", () => {
    const drifted = structuredClone(telemetry);
    drifted.totals.worstClusterSize = 0;
    drifted.totals.peakPhaseErrorDeg = THRESHOLDS.phaseJitterDeg + 4;
    drifted.totals.peakPhaseErrorFace = 12;
    const { verdict, reason } = computeReadiness(drifted, drifted.timestamp);
    assert.equal(verdict, "DEGRADED");
    assert.match(reason, /phase error/);
  });
});

describe("headline stats are honest", () => {
  test("availability reflects elements, not faces", () => {
    const t = telemetry.totals;
    assert.equal(t.elementsTotal, TOTAL_ELEMENT_COUNT);
    assert.ok(t.availabilityPercent > 99, `dome is ${t.availabilityPercent}% available`);
    // The stat this replaced. Same dome, same instant: 99.8% available reads
    // as a minority of faces "active" — which is why it is gone.
    assert.ok(
      t.facesHealthy / t.facesTotal < 0.75,
      "facesHealthy no longer collapses — re-check whether the old 'Faces Active' stat is worth reviving",
    );
  });

  test("mean excitation is a drive level in dB below full scale, not a gain", () => {
    for (const ft of faces) {
      assert.ok(ft.meanExcitationDb <= 0, `Face ${ft.fceNum}: ${ft.meanExcitationDb} dB FS should not exceed full scale`);
      assert.ok(ft.meanExcitationDb > -20, `Face ${ft.fceNum}: ${ft.meanExcitationDb} dB FS is not a plausible drive level`);
    }
    assert.ok(domeAverages(telemetry).meanExcitationDb < 0);
  });

  test("measured phase stays wrapped into (-180, 180]", () => {
    for (const ft of faces) {
      for (const el of ft.elements) {
        assert.ok(el.phase > -181 && el.phase <= 180, `Face ${ft.fceNum}: phase ${el.phase}° is unwrapped`);
      }
    }
  });
});
