import type {
  Antenna,
  Conflict,
  GroundStation,
  LinkLock,
  OrbitClass,
  PassRecord,
  Priority,
  SatellitePass,
} from "../types";

/**
 * The scheduling window, generated deterministically.
 *
 * Tender J.1.1 asks for at least 70 satellites scheduled simultaneously, so the
 * catalogue carries 70 and the window books passes from it. Everything is
 * produced by a seeded PRNG rather than `Math.random`, so the server render and
 * the client hydration agree — the same discipline the array monitor follows.
 */

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

/**
 * The stations this scheduler books against — all ISRO sites on Indian soil.
 *
 * The overseas ISTRAC station at Brunei was dropped and Hassan (MCF) put in its
 * place, and BYL was relabelled: it is Byalalu, the Indian Deep Space Network
 * site outside Bengaluru, not a terminal at Bhopal.
 */
/**
 * One station. The console drives a single aperture at Bengaluru, so there is
 * nothing to disambiguate and nothing to name in the interface — every task on
 * this screen is understood to be on that aperture.
 */
export const STATION: GroundStation = {
  id: "BLR",
  name: "Bengaluru (ISTRAC)",
  latDeg: 13.0389,
  lonDeg: 77.5124,
};

export const STATIONS: GroundStation[] = [STATION];

/**
 * Track slots — the timeline's swimlanes.
 *
 * With a single aperture there is no second antenna to book against, so these
 * are not hardware: they are the concurrency lanes the schedule is packed into,
 * and a conflict is two passes landing in the same lane at the same time. They
 * are never shown, deliberately. Naming a lane would imply a second dish.
 */
export const ANTENNAS: Antenna[] = Array.from({ length: 8 }, (_, i) => ({
  id: `TRK-${String(i + 1).padStart(2, "0")}`,
  stationId: STATION.id,
}));

const FAMILIES: {
  prefix: string;
  orbit: OrbitClass;
  band: [number, number];
  priority: Priority;
}[] = [
  { prefix: "RISAT", orbit: "SSO", band: [8025, 8400], priority: 1 },
  { prefix: "CARTOSAT", orbit: "SSO", band: [8025, 8400], priority: 1 },
  { prefix: "OCEANSAT", orbit: "SSO", band: [8100, 8300], priority: 2 },
  { prefix: "RESOURCESAT", orbit: "SSO", band: [8125, 8350], priority: 2 },
  { prefix: "INSAT", orbit: "GEO", band: [4500, 4800], priority: 1 },
  { prefix: "GSAT", orbit: "GEO", band: [4500, 4800], priority: 2 },
  { prefix: "NAVIC", orbit: "MEO", band: [2200, 2290], priority: 2 },
  { prefix: "ASTROSAT", orbit: "HEO", band: [2200, 2290], priority: 3 },
  { prefix: "SCATSAT", orbit: "LEO", band: [2200, 2290], priority: 3 },
  { prefix: "MICROSAT", orbit: "LEO", band: [2200, 2290], priority: 3 },
];

export const MODULATIONS = ["QPSK", "OQPSK", "8PSK", "BPSK", "16APSK"];

export interface Satellite {
  name: string;
  noradId: number;
  orbitClass: OrbitClass;
  priority: Priority;
  frequencyMHz: number;
}

/** 70 satellites — the minimum simultaneous capacity tender J.1.1 specifies. */
export const CATALOGUE: Satellite[] = (() => {
  const rng = makeRng(0x5c4ed);
  return Array.from({ length: 70 }, (_, i) => {
    const family = FAMILIES[i % FAMILIES.length];
    const series = Math.floor(i / FAMILIES.length) + 1;
    return {
      name: `${family.prefix}-${String(series).padStart(2, "0")}${i % 3 === 0 ? "A" : ""}`,
      noradId: 40000 + i * 37,
      orbitClass: family.orbit,
      priority: family.priority,
      frequencyMHz: Math.round(
        family.band[0] + rng() * (family.band[1] - family.band[0]),
      ),
    };
  });
})();

/** The scheduling window, in seconds either side of now. */
export const WINDOW = { pastSec: 30 * 60, futureSec: 5 * 60 * 60 };

/**
 * Book the window.
 *
 * Passes are laid onto antennas in catalogue order, which is what produces the
 * occasional overlap the scheduler then reports as a conflict — exactly the
 * situation J.1.1 requires it to handle by rescheduling or prioritising.
 */
