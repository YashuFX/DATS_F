/**
 * Beam assignment — which faces serve which targets, and where the budget runs
 * out.
 *
 * Pure: satellite states in, a plan out. This is the module that answers "can
 * this aperture track 70 spacecraft at once", and it answers it with two
 * separate limits that fail for different reasons:
 *
 *   GEOMETRY   a target must sit inside some face's scan cone. The dome covers
 *              the hemisphere between its 26 faces, but no single face covers
 *              more than ±`faceScanLimitDeg` off its own boresight.
 *   BUDGET     forming a beam costs a receiver chain. Each face has
 *              `beamsPerFace` of them, and each target costs six.
 *
 * Reporting them separately matters: "we cannot see it" and "we can see it but
 * have no channel left" are different faults with different fixes, and a
 * single "tracked / not tracked" flag would hide which one is biting.
 */

import { PRESENT_FACES } from "@/features/dome-monitor/data/geometry";
import {
  BEAMS,
  BEAMS_PER_TARGET,
  MONOPULSE_SQUINT_DEG,
  TRACKING,
} from "../data/mnc.mock";
import type { SatelliteState } from "./lookAngles";

export interface BeamAssignment {
  satelliteId: string;
  /** FceNum of the face carrying this target's beams. */
  faceNum: number;
  /** Degrees off that face's boresight — scan loss grows with this. */
  offBoresightDeg: number;
  /** Beams committed: 5 monopulse + 1 data. */
  beams: number;
}

export type RejectReason = "out-of-view" | "no-face" | "no-beams";

export interface BeamPlan {
  assignments: BeamAssignment[];
  /** Visible but unserved, and why. */
  rejected: { satelliteId: string; reason: RejectReason }[];
  /** Above the mask and in range. */
  visibleCount: number;
  /** Beams committed vs the dome's total channel count. */
  beamsUsed: number;
  beamsTotal: number;
  /** Targets the budget alone could carry, ignoring geometry. */
  budgetCapacityTargets: number;
}

/** Unit vector in the station's east-north-up frame for a look direction. */
function enu(azimuthDeg: number, elevationDeg: number): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az), Math.sin(el)];
}

/**
 * Angle between two look directions, degrees.
 *
 * A true spherical separation, not a difference of azimuths: a degree of
 * azimuth at 70° of elevation is a third of a degree on the sky, and
 * subtracting the two coordinates would badly overstate the separation
 * anywhere near zenith — which is exactly where tracking is hardest and the
 * numbers matter most. Both sides reduce to the same ENU frame and the
 * separation is one dot product.
 *
 * Face boresights are stored the same way — the azimuth/elevation of the face
 * normal, measured from Must_cord.xlsx — so this serves both the face search
 * and the beam cluster.
 */
