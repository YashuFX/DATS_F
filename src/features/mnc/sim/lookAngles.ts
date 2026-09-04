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
  /** Catalogue number, as an operator would quote it. */
  noradId: string;
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
  /** Orbital speed, km/s.
   *
   *  Distinct from `rangeRateKmS`, and both are worth carrying: this is how
   *  fast the spacecraft is travelling, that is how fast the DISTANCE to it is
   *  changing. A pass at closest approach has a range rate near zero while
   *  still moving at 7.5 km/s, and a readout that conflated them would show a
   *  spacecraft apparently coasting to a halt overhead. */
  speedKmS: number;
  /** Inside the station's tracking volume: above the elevation mask and in range. */
  visible: boolean;
}

/** Orbit shape, from the TLE's own elements. Constant per object. */
export interface OrbitalElements {
  apogeeKm: number;
  perigeeKm: number;
  inclinationDeg: number;
  /** Orbital period, minutes. */
  periodMin: number;
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
    // The propagator returns position AND velocity from the same integration;
    // taking the speed here is free, where deriving it later would mean
    // propagating the object a second time.
    const propagated = propagate(satrec, when);
    const position = asEci(propagated?.position);
    if (!position) continue;
    const velocity = asEci(propagated?.velocity);

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
      noradId: tle.noradId,
      regime: tle.regime,
      azimuthDeg,
      elevationDeg,
      rangeKm: look.rangeSat,
      rangeRateKmS: rangeRate,
      latDeg: degreesLat(geo.latitude),
      lonDeg: degreesLong(geo.longitude),
      altitudeKm: geo.height,
      speedKmS: velocity
        ? Math.hypot(velocity.x, velocity.y, velocity.z)
        : 0,
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

/**
 * Orbit shape for one object, read off its own elements.
 *
 * Not measured by propagating and watching. The elements already state the
 * orbit exactly; sampling a revolution of SGP4 to rediscover its extremes
 * would be a hundred propagations to recover a number the input gave us.
 *
 * The semi-major axis comes from the mean motion by Kepler's third law rather
 * than from `satrec.a`. That property exists at runtime but is not in
 * satellite.js's v5 typings, and reaching past the declared surface with an
 * assertion to save one cube root is a bad trade — the assertion would keep
 * compiling if the field were ever renamed, and start returning NaN.
 *
 * `no` is the Kozai mean motion in radians per minute. Using it unconverted
 * puts apogee and perigee out by well under a kilometre, which is invisible at
 * the one decimal place these are displayed to.
 */
export function orbitalElements(id: string): OrbitalElements | null {
  const record = getCatalogue().find((c) => c.tle.id === id);
  if (!record) return null;
  const { ecco, inclo, no } = record.satrec;
  if (!(no > 0)) return null;

  const meanMotionRadS = no / 60;
  const semiMajorKm = Math.cbrt(EARTH_MU / (meanMotionRadS * meanMotionRadS));
  return {
    apogeeKm: semiMajorKm * (1 + ecco) - EARTH_RADIUS_KM,
    perigeeKm: semiMajorKm * (1 - ecco) - EARTH_RADIUS_KM,
    inclinationDeg: toDeg(inclo),
    periodMin: (2 * Math.PI) / no,
  };
}

/** WGS-84 equatorial radius, km. */
const EARTH_RADIUS_KM = 6378.137;
/** Earth's standard gravitational parameter, km³/s². */
const EARTH_MU = 398_600.4418;

/**
 * Look angles for ONE object at one instant.
 *
 * The single-object counterpart to `propagateAll`, and the reason both exist:
 * drawing a 24-hour elevation profile for the selected spacecraft needs ~1 400
 * samples of one object. Routing that through the bulk propagator would be
 * 350 000 SGP4 calls to answer a question about a single satellite.
 */
export function lookAngleAt(
  id: string,
  when: number,
): { azimuthDeg: number; elevationDeg: number; rangeKm: number; visible: boolean } | null {
  const record = getCatalogue().find((c) => c.tle.id === id);
  if (!record) return null;
  return lookAngleFor(record.satrec, when);
}

function lookAngleFor(satrec: SatRec, when: number) {
  const date = new Date(when);
  const position = asEci(propagate(satrec, date)?.position);
  if (!position) return null;
  const look = ecfToLookAngles(OBSERVER, eciToEcf(position, gstime(date)));
  const elevationDeg = toDeg(look.elevation);
  return {
    azimuthDeg: (toDeg(look.azimuth) + 360) % 360,
    elevationDeg,
    rangeKm: look.rangeSat,
    visible:
      elevationDeg >= TRACKING.elevationMaskDeg && look.rangeSat <= TRACKING.maxRangeKm,
  };
}

/** Internal: the parsed record for one id, for callers that sample in a loop. */
export function satrecFor(id: string): SatRec | null {
  return getCatalogue().find((c) => c.tle.id === id)?.satrec ?? null;
}

export { lookAngleFor as _lookAngleFor };
