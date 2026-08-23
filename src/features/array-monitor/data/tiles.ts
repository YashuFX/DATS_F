import type { ArrayElement, ArrayTotals, HealthId, Tile } from "../types";

/**
 * The nine subarray tiles and their 576 elements.
 *
 * Element values are generated rather than listed: 576 hand-written literals
 * would be unreadable and would drift from the tile summaries above them. The
 * generator is deterministic — a fixed seed, no `Math.random` — so the server
 * render and the client hydration produce identical markup, which is the same
 * discipline `data-archival/data/seed.ts` follows for its timestamps.
 */

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

export const TILE_IDS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"] as const;

/** Per-tile headline telemetry, transcribed from the console's tile summary. */
const TILE_SEED: Record<
  string,
  Omit<Tile, "elements"> & { faults?: [number, number, HealthId][] }
> = {
  A1: { id: "A1", health: "nominal", tempC: 39.4, powerW: 22.4, beams: 8, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 3.1, gainErrorDb: 0.08, vswr: 1.12 },
  A2: { id: "A2", health: "nominal", tempC: 41.2, powerW: 23.1, beams: 4, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 4.0, gainErrorDb: 0.11, vswr: 1.18 },
  A3: { id: "A3", health: "nominal", tempC: 40.5, powerW: 22.8, beams: 6, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 3.6, gainErrorDb: 0.09, vswr: 1.15 },
  B1: { id: "B1", health: "nominal", tempC: 42.1, powerW: 24.0, beams: 8, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 4.4, gainErrorDb: 0.12, vswr: 1.21 },
  // The one tile carrying a real fault: a PLL that will not hold lock, which
  // shows up as a hot chassis, a lost clock and two degraded elements.
  B2: { id: "B2", health: "degraded", tempC: 48.7, powerW: 26.2, beams: 5, clocksLocked: 7, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 13.8, gainErrorDb: 0.31, vswr: 1.62, faults: [[3, 4, "degraded"], [6, 1, "critical"]] },
  B3: { id: "B3", health: "nominal", tempC: 38.9, powerW: 21.9, beams: 6, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 2.9, gainErrorDb: 0.07, vswr: 1.10 },
  C1: { id: "C1", health: "nominal", tempC: 39.8, powerW: 22.2, beams: 8, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 3.3, gainErrorDb: 0.08, vswr: 1.14 },
  C2: { id: "C2", health: "nominal", tempC: 40.1, powerW: 22.5, beams: 4, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 3.8, gainErrorDb: 0.10, vswr: 1.17 },
  C3: { id: "C3", health: "nominal", tempC: 41.5, powerW: 23.4, beams: 8, clocksLocked: 8, clocksTotal: 8, auroraLink: true, fanOn: true, phaseErrorDeg: 3.5, gainErrorDb: 0.09, vswr: 1.16 },
};

/**
 * Amplitude falls off from the array's centre — a real aperture is tapered to
 * suppress side lobes, so a flat grid would look synthetic. Tile position
 * within the 3x3 therefore decides how bright its elements read.
 */
function buildElements(tileId: string, index: number, faults: [number, number, HealthId][]): ArrayElement[] {
  const rng = makeRng(0x5eed + index * 977);
  const tileRow = Math.floor(index / 3);
  const tileCol = index % 3;
  const out: ArrayElement[] = [];

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      // Absolute position in the 24x24 aperture, so the taper is continuous
      // across tile boundaries instead of restarting in each tile.
      const absRow = tileRow * 8 + row;
      const absCol = tileCol * 8 + col;
      const dist = Math.hypot(absRow - 11.5, absCol - 11.5);
      const amplitude = Math.min(1, Math.max(0.12, 1 - dist / 17 + (rng() - 0.5) * 0.07));
      const phase = Math.round(Math.sin((absRow * absCol) / 10) * 120 + (rng() - 0.5) * 8);

      const fault = faults.find(([r, c]) => r === row && c === col);
      out.push({
        row,
        col,
        amplitude: Number(amplitude.toFixed(2)),
        phase,
        // Rows alternate feeds, which is how a dual-polarised aperture is wired.
        polarization: absRow % 2 === 0 ? "H" : "V",
        health: fault ? fault[2] : "nominal",
      });
    }
  }
  return out;
}

export const TILES: Tile[] = TILE_IDS.map((id, index) => {
  const { faults = [], ...rest } = TILE_SEED[id];
  return { ...rest, elements: buildElements(id, index, faults) };
});

export const TILE_MAP: Record<string, Tile> = Object.fromEntries(TILES.map((t) => [t.id, t]));

export const ARRAY_TOTALS: ArrayTotals = (() => {
  const elements = TILES.flatMap((t) => t.elements);
  const offline = elements.filter((e) => e.health === "critical").length;
  return {
    elementsTotal: elements.length,
    elementsOnline: elements.length - offline,
    beamsActive: TILES.reduce((sum, t) => sum + t.beams, 0),
    beamsTotal: TILES.length * 8,
    meanPhaseErrorDeg:
      TILES.reduce((sum, t) => sum + t.phaseErrorDeg, 0) / TILES.length,
    availabilityPercent: ((elements.length - offline) / elements.length) * 100,
  };
})();

/** Operating limits the console flags against. */
export const THRESHOLDS = {
  phaseJitterDeg: 12,
  gainJitterDb: 0.25,
  vswrMax: 1.5,
} as const;