export const PASSES: SatellitePass[] = (() => {
  const rng = makeRng(0x9e3779b9);
  const out: SatellitePass[] = [];
  // Where each antenna is next free, so bookings queue up realistically.
  const nextFree = new Map(ANTENNAS.map((a) => [a.id, -WINDOW.pastSec]));

  for (let i = 0; i < 34; i += 1) {
    const sat = CATALOGUE[Math.floor(rng() * CATALOGUE.length)];
    const antenna = ANTENNAS[i % ANTENNAS.length];
    const durationSec = 360 + Math.floor(rng() * 780);
    // Real passes are minutes long and hours apart, so the gap dominates.
    const gap = 900 + Math.floor(rng() * 2400);
    const start = (nextFree.get(antenna.id) ?? 0) + gap;

    // Two deliberate double-bookings, so the conflict path is exercised.
    const contended = i === 9 || i === 21;
    const aosOffsetSec = contended ? start - durationSec / 2 : start;

    if (!contended) nextFree.set(antenna.id, start + durationSec);

    const elapsed = -aosOffsetSec;
    const live = elapsed > 0 && elapsed < durationSec;
    const done = elapsed >= durationSec;

    const status = contended
      ? "CONFLICT"
      : live
        ? "TRACKING"
        : done
          ? "COMPLETED"
          : "SCHEDULED";

    const linkLock: LinkLock = live
      ? rng() > 0.85
        ? "DEGRADED"
        : "LOCKED"
      : "UNLOCKED";
    const plannedVolumeMb = Math.round(durationSec * (0.6 + rng() * 1.9));

    out.push({
      id: `PASS-${String(i + 1).padStart(3, "0")}`,
      satName: sat.name,
      noradId: sat.noradId,
      orbitClass: sat.orbitClass,
      stationId: antenna.stationId,
      antennaId: antenna.id,
      aosOffsetSec,
      durationSec,
      priority: sat.priority,
      status,
      inclinationDeg: Number((97.4 + (rng() - 0.5) * 8).toFixed(2)),
      apogeeKm: Math.round(500 + rng() * 320),
      perigeeKm: Math.round(480 + rng() * 200),
      periodMin: Number((94 + rng() * 12).toFixed(1)),
      frequencyMHz: sat.frequencyMHz,
      dataRateKbps: Math.round(2048 + rng() * 6144),
      linkMarginDb: Number((3 + rng() * 7).toFixed(1)),
      modulation: MODULATIONS[Math.floor(rng() * MODULATIONS.length)],
      aosAzimuthDeg: Math.round(rng() * 359),
      losAzimuthDeg: Math.round(rng() * 359),
      maxElevationDeg: Number((12 + rng() * 76).toFixed(1)),
      aosRangeKm: Math.round(1800 + rng() * 900),
      linkLock,
      signalStrengthPct: Math.round(live ? 58 + rng() * 40 : 0),
      plannedVolumeMb,
      downlinkedMb: done
        ? plannedVolumeMb
        : live
          ? Math.round(plannedVolumeMb * (elapsed / durationSec))
          : 0,
    });
  }

  return out.sort((a, b) => a.aosOffsetSec - b.aosOffsetSec);
})();

/** Antenna double-bookings the operator has to resolve (J.1.1). */
export const CONFLICTS: Conflict[] = (() => {
  const out: Conflict[] = [];
  for (const antenna of ANTENNAS) {
    const booked = PASSES.filter((p) => p.antennaId === antenna.id).sort(
      (a, b) => a.aosOffsetSec - b.aosOffsetSec,
    );
    for (let i = 1; i < booked.length; i += 1) {
      const prev = booked[i - 1];
      const cur = booked[i];
      const overlap = prev.aosOffsetSec + prev.durationSec - cur.aosOffsetSec;
      if (overlap > 0) {
        out.push({
          antennaId: antenna.id,
          passIds: [prev.id, cur.id],
          overlapSec: Math.round(overlap),
        });
      }
    }
  }
  return out;
})();

export const SCHEDULE_STATS = {
  /** Distinct satellites booked in this window. */
  satellitesScheduled: new Set(PASSES.map((p) => p.satName)).size,
  satelliteCapacity: 70,
  passesInWindow: PASSES.length,
  conflicts: CONFLICTS.length,
  /** Tender J.1.1: schedule files are emitted at 1 ms resolution. */
  resolutionMs: 1,
  windowHours: (WINDOW.pastSec + WINDOW.futureSec) / 3600,
};

/* ────────────────────────────────────────────────────────────────────────────
   History (J.1.4) — completed passes with whatever went wrong during them.
   ──────────────────────────────────────────────────────────────────────── */

const ISSUE_POOL = [
  "Link margin dipped below 3 dB near horizon",
  "Doppler compensation re-acquired twice",
  "Rain fade on downlink for 42 s",
  "Antenna drive lagged predicted azimuth by 0.4°",
  "Frame sync lost briefly at AOS",
  "Recorder buffer high-water mark reached",
];

