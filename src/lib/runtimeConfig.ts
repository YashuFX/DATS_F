"use client";

import { useSyncExternalStore } from "react";

/**
 * The seam between operator settings and the feature modules.
 *
 * Each feature in this application is meant to be liftable on its own — the
 * archival board, the scheduler and the tracking console import nothing from
 * each other, and nothing from the settings screen. But several of them do have
 * to honour a preference, and having each one reach into the settings store
 * would tie every module to it.
 *
 * So the dependency is inverted through here, next to `theme.ts` and shared by
 * everyone for the same reason: features *read* this, `SettingsRuntime`
 * *writes* it, and neither imports the other. A feature dropped into a host
 * application with no settings screen simply reads the defaults.
 */

export interface RuntimeConfig {
  /** Live-clock interval, in ms. */
  tickMs: number;
  /** `"auto"` measures the card; a number pins the page size. */
  tableRows: "auto" | number;
  /** Printed beside "Time" in table headers. */
  timeZoneLabel: string;
  /** The aperture this console is driving. */
  stationName: string;
  /** Whether the floating section compass is shown at all. */
  showSectionNav: boolean;
  /** Records the pass archive keeps before dropping the oldest. */
  archiveCap: number;
}

export const RUNTIME_DEFAULTS: RuntimeConfig = {
  tickMs: 1000,
  tableRows: "auto",
  timeZoneLabel: "IST",
  stationName: "Bengaluru (ISTRAC)",
  showSectionNav: true,
  archiveCap: 500,
};

/* Replaced wholesale rather than mutated, so `useSyncExternalStore` can compare
   snapshots by identity and skip the re-render when nothing actually moved. */
let current: RuntimeConfig = RUNTIME_DEFAULTS;

const listeners = new Set<() => void>();

export function getRuntimeConfig(): RuntimeConfig {
  return current;
}

export function setRuntimeConfig(patch: Partial<RuntimeConfig>) {
  const next = { ...current, ...patch };
  const changed = (Object.keys(next) as (keyof RuntimeConfig)[]).some(
    (key) => next[key] !== current[key],
  );
  if (!changed) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The current runtime config, as React state.
 *
 * The server snapshot is always the defaults, and so is the client's first
 * render — `SettingsRuntime` writes the operator's values in an effect, after
 * the two trees have already agreed.
 */
export function useRuntimeConfig(): RuntimeConfig {
  return useSyncExternalStore(
    subscribe,
    getRuntimeConfig,
    () => RUNTIME_DEFAULTS,
  );
}
