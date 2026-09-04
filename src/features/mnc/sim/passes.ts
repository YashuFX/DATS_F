/**
 * Upcoming passes, found by searching the same propagator the globe draws.
 *
 * The scheduler used to list five hand-written rows. Beside a live tracking
 * display that is worse than an empty table: it invites an operator to plan
 * against times that have no relationship to where the spacecraft actually
 * are. These come from the same SGP4 states, so a pass listed here is a pass
 * the globe will show.
 */

import { propagateAll, _lookAngleFor, satrecFor } from "./lookAngles";
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


/* ────────────────────────────────────────────────────────────────────────────
   ONE SATELLITE, IN PROFILE

   `findPasses` answers "what is the whole sky doing" and pays 250 SGP4 calls
   per step to do it. The tracking console asks a different question — "what is
   THIS spacecraft doing for the next day" — and answering it through the bulk
   propagator would be around 350 000 propagations for a picture of one object.
   Sampling a single satrec is the same search at 1/250th the cost, which is
   what makes a 24-hour elevation profile something a panel can just ask for.
   ──────────────────────────────────────────────────────────────────────────── */

/** One point on a pass's elevation profile. */
export interface ProfilePoint {
  /** Epoch ms. */
  t: number;
  elevationDeg: number;
  azimuthDeg: number;
  rangeKm: number;
}

export interface SatellitePass extends Pass {
  /** Elevation through the pass, for drawing its arc. */
  profile: ProfilePoint[];
  /** Slant range at the two horizon crossings, km. */
  rangeAtAosKm: number;
  rangeAtLosKm: number;
}

/**
 * Every pass of ONE satellite over the fence within the horizon, with the
 * elevation profile that draws each arc.
 *
 * `stepS` is the sampling interval and therefore the accuracy of AOS and LOS:
 * a 30 s step can misplace either by up to 30 s, immaterial for a schedule read
 * to the minute and for an arc drawn a few hundred pixels wide. Refining the
 * boundaries by bisection is the thing to add the day these times command an
 * antenna rather than inform a person.
 *
 * The profile carries the SAMPLED points only — the caller draws through them.
 * Interpolating here would invent detail the propagation did not produce.
 */
export function findPassesFor(
  satelliteId: string,
  from: number,
  horizonMinutes = 24 * 60,
  stepS = 30,
  maxPasses = 20,
): SatellitePass[] {
  const satrec = satrecFor(satelliteId);
  if (!satrec) return [];

  const out: SatellitePass[] = [];
  const steps = Math.floor((horizonMinutes * 60) / stepS);
  let current: SatellitePass | null = null;

  const close = (pass: SatellitePass) => {
    pass.durationS = (pass.los - pass.aos) / 1000;
    // One sample above the mask is a graze, not a contact — listing it would
    // fill the schedule with rows no operator would act on.
    if (pass.durationS >= stepS) out.push(pass);
  };

  for (let i = 0; i <= steps && out.length < maxPasses; i++) {
    const t = from + i * stepS * 1000;
    const look = _lookAngleFor(satrec, t);
    if (!look) continue;

    if (look.visible) {
      const point: ProfilePoint = {
        t,
        elevationDeg: look.elevationDeg,
        azimuthDeg: look.azimuthDeg,
        rangeKm: look.rangeKm,
      };
      if (!current) {
        current = {
          satelliteId,
          aos: t,
          los: t,
          peakElevationDeg: look.elevationDeg,
          peakAzimuthDeg: look.azimuthDeg,
          minRangeKm: look.rangeKm,
          durationS: 0,
          profile: [point],
          rangeAtAosKm: look.rangeKm,
          rangeAtLosKm: look.rangeKm,
        };
      } else {
        current.los = t;
        current.profile.push(point);
        current.rangeAtLosKm = look.rangeKm;
        if (look.elevationDeg > current.peakElevationDeg) {
          current.peakElevationDeg = look.elevationDeg;
          current.peakAzimuthDeg = look.azimuthDeg;
        }
        if (look.rangeKm < current.minRangeKm) current.minRangeKm = look.rangeKm;
      }
    } else if (current) {
      close(current);
      current = null;
    }
  }

  // A pass still open at the horizon is real; it just has not ended yet.
  if (current && out.length < maxPasses) close(current);

  return out;
}

/**
 * The pass a satellite is in right now, if any.
 *
 * Returned from a list the caller already has rather than searched again: the
 * console needs both "which pass is running" and "what is coming next" from the
 * same set, and two independent searches could disagree at a boundary.
 */
export function currentPass<T extends Pass>(passes: T[], now: number): T | null {
  return passes.find((p) => now >= p.aos && now < p.los) ?? null;
}