export const HISTORY: PassRecord[] = (() => {
  const rng = makeRng(0x1f2e3d);
  // A fixed epoch keeps rendered timestamps identical on server and client.
  const epoch = Date.parse("2026-08-23T09:00:00Z");

  return Array.from({ length: 48 }, (_, i) => {
    const sat = CATALOGUE[Math.floor(rng() * CATALOGUE.length)];
    const antenna = ANTENNAS[Math.floor(rng() * ANTENNAS.length)];
    const durationSec = 360 + Math.floor(rng() * 780);
    const completedAt =
      epoch - ((i * (2400 + Math.floor(rng() * 5400) * 1000)) / 1000) * 1000;
    const aosAt = completedAt - durationSec * 1000;

    const degraded = rng() > 0.78;
    const missed = rng() > 0.94;
    const meanSignalPct = missed
      ? 0
      : Math.round(degraded ? 38 + rng() * 18 : 68 + rng() * 28);
    const plannedVolumeMb = Math.round(durationSec * (0.6 + rng() * 1.9));
    const downlinkedMb = missed
      ? 0
      : Math.round(
          plannedVolumeMb *
            (degraded ? 0.55 + rng() * 0.3 : 0.94 + rng() * 0.06),
        );

    const issues: string[] = [];
    if (missed)
      issues.push("Pass missed — antenna held by higher-priority task");
    else if (degraded)
      issues.push(ISSUE_POOL[Math.floor(rng() * ISSUE_POOL.length)]);

    return {
      pass: {
        id: `ACQ-${String(4820 - i).padStart(4, "0")}`,
        satName: sat.name,
        noradId: sat.noradId,
        orbitClass: sat.orbitClass,
        stationId: antenna.stationId,
        antennaId: antenna.id,
        aosOffsetSec: 0,
        durationSec,
        priority: sat.priority,
        status: missed ? "MISSED" : "COMPLETED",
        inclinationDeg: Number((97.4 + (rng() - 0.5) * 8).toFixed(2)),
        apogeeKm: Math.round(500 + rng() * 320),
        perigeeKm: Math.round(480 + rng() * 200),
        periodMin: Number((94 + rng() * 12).toFixed(1)),
        frequencyMHz: sat.frequencyMHz,
        dataRateKbps: Math.round(2048 + rng() * 6144),
        linkMarginDb: Number((3 + rng() * 7).toFixed(1)),
        modulation: MODULATIONS[Math.floor(rng() * MODULATIONS.length)],
        aosAzimuthDeg: Math.round(rng() * 359),
        losAzimuthDeg: Math.round(rng() * 359),
        maxElevationDeg: Number((12 + rng() * 76).toFixed(1)),
        aosRangeKm: Math.round(1800 + rng() * 900),
        linkLock: missed ? "UNLOCKED" : degraded ? "DEGRADED" : "LOCKED",
        signalStrengthPct: meanSignalPct,
        plannedVolumeMb,
        downlinkedMb,
      } satisfies SatellitePass,
      completedAt,
      aosAt,
      issues,
      meanSignalPct,
      dopplerDriftHz: Math.round((rng() - 0.5) * 9000),
      efficiencyPct:
        plannedVolumeMb === 0
          ? 0
          : Math.round((downlinkedMb / plannedVolumeMb) * 100),
    };
  });
})();

/**
 * Aggregates for the history KPI strip.
 *
 * A function of the records rather than a constant, because the archive is now
 * live: passes land in it as they finish and the operator can empty it, and the
 * headline figures have to follow. An empty archive reports zeroes rather than
 * dividing by nothing.
 */
export function statsFor(records: PassRecord[]) {
  const n = records.length;
  if (n === 0) {
    return {
      completed: 0,
      missed: 0,
      lockSuccessPct: 0,
      meanSignalPct: 0,
      volumeGb: 0,
    };
  }
  return {
    completed: records.filter((r) => r.pass.status === "COMPLETED").length,
    missed: records.filter((r) => r.pass.status === "MISSED").length,
    lockSuccessPct: Math.round(
      (records.filter((r) => r.pass.linkLock === "LOCKED").length / n) * 100,
    ),
    meanSignalPct: Math.round(
      records.reduce((s, r) => s + r.meanSignalPct, 0) / n,
    ),
    volumeGb: Number(
      (records.reduce((s, r) => s + r.pass.downlinkedMb, 0) / 1024).toFixed(1),
    ),
  };
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  1: "Critical",
  2: "High",
  3: "Standard",
};

export const PRIORITY_TOKEN: Record<Priority, string> = {
  1: "da-danger",
  2: "da-warn",
  3: "da-info",
};

export const STATUS_TOKEN: Record<SatellitePass["status"], string> = {
  TRACKING: "da-success",
  SCHEDULED: "da-info",
  CONFLICT: "da-danger",
  COMPLETED: "da-muted",
  MISSED: "da-warn",
  CANCELLED: "da-label",
};