export function separationDeg(
  azimuthDeg: number,
  elevationDeg: number,
  otherAzDeg: number,
  otherElDeg: number,
): number {
  const a = enu(azimuthDeg, elevationDeg);
  const b = enu(otherAzDeg, otherElDeg);
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

const offBoresight = separationDeg;

/**
 * Plan beam assignments for one instant.
 *
 * Targets are served highest-elevation-first. That is the operationally right
 * order, not merely a tidy one: a high pass has the shortest slant range, the
 * least atmosphere in the path and the longest time left before it sets, so
 * spending scarce channels there returns the most data per beam.
 */
export function planBeams(states: SatelliteState[]): BeamPlan {
  const beamsTotal = PRESENT_FACES.length * BEAMS.beamsPerFace;
  const remaining = new Map<number, number>(
    PRESENT_FACES.map((f) => [f.fceNum, BEAMS.beamsPerFace]),
  );

  const visible = states.filter((s) => s.visible);
  const queue = [...visible].sort((a, b) => b.elevationDeg - a.elevationDeg);

  const assignments: BeamAssignment[] = [];
  const rejected: { satelliteId: string; reason: RejectReason }[] = [];
  let beamsUsed = 0;

  for (const sat of queue) {
    // Best face is the one whose boresight the target sits closest to: least
    // scan loss, and the widest margin before the pass steers out of its cone.
    let bestFace = -1;
    let bestOff = Infinity;
    for (const face of PRESENT_FACES) {
      const off = offBoresight(sat.azimuthDeg, sat.elevationDeg, face.azimuthDeg, face.elevationDeg);
      if (off < bestOff) {
        bestOff = off;
        bestFace = face.fceNum;
      }
    }

    if (bestFace < 0 || bestOff > TRACKING.faceScanLimitDeg) {
      rejected.push({ satelliteId: sat.id, reason: "no-face" });
      continue;
    }

    // Prefer the closest face, but fall back to any other in-cone face that
    // still has channels — a target near a shared edge is servable by either,
    // and refusing it because one face filled up would waste real capacity.
    let chosen = bestFace;
    let chosenOff = bestOff;
    if ((remaining.get(bestFace) ?? 0) < BEAMS_PER_TARGET) {
      chosen = -1;
      chosenOff = Infinity;
      for (const face of PRESENT_FACES) {
        if ((remaining.get(face.fceNum) ?? 0) < BEAMS_PER_TARGET) continue;
        const off = offBoresight(sat.azimuthDeg, sat.elevationDeg, face.azimuthDeg, face.elevationDeg);
        if (off <= TRACKING.faceScanLimitDeg && off < chosenOff) {
          chosenOff = off;
          chosen = face.fceNum;
        }
      }
    }

    if (chosen < 0) {
      rejected.push({ satelliteId: sat.id, reason: "no-beams" });
      continue;
    }

    remaining.set(chosen, (remaining.get(chosen) ?? 0) - BEAMS_PER_TARGET);
    beamsUsed += BEAMS_PER_TARGET;
    assignments.push({
      satelliteId: sat.id,
      faceNum: chosen,
      offBoresightDeg: chosenOff,
      beams: BEAMS_PER_TARGET,
    });
  }

  return {
    assignments,
    rejected,
    visibleCount: visible.length,
    beamsUsed,
    beamsTotal,
    budgetCapacityTargets: Math.floor(beamsTotal / BEAMS_PER_TARGET),
  };
}

/**
 * The cluster's weights, normalised to the fraction of a target's six-beam
 * allocation each beam receives.
 *
 * Computed once at module load rather than per call: `beamDirections` runs for
 * every tracked target on every frame, and this is a sum and three divisions
 * that cannot change between them.
 */
const SHARE = (() => {
  const w = BEAMS.weights;
  const differenceBeams = BEAMS.trackingBeamsPerTarget - 1;
  const total = w.sum + differenceBeams * w.difference + BEAMS.dataBeamsPerTarget * w.data;
  return { sum: w.sum / total, difference: w.difference / total, data: w.data / total };
})();

/**
 * The six beam directions for one COMMANDED pointing.
 *
 * The argument is where the array has been told to look, which is not the same
 * thing as where the spacecraft is. That gap is the whole reason there are
 * five tracking beams rather than one.
 *
 * A prediction is never exact — the ephemeris is hours old, the pointing is
 * updated at a finite rate, and the target keeps moving between updates — so
 * the array cannot rely on the spacecraft sitting on boresight. Instead it
 * forms a CLUSTER: one beam on the commanded direction and four squinted by
 * `monopulseSquintDeg` left, right, up and down. Wherever the target has
 * drifted to, it is still inside one of the five, so the contact is never
 * dropped while the pointing catches up. The imbalance between the opposite
 * pairs is also the error signal the pointing loop nulls, which is what tells
 * the array which way to correct.
 *
 * The sixth beam is the data downlink. It is not a fixed direction of its own:
 * it is steered onto whichever tracking beam currently holds the target — see
 * `carryingBeamIndex` — because the data has to come down the beam the
 * spacecraft is actually in.
 */
export function beamDirections(azimuthDeg: number, elevationDeg: number) {
  const q = MONOPULSE_SQUINT_DEG;
  // Azimuth squint grows as elevation rises: near zenith a degree of azimuth
  // subtends almost nothing on the sky, so a fixed azimuth offset would
  // collapse the cluster exactly where tracking is hardest.
  const azScale = 1 / Math.max(0.2, Math.cos((elevationDeg * Math.PI) / 180));
  const w = BEAMS.weights;
  return [
    { id: "SUM", role: "tracking" as const, weight: w.sum, share: SHARE.sum, azimuthDeg, elevationDeg },
    { id: "ΔAZ+", role: "tracking" as const, weight: w.difference, share: SHARE.difference, azimuthDeg: azimuthDeg + q * azScale, elevationDeg },
    { id: "ΔAZ−", role: "tracking" as const, weight: w.difference, share: SHARE.difference, azimuthDeg: azimuthDeg - q * azScale, elevationDeg },
    { id: "ΔEL+", role: "tracking" as const, weight: w.difference, share: SHARE.difference, azimuthDeg, elevationDeg: Math.min(90, elevationDeg + q) },
    { id: "ΔEL−", role: "tracking" as const, weight: w.difference, share: SHARE.difference, azimuthDeg, elevationDeg: Math.max(0, elevationDeg - q) },
    { id: "DATA", role: "data" as const, weight: w.data, share: SHARE.data, azimuthDeg, elevationDeg },
  ];
}

/** One beam of a cluster, as `beamDirections` returns it. */
export type ClusterBeam = ReturnType<typeof beamDirections>[number];

/** The five tracking beams, in the order `beamDirections` returns them. */
export const TRACKING_BEAM_COUNT = BEAMS.trackingBeamsPerTarget;

/**
 * Which of the five tracking beams the target is actually in.
 *
 * The one whose centre it lies nearest — that is the beam receiving the most
 * signal, so it is the one the data downlink is steered onto and the one whose
 * telemetry an operator should be reading. Returns the index into
 * `beamDirections`; index 0 (the sum beam) means the pointing is good and the
 * target is still near the commanded direction.
 */
export function carryingBeamIndex(
  beams: ReturnType<typeof beamDirections>,
  azimuthDeg: number,
  elevationDeg: number,
): number {
  let best = 0;
  let bestSep = Infinity;
  for (let i = 0; i < TRACKING_BEAM_COUNT; i++) {
    const sep = separationDeg(azimuthDeg, elevationDeg, beams[i].azimuthDeg, beams[i].elevationDeg);
    if (sep < bestSep) {
      bestSep = sep;
      best = i;
    }
  }
  return best;
}
