/**
 * Upcoming passes, found by searching the same propagator the globe draws.
 *
 * The scheduler used to list five hand-written rows. Beside a live tracking
 * display that is worse than an empty table: it invites an operator to plan
 * against times that have no relationship to where the spacecraft actually
 * are. These come from the same SGP4 states, so a pass listed here is a pass
 * the globe will show.
 */

import { propagateAll } from "./lookAngles";
import { TRACKING } from "../data/mnc.mock";

export interface Pass {
  satelliteId: string;
  /** Epoch ms. */
  aos: number;
  los: number;
  /** Highest elevation reached, degrees. */
  peakElevationDeg: number;
  /** Azimuth at closest approach, degrees. */
  peakAzimuthDeg: number;
  /** Minimum slant range over the pass, km. */
  minRangeKm: number;
  durationS: number;
}

export type PassPhase = "running" | "scheduled" | "complete";

export function passPhase(pass: Pass, now: number): PassPhase {
  if (now >= pass.los) return "complete";
  if (now >= pass.aos) return "running";
  return "scheduled";
}

/** Fraction of the pass elapsed, 0..1. */
export function passProgress(pass: Pass, now: number): number {
  if (now <= pass.aos) return 0;
  if (now >= pass.los) return 1;
  return (now - pass.aos) / (pass.los - pass.aos);
}

/**
 * Find every pass beginning within `horizonMinutes` of `from`.
 *
 * Coarse-stepped at `stepS` and not refined. A 30 s step can misplace an AOS
 * by up to 30 s, which is immaterial for a schedule an operator reads to the
 * minute, and refining every boundary by bisection would cost roughly ten
 * times the propagation for a precision the display cannot show. If AOS ever
 * needs to be exact — to command an antenna rather than to inform someone —
 * that refinement is the thing to add, and it belongs here.
 *
 * Deliberately capped: `maxPasses` bounds the work regardless of how busy the
 * sky is, so a denser catalogue cannot silently turn this into a long
 * synchronous loop on the main thread.
 */
export function findPasses(
  from: number,
  horizonMinutes = 180,
  stepS = 30,
  maxPasses = 40,
): Pass[] {
  const open = new Map<string, Pass>();
  const closed: Pass[] = [];
  const steps = Math.floor((horizonMinutes * 60) / stepS);

  for (let i = 0; i <= steps; i++) {
    const t = from + i * stepS * 1000;
    const states = propagateAll(new Date(t));

    const visibleNow = new Set<string>();
    for (const s of states) {
      if (!s.visible) continue;
      visibleNow.add(s.id);

      const existing = open.get(s.id);
      if (!existing) {
        open.set(s.id, {
          satelliteId: s.id,
          aos: t,
          los: t,
          peakElevationDeg: s.elevationDeg,
          peakAzimuthDeg: s.azimuthDeg,
          minRangeKm: s.rangeKm,
          durationS: 0,
        });
      } else {
        existing.los = t;
        if (s.elevationDeg > existing.peakElevationDeg) {
          existing.peakElevationDeg = s.elevationDeg;
          existing.peakAzimuthDeg = s.azimuthDeg;
        }
        if (s.rangeKm < existing.minRangeKm) existing.minRangeKm = s.rangeKm;
      }
    }

    // Anything that dropped below the mask this step has ended.
    for (const [id, pass] of open) {
      if (visibleNow.has(id)) continue;
      pass.durationS = (pass.los - pass.aos) / 1000;
      // One sample above the mask is a grazing pass, not a contact — listing
      // it would fill the schedule with entries no operator would act on.
      if (pass.durationS >= stepS) closed.push(pass);
      open.delete(id);
    }

    if (closed.length >= maxPasses) break;
  }

  // Passes still open at the horizon are real; they just have not ended yet.
  for (const pass of open.values()) {
    pass.durationS = (pass.los - pass.aos) / 1000;
    if (pass.durationS >= stepS) closed.push(pass);
  }

  return closed.sort((a, b) => a.aos - b.aos).slice(0, maxPasses);
}

/** Human-readable elevation class — how good a contact this is. */
export function passQuality(pass: Pass): "high" | "medium" | "low" {
  if (pass.peakElevationDeg >= 45) return "high";
  if (pass.peakElevationDeg >= 20) return "medium";
  return "low";
}

export { TRACKING };
