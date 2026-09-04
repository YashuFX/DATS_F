/**
 * Tracking simulation tests.
 *
 * The physics here is the panel's only claim to being worth looking at: if the
 * look angles are wrong, every readout, every beam and the whole capacity
 * argument is wrong with them, and none of it would look broken on screen. A
 * satellite drawn at the wrong azimuth is still a satellite drawn.
 *
 * Run with:  npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildDummyCatalogue, CATALOGUE_SIZE, MIN_SIMULTANEOUS_TARGETS } from "../tle";
import { getCatalogue, propagateAll } from "../lookAngles";
import { planBeams, beamDirections, carryingBeamIndex, separationDeg } from "../beamPlanner";
import {
  BEAMS,
  BEAMS_PER_TARGET,
  BEAM_HALF_WIDTH_DEG,
  REPOINT_DEG,
  TRACKING,
} from "../../data/mnc.mock";
import { PRESENT_FACES } from "@/features/dome-monitor/data/geometry";

const T0 = new Date("2026-09-02T06:00:00Z");

describe("dummy TLE catalogue", () => {
  test("produces a full catalogue that SGP4 accepts", () => {
    const cat = buildDummyCatalogue();
    // Asserted against the constant, not a literal: the catalogue size is a
    // tuning knob (it sets how busy the sky is), and a hard-coded count here
    // would fail every time it is turned rather than when something breaks.
    assert.equal(cat.length, CATALOGUE_SIZE);
    assert.ok(CATALOGUE_SIZE >= 70, "the brief asks for 70+ objects");
    // A malformed TLE does not throw — satellite.js sets a non-zero `error`
    // and silently propagates nonsense, so the check has to be explicit.
    const bad = getCatalogue().filter((r) => r.satrec.error !== 0);
    assert.equal(bad.length, 0, `${bad.length} TLEs failed SGP4 initialisation`);
  });

  test("TLE lines carry valid modulo-10 checksums", () => {
    const sum = (line: string) => {
      let n = 0;
      for (const ch of line.slice(0, 68)) {
        if (ch >= "0" && ch <= "9") n += Number(ch);
        else if (ch === "-") n += 1;
      }
      return n % 10;
    };
    for (const tle of buildDummyCatalogue()) {
      assert.equal(Number(tle.line1[68]), sum(tle.line1), `${tle.id} line 1 checksum`);
      assert.equal(Number(tle.line2[68]), sum(tle.line2), `${tle.id} line 2 checksum`);
    }
  });

  /**
   * The floor the console's whole argument rests on.
   *
   * "How many targets can this aperture serve at once" is not a question a
   * mostly-empty sky can answer, and the previous catalogue spent 65% of its
   * day below ten targets and reached zero at its worst. The service shells
   * exist to make that impossible; this is the assertion that says so, and it
   * is written against the property rather than the shell parameters so those
   * stay free to be retuned.
   *
   * Sampled across a full day at 6-minute steps: the constellation's coverage
   * pattern repeats with the ground track, so a shorter window can sit inside
   * one good stretch and prove nothing.
   */
  test("the sky always presents enough targets to load the beam planner", () => {
    const T = Date.UTC(2026, 8, 2, 6, 0, 0);
    let worst = Infinity;
    let worstAt = 0;
    for (let m = 0; m < 1440; m += 6) {
      const plan = planBeams(propagateAll(new Date(T + m * 60_000)));
      if (plan.assignments.length < worst) {
        worst = plan.assignments.length;
        worstAt = m;
      }
    }
    assert.ok(
      worst >= MIN_SIMULTANEOUS_TARGETS,
      `sky fell to ${worst} tracked targets at T+${worstAt} min, below the ` +
        `${MIN_SIMULTANEOUS_TARGETS} the board is designed to always show`,
    );
  });

  test("is deterministic — same sky on every reload", () => {
    const a = buildDummyCatalogue();
    const b = buildDummyCatalogue();
    assert.deepEqual(a.map((t) => t.line2), b.map((t) => t.line2));
  });
});

