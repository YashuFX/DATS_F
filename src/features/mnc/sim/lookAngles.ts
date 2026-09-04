/**
 * Propagation and look angles — SGP4 in, topocentric az/el/range out.
 *
 * Pure and synchronous: no React, no store, no Cesium. The panel, the beam
 * planner and the tests all read the same numbers from here, which is what
 * stops the picture and the readouts disagreeing.
 */

// Named imports, not `import * as`. The package re-exports its submodules
// with `export * as`, and a namespace import of that barrel wedges the
// Turbopack production build indefinitely — it compiles in 13 s without it and
// never finishes with it. Named specifiers let the graph resolve normally.
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  eciToGeodetic,
  ecfToLookAngles,
  degreesLat,
  degreesLong,
  type SatRec,
} from "satellite.js";

/** Degree/radian conversion. Local rather than imported: satellite.js exports
 *  these at runtime but does not declare them in its v5 typings, and a
 *  multiply is not worth a type assertion. */
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * SGP4 signals failure by returning `true` in place of a position vector, so
 * a truthiness check is not enough — `true` is truthy and would sail straight
 * into the frame conversions and come out as NaN look angles. Decayed or
 * otherwise unpropagatable objects have to be dropped explicitly.
 */
type Eci = { x: number; y: number; z: number };
function asEci(v: Eci | boolean | undefined): Eci | null {
  return v && typeof v === "object" ? v : null;
}
import { SITE, TRACKING } from "../data/mnc.mock";
import { buildDummyCatalogue, type DummyTle } from "./tle";

export interface SatelliteState {
  id: string;
  name: string;
  regime: DummyTle["regime"];
  /** Degrees, 0..360 clockwise from true north. */
  azimuthDeg: number;
  /** Degrees, 0 at the horizon, 90 at zenith. Negative = below the horizon. */
  elevationDeg: number;
  /** Slant range, km. */
  rangeKm: number;
  /** Range rate, km/s. Negative while closing — an approaching pass. */
  rangeRateKmS: number;
  /** Sub-satellite point and altitude, for the globe. */
  latDeg: number;
  lonDeg: number;
  altitudeKm: number;
  /** Inside the station's tracking volume: above the elevation mask and in range. */
  visible: boolean;
}

/** Parsed once — `twoline2satrec` is the expensive half of SGP4. */
let catalogue: { tle: DummyTle; satrec: SatRec }[] | null = null;

export function getCatalogue() {
  if (!catalogue) {
    catalogue = buildDummyCatalogue().map((tle) => ({
      tle,
      satrec: twoline2satrec(tle.line1, tle.line2),
    }));
  }
  return catalogue;
}

const OBSERVER = {
  latitude: toRad(SITE.latDeg),
  longitude: toRad(SITE.lonDeg),
  height: SITE.heightM / 1000, // km
};

/**
 * State of every catalogued object at `when`.
 *
 * Range rate is differenced over a one-second step rather than taken from the
 * propagator's velocity vector. The difference is small, but it is the rate
 * along the LINE OF SIGHT that an operator reads to know whether a pass is
 * opening or closing, and projecting the velocity onto that line costs the
 * same arithmetic with more room to get the frame wrong.
 */
export function propagateAll(when: Date): SatelliteState[] {
  const gmst = gstime(when);
  const later = new Date(when.getTime() + 1000);
  const gmstLater = gstime(later);

  const out: SatelliteState[] = [];

  for (const { tle, satrec } of getCatalogue()) {
    const position = asEci(propagate(satrec, when)?.position);
    if (!position) continue;

    const ecf = eciToEcf(position, gmst);
    const look = ecfToLookAngles(OBSERVER, ecf);
    const geo = eciToGeodetic(position, gmst);

    const azimuthDeg = (toDeg(look.azimuth) + 360) % 360;
    const elevationDeg = toDeg(look.elevation);
    const visible =
      elevationDeg >= TRACKING.elevationMaskDeg && look.rangeSat <= TRACKING.maxRangeKm;

    // Second propagation only for what is actually in view. Range rate is a
    // readout on tracked passes, and computing it for every object doubles the
    // per-tick SGP4 cost to produce numbers nothing displays — which at a
    // 250-object catalogue and 4 Hz is the difference between 5% and 10% of a
    // core spent on satellites nobody can see.
    let rangeRate = 0;
    if (visible) {
      const nextPosition = asEci(propagate(satrec, later)?.position);
      if (nextPosition) {
        const lookNext = ecfToLookAngles(OBSERVER, eciToEcf(nextPosition, gmstLater));
        rangeRate = lookNext.rangeSat - look.rangeSat;
      }
    }

    out.push({
      id: tle.id,
      name: tle.name,
      regime: tle.regime,
      azimuthDeg,
      elevationDeg,
      rangeKm: look.rangeSat,
      rangeRateKmS: rangeRate,
      latDeg: degreesLat(geo.latitude),
      lonDeg: degreesLong(geo.longitude),
      altitudeKm: geo.height,
      visible,
    });
  }

  return out;
}

/**
 * Sub-satellite point for one object at one instant.
 *
 * Separate from `propagateAll` because drawing an orbit track needs ninety
 * samples of ONE spacecraft, and reusing the bulk propagator would mean
 * propagating all seventy at each of those ninety epochs — 6 300 SGP4 calls to
 * draw one line.
 */
export function orbitSample(
  id: string,
  when: number,
): { latDeg: number; lonDeg: number; altitudeKm: number } | null {
  const record = getCatalogue().find((c) => c.tle.id === id);
  if (!record) return null;
  const date = new Date(when);
  const position = asEci(propagate(record.satrec, date)?.position);
  if (!position) return null;
  const geo = eciToGeodetic(position, gstime(date));
  return {
    latDeg: degreesLat(geo.latitude),
    lonDeg: degreesLong(geo.longitude),
    altitudeKm: geo.height,
  };
}
