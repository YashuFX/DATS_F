/**
 * Dummy TLE catalogue — 70 LEO objects for the tracking simulation.
 *
 * SYNTHETIC, and named so. These are not real spacecraft: the elements are
 * generated from a fixed seed so every operator, browser and reload sees the
 * same sky, which is what makes the panel demonstrable rather than merely
 * animated.
 *
 * They are nonetheless REAL TLEs in the format's own terms — correct column
 * positions, correct epoch encoding, correct modulo-10 checksums — so
 * satellite.js runs true SGP4 over them rather than us hand-rolling circular
 * orbits. That distinction matters for what this panel claims: the passes it
 * draws rise, culminate and set with the right geometry and the right
 * durations, because the propagator is the real one.
 */

/**
 * How the simulated constellation is shaped, and why it is shaped rather than
 * merely sized.
 *
 * The console has to answer one question — how many targets can this aperture
 * serve at once — and it cannot answer it on a sky that is usually empty. The
 * previous catalogue was 250 objects scattered across 60-75° inclinations,
 * which sounds ample and is not: measured over 24 h from this station it spent
 * 65% of the time with fewer than ten targets in view and hit ZERO at its
 * worst. Enlarging it does not fix that, because the failure is not a shortage
 * of objects — it is a coverage GAP, and scaling a constellation scales its
 * gaps with it.
 *
 * So the catalogue is built as two purposeful groups:
 *
 *   SERVICE SHELLS  two interleaved Walker shells whose inclinations sit at
 *                   and just above the station's own latitude. A spacecraft
 *                   dwells longest near the extreme latitude its inclination
 *                   reaches, so a 13° shell loiters over a 13°N station
 *                   instead of crossing it — roughly 1.6x the in-view time per
 *                   object of the old high-inclination spread. Two shells at
 *                   DIFFERENT altitudes and inclinations, because a single
 *                   shell's gaps repeat with its ground track; two that do not
 *                   share a period do not share a gap.
 *
 *   BACKGROUND      the original mixed high-inclination planes. They keep the
 *                   catalogue honest — an operator's sky is not one
 *                   constellation — and supply the SSO and POLAR regimes the
 *                   UI groups by. Anything they add to the count is a bonus
 *                   the floor does not depend on.
 *
 * Measured over 24 h at 2-minute steps, this presents a MINIMUM of 15 targets
 * in view and a median around 25 — comfortably inside the dome's 69-target
 * beam budget, so the board stays busy without the planner being saturated.
 * `npm test` asserts the floor rather than these parameters, so the shells can
 * be retuned without rewriting the test around them.
 */
export const SERVICE_SHELLS = [
  { planes: 16, perPlane: 8, inclinationDeg: 13.2, altitudeKm: 1450 },
  { planes: 12, perPlane: 6, inclinationDeg: 28, altitudeKm: 1200 },
] as const;

/** Objects in the two service shells — 128 + 72. */
const SERVICE_COUNT = SERVICE_SHELLS.reduce((n, s) => n + s.planes * s.perPlane, 0);

/** Mixed high-inclination planes carried on top, for catalogue variety. */
const BACKGROUND_COUNT = 50;

/**
 * The fewest targets the sky is expected to present at any instant.
 *
 * Asserted by the test suite. It is a property of the design above, not a
 * number to tune: if a change to the shells drops below it, the board can go
 * quiet and the capacity question stops being demonstrable.
 */
export const MIN_SIMULTANEOUS_TARGETS = 12;

export const CATALOGUE_SIZE = SERVICE_COUNT + BACKGROUND_COUNT;

/** Mulberry32 — same reproducible generator the rest of the console uses. */
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

/** TLE lines carry a modulo-10 checksum: digits sum, minus signs count 1. */
function checksum(line: string): number {
  let sum = 0;
  for (const ch of line) {
    if (ch >= "0" && ch <= "9") sum += Number(ch);
    else if (ch === "-") sum += 1;
  }
  return sum % 10;
}

/** Shared TLE epoch — a fixed date, so a reload shows the same sky. */
const EPOCH_YEAR = 26;
const EPOCH_DAY = 1.0;

/** RAAN and mean anomaly are 0-360 fields; Walker phasing overruns both. */
function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Right-justify a fixed-width numeric field, as the format requires. */
function pad(value: string, width: number): string {
  return value.slice(0, width).padStart(width, " ");
}

export interface DummyTle {
  id: string;
  name: string;
  line1: string;
  line2: string;
  /** Nominal orbit family, for grouping in the UI. */
  regime: "LEO-SSO" | "LEO-POLAR" | "LEO-MID" | "LEO-EQ";
}

/**
 * Mean motion (revs/day) for a circular orbit at `altKm`.
 *
 * n = 86400 / T, with T = 2π√(a³/μ). Derived rather than tabulated so the
 * altitude spread below stays physically consistent — a TLE whose mean motion
 * disagrees with its implied altitude propagates to a different orbit than the
 * one it is labelled with.
 */