describe("look angles", () => {
  const states = propagateAll(T0);

  test("azimuth stays in 0..360 and elevation in -90..90", () => {
    for (const s of states) {
      assert.ok(s.azimuthDeg >= 0 && s.azimuthDeg <= 360, `${s.id} az ${s.azimuthDeg}`);
      assert.ok(s.elevationDeg >= -90 && s.elevationDeg <= 90, `${s.id} el ${s.elevationDeg}`);
    }
  });

  test("visibility means above the mask AND inside max range", () => {
    for (const s of states) {
      const expected =
        s.elevationDeg >= TRACKING.elevationMaskDeg && s.rangeKm <= TRACKING.maxRangeKm;
      assert.equal(s.visible, expected, `${s.id}`);
    }
  });

  test("altitude is a plausible LEO band, and range respects it", () => {
    for (const s of states) {
      assert.ok(s.altitudeKm > 300 && s.altitudeKm < 2000, `${s.id} alt ${s.altitudeKm}`);
      // A target cannot be closer than its own altitude: the shortest slant
      // range is straight up. Catches an ECI/ECF frame mix-up, which otherwise
      // produces angles that look superficially reasonable.
      assert.ok(
        s.rangeKm >= s.altitudeKm - 1,
        `${s.id} range ${s.rangeKm} < altitude ${s.altitudeKm}`,
      );
    }
  });

  test("a pass rises, culminates and sets rather than jumping", () => {
    const target = states.filter((s) => s.visible).sort((a, b) => b.elevationDeg - a.elevationDeg)[0];
    assert.ok(target, "expected at least one visible pass at T0");

    let previous = target.elevationDeg;
    for (let m = 1; m <= 10; m++) {
      const s = propagateAll(new Date(T0.getTime() + m * 60_000)).find((x) => x.id === target.id);
      assert.ok(s, "target left the catalogue mid-pass");
      // Elevation is continuous — a jump means the propagator or the frame
      // conversion is being re-seeded rather than advanced.
      assert.ok(
        Math.abs(s.elevationDeg - previous) < 45,
        `${target.id} elevation jumped ${previous.toFixed(1)} -> ${s.elevationDeg.toFixed(1)}`,
      );
      previous = s.elevationDeg;
    }
  });

  test("range rate is signed and physically bounded", () => {
    for (const s of states) {
      // Nothing in LEO closes or opens faster than its own orbital speed.
      assert.ok(Math.abs(s.rangeRateKmS) < 9, `${s.id} range rate ${s.rangeRateKmS}`);
    }
  });
});

describe("beam plan", () => {
  const plan = planBeams(propagateAll(T0));

  test("budget is the dome's channel count, and a target costs six beams", () => {
    assert.equal(plan.beamsTotal, PRESENT_FACES.length * BEAMS.beamsPerFace);
    assert.equal(BEAMS_PER_TARGET, 6);
    assert.equal(plan.beamsUsed, plan.assignments.length * BEAMS_PER_TARGET);
  });

  test("never commits more beams than the dome has", () => {
    assert.ok(plan.beamsUsed <= plan.beamsTotal);
  });

  test("no face is oversubscribed", () => {
    const perFace = new Map<number, number>();
    for (const a of plan.assignments) {
      perFace.set(a.faceNum, (perFace.get(a.faceNum) ?? 0) + a.beams);
    }
    for (const [faceNum, used] of perFace) {
      assert.ok(used <= BEAMS.beamsPerFace, `F${faceNum} used ${used} of ${BEAMS.beamsPerFace}`);
    }
  });

  test("every assignment sits inside its face's scan limit", () => {
    for (const a of plan.assignments) {
      assert.ok(
        a.offBoresightDeg <= TRACKING.faceScanLimitDeg,
        `${a.satelliteId} on F${a.faceNum} at ${a.offBoresightDeg.toFixed(1)}°`,
      );
    }
  });

  test("assigned plus rejected accounts for every visible target", () => {
    assert.equal(plan.assignments.length + plan.rejected.length, plan.visibleCount);
  });

  test("only visible targets are ever assigned", () => {
    const visible = new Set(propagateAll(T0).filter((s) => s.visible).map((s) => s.id));
    for (const a of plan.assignments) {
      assert.ok(visible.has(a.satelliteId), `${a.satelliteId} assigned while not visible`);
    }
  });
});

