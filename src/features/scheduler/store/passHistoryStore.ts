"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HISTORY } from "../data/schedule";
import type { PassRecord, SatellitePass } from "../types";

/**
 * The pass archive — J.1.4's "log detailed information about each satellite
 * pass and any issues encountered during the pass".
 *
 * This is the seam between the two screens. The scheduler owns tasks while they
 * are ahead of the playhead or under it; the moment one finishes it is handed
 * here, and Task History renders whatever this store holds. Neither screen
 * imports the other.
 *
 * The pattern is the reference app's `passhistorystore`: a Zustand store behind
 * `persist`, so an archived pass survives a reload and a navigation between the
 * two routes. It differs in what it stores — the reference kept the raw pass,
 * this keeps the finished `PassRecord` the history table actually reads, so the
 * table needs no knowledge of where a row came from.
 */

/** Records kept before the oldest are dropped, so localStorage cannot grow without bound. */
const MAX_RECORDS = 500;

/**
 * Stable pseudo-noise from a pass id.
 *
 * A finished pass needs a few figures the schedule never carried — Doppler
 * drift, for one. Deriving them from the id rather than `Math.random` means the
 * same pass always archives to the same numbers, so a persisted record still
 * agrees with itself after a reload.
 */
function noise(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn a pass that has just run its course into the record J.1.4 wants logged. */
export function recordFor(
  pass: SatellitePass,
  completedAtMs: number,
): PassRecord {
  const rng = noise(pass.id);

  const issues: string[] = [];
  if (pass.linkLock === "DEGRADED") {
    issues.push("Signal degraded during pass — partial downlink recovered");
  } else if (pass.linkLock === "UNLOCKED") {
    issues.push("Carrier never locked — no data recovered");
  }
  if (pass.linkMarginDb < 4) {
    issues.push(
      `Link margin ${pass.linkMarginDb} dB — below 4 dB planning floor`,
    );
  }

  const meanSignalPct =
    pass.linkLock === "UNLOCKED" ? 0 : pass.signalStrengthPct;
  const efficiencyPct =
    pass.plannedVolumeMb === 0
      ? 0
      : Math.min(
          100,
          Math.round((pass.downlinkedMb / pass.plannedVolumeMb) * 100),
        );

  return {
    pass: {
      ...pass,
      status: pass.linkLock === "UNLOCKED" ? "MISSED" : "COMPLETED",
    },
    completedAt: completedAtMs,
    aosAt: completedAtMs - pass.durationSec * 1000,
    issues,
    meanSignalPct,
    dopplerDriftHz: Math.round((rng() - 0.5) * 9000),
    efficiencyPct,
  };
}

interface PassHistoryState {
  records: PassRecord[];
  /** Hand a finished pass to the archive. Ignored if that pass is already logged. */
  archivePass: (pass: SatellitePass, completedAtMs: number) => void;
  /** Empty the archive. It refills as tasks complete. */
  clearHistory: () => void;
}

export const usePassHistoryStore = create<PassHistoryState>()(
  persist(
    (set) => ({
      /**
       * Seeded with the shipped log, so the screen opens on a populated archive
       * rather than an empty table waiting for the first pass to finish. Clear
       * empties this too — the archive is one thing, not a fixed part plus a
       * live part.
       */
      records: HISTORY,

      archivePass: (pass, completedAtMs) =>
        set((state) =>
          // The clock ticks at 20 Hz, so the same completion is observed on
          // several consecutive frames. The id check is what makes archiving
          // idempotent rather than logging one pass twenty times a second.
          state.records.some((r) => r.pass.id === pass.id)
            ? state
            : {
                records: [
                  recordFor(pass, completedAtMs),
                  ...state.records,
                ].slice(0, MAX_RECORDS),
              },
        ),

      clearHistory: () => set({ records: [] }),
    }),
    {
      name: "dats-pass-history",
      version: 1,
      /**
       * Rehydrated by hand in `useArchive`, not at module load.
       *
       * Reading localStorage while the store is being created would give the
       * first client render different records than the server rendered, and
       * React would throw a hydration mismatch. Deferring it to an effect lets
       * both sides start from the seed and the stored archive arrive after.
       */
      skipHydration: true,
    },
  ),
);