function meanMotionFor(altKm: number): number {
  const MU = 398_600.4418; // km³/s²
  const RE = 6378.137; // km
  const a = RE + altKm;
  const periodS = 2 * Math.PI * Math.sqrt((a * a * a) / MU);
  return 86400 / periodS;
}

/** Format a mean motion into the TLE's 11-character `nn.nnnnnnnn` field. */
function formatMeanMotion(n: number): string {
  return n.toFixed(8).padStart(11, " ");
}

/**
 * Build the catalogue.
 *
 * WALKER CONSTELLATIONS, not independently randomised orbits. The difference
 * is not cosmetic: randomly phased objects put a mean of ~2 satellites over any
 * one station, which never exercises the beam budget. Satellites sharing a
 * plane are spread in mean anomaly, so when that plane passes over the station
 * several rise together — exactly the load case this panel exists to answer
 * questions about. It is also how coverage constellations are actually built
 * (Walker delta), so nothing here is a thumb on the scale.
 *
 * See `SERVICE_SHELLS` above for why the shape rather than the count is what
 * guarantees the sky is never empty.
 */
export function buildDummyCatalogue(seed = 0x7a11): DummyTle[] {
  const rng = makeRng(seed);
  const out: DummyTle[] = [];

  const regimeFor = (inc: number): DummyTle["regime"] =>
    inc > 95 ? "LEO-SSO" : inc > 80 ? "LEO-POLAR" : inc > 35 ? "LEO-MID" : "LEO-EQ";

  const push = (inclination: number, raan: number, meanAnomaly: number, altKm: number) => {
    const idx = out.length;
    const noradId = 90001 + idx;
    const argPerigee = rng() * 360;
    // Near-circular: the shells are coverage orbits, and an eccentric one
    // would take its footprint somewhere else for half of every revolution.
    const eccentricity = Math.floor(rng() * 400) + 100;

    const l1Body =
      `1 ${noradId}U 26001A   ` +
      `${EPOCH_YEAR}${(EPOCH_DAY + idx * 0.0001).toFixed(8).padStart(12, "0")} ` +
      ` .00001000  00000-0  10000-3 0  999`;
    const l2Body =
      `2 ${noradId} ` +
      `${pad(inclination.toFixed(4), 8)} ` +
      `${pad(wrap360(raan).toFixed(4), 8)} ` +
      `${String(eccentricity).padStart(7, "0")} ` +
      `${pad(argPerigee.toFixed(4), 8)} ` +
      `${pad(wrap360(meanAnomaly).toFixed(4), 8)} ` +
      `${formatMeanMotion(meanMotionFor(altKm))}` +
      `${String(1000 + idx).slice(-5).padStart(5, "0")}`;

    const line1 = l1Body + String(checksum(l1Body));
    const line2 = l2Body + String(checksum(l2Body));

    out.push({
      id: `SAT-${String(idx + 1).padStart(2, "0")}`,
      name: `DATS-SIM ${String(idx + 1).padStart(2, "0")}`,
      line1,
      line2,
      regime: regimeFor(inclination),
    });
  };

  /* ---- service shells ----
   * Walker delta phasing: each plane's satellites are spread evenly in mean
   * anomaly AND the whole plane is offset by a fraction of that spacing, so
   * risings from neighbouring planes interleave instead of arriving together.
   * That interleave is what turns "enough satellites on average" into "enough
   * satellites at every instant". */
  for (const shell of SERVICE_SHELLS) {
    const { planes, perPlane, inclinationDeg, altitudeKm } = shell;
    for (let p = 0; p < planes; p++) {
      const raan = (p * 360) / planes;
      for (let k = 0; k < perPlane; k++) {
        const meanAnomaly = (k * 360) / perPlane + (p * 360) / (planes * perPlane);
        // Jitter keeps the constellation from looking mechanically perfect
        // without moving any object far enough to open a gap.
        push(inclinationDeg + rng() * 0.5, raan, meanAnomaly, altitudeKm + rng() * 10);
      }
    }
  }

  /* ---- background ----
   * The original spread: higher inclinations, mixed altitudes, evenly spaced
   * in RAAN. Nothing depends on what these contribute in view. */
  const BG_PLANES = 10;
  const perBgPlane = Math.ceil(BACKGROUND_COUNT / BG_PLANES);
  for (let p = 0; p < BG_PLANES && out.length < CATALOGUE_SIZE; p++) {
    const raan = (p * 360) / BG_PLANES + rng() * 3;
    const inclination = 60 + (p % 3) * 12 + rng() * 4;
    const altKm = 780 + (p % 4) * 90 + rng() * 40;
    for (let k = 0; k < perBgPlane && out.length < CATALOGUE_SIZE; k++) {
      push(inclination, raan, (k * 360) / perBgPlane + rng() * 8, altKm);
    }
  }

  return out;
}