describe("monopulse cluster", () => {
  const beams = beamDirections(120, 40);

  test("is five tracking beams and one data beam", () => {
    assert.equal(beams.length, BEAMS_PER_TARGET);
    assert.equal(beams.filter((b) => b.role === "tracking").length, BEAMS.trackingBeamsPerTarget);
    assert.equal(beams.filter((b) => b.role === "data").length, BEAMS.dataBeamsPerTarget);
  });

  test("the four difference beams are squinted off boresight in opposing pairs", () => {
    const by = Object.fromEntries(beams.map((b) => [b.id, b]));
    // Opposed pairs are what produce a difference signal. If a pair collapsed
    // onto boresight the pointing loop would have no error to null, and the
    // array would track open-loop — which looks fine until the pass drifts.
    assert.ok(by["ΔAZ+"].azimuthDeg > by["SUM"].azimuthDeg);
    assert.ok(by["ΔAZ−"].azimuthDeg < by["SUM"].azimuthDeg);
    assert.ok(by["ΔEL+"].elevationDeg > by["SUM"].elevationDeg);
    assert.ok(by["ΔEL−"].elevationDeg < by["SUM"].elevationDeg);
  });

  test("azimuth squint widens with elevation", () => {
    // A degree of azimuth subtends less sky the higher you look, so a fixed
    // azimuth offset would collapse the cluster near zenith — exactly where
    // angular rates are highest and tracking is hardest.
    const spread = (el: number) => {
      const b = beamDirections(120, el);
      return b[1].azimuthDeg - b[2].azimuthDeg;
    };
    assert.ok(spread(80) > spread(20), "cluster must widen in azimuth as elevation rises");
  });

  test("elevation squint never leaves the 0..90 band", () => {
    for (const el of [0, 1, 89, 90]) {
      for (const b of beamDirections(200, el)) {
        assert.ok(b.elevationDeg >= 0 && b.elevationDeg <= 90, `el ${el} produced ${b.elevationDeg}`);
      }
    }
  });

  /**
   * The reason a target costs five tracking beams.
   *
   * The array is steered where the target was PREDICTED to be and holds that
   * direction while the target keeps moving. If the five footprints do not
   * cover the whole circle it can drift into, there is a direction in which a
   * contact is silently dropped — and it is the diagonals that go first, which
   * is exactly the case a hand-check of "left, right, up, down" misses.
   */
  test("some beam still holds the target wherever it drifts inside the repoint radius", () => {
    for (const [az, el] of [[120, 40], [10, 8], [275, 78], [359, 55]]) {
      const cluster = beamDirections(az, el);
      // The commanded direction is the cluster's, so drift is measured from
      // there. Sampled over the full circle of directions, not just the four
      // the beams are named after.
      for (let bearing = 0; bearing < 360; bearing += 5) {
        for (const drift of [0.05, 0.25, 0.5, 0.75, 1].map((f) => f * REPOINT_DEG)) {
          // Step off in a great-circle-ish direction: the azimuth component is
          // widened by cos(el) for the same reason the cluster's is.
          const r = (bearing * Math.PI) / 180;
          const driftAz = az + (drift * Math.sin(r)) / Math.max(0.2, Math.cos((el * Math.PI) / 180));
          const driftEl = el + drift * Math.cos(r);
          if (driftEl < 0 || driftEl > 90) continue;

          const held = carryingBeamIndex(cluster, driftAz, driftEl);
          const sep = separationDeg(
            driftAz,
            driftEl,
            cluster[held].azimuthDeg,
            cluster[held].elevationDeg,
          );
          assert.ok(
            sep <= BEAM_HALF_WIDTH_DEG + 1e-9,
            `drift ${drift.toFixed(3)}° on bearing ${bearing}° from az ${az} el ${el} `
              + `landed ${sep.toFixed(3)}° from the nearest beam centre, outside the `
              + `${BEAM_HALF_WIDTH_DEG}° footprint — the cluster has a gap`,
          );
        }
      }
    }
  });

  test("the beam holding the target changes as it drifts off the commanded direction", () => {
    const cluster = beamDirections(120, 40);
    // On the commanded direction the sum beam holds it; a full drift up in
    // elevation hands it to the beam squinted that way. If this collapsed to
    // "always the sum beam" the other four would be decoration.
    assert.equal(carryingBeamIndex(cluster, 120, 40), 0);
    const up = carryingBeamIndex(cluster, 120, 40 + REPOINT_DEG);
    assert.equal(cluster[up].id, "ΔEL+");
    const down = carryingBeamIndex(cluster, 120, 40 - REPOINT_DEG);
    assert.equal(cluster[down].id, "ΔEL−");
  });
});

describe("capacity — the question the panel answers", () => {
  test("the beam budget alone would carry far more than the sky presents", () => {
    // The headline finding: the limit is geometry, not hardware. If this ever
    // inverts, the panel's whole argument changes and the copy needs revising.
    const budget = Math.floor((PRESENT_FACES.length * BEAMS.beamsPerFace) / BEAMS_PER_TARGET);
    let peakVisible = 0;
    for (let m = 0; m < 360; m += 5) {
      const plan = planBeams(propagateAll(new Date(T0.getTime() + m * 60_000)));
      peakVisible = Math.max(peakVisible, plan.visibleCount);
    }
    assert.ok(budget >= 60, `budget carries only ${budget} targets`);
    assert.ok(
      peakVisible < budget,
      `sky presented ${peakVisible} targets against a budget of ${budget} — hardware is now the limit`,
    );
  });
});
