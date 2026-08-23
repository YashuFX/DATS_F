import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from "../types";

/**
 * The persisted settings, read straight out of storage.
 *
 * For the handful of callers that run outside React and cannot wait for the
 * store to rehydrate — a redirect decided during a form submit, for instance.
 * Everything rendering inside the tree should use the store instead, which is
 * reactive and hydration-safe.
 */
export function readPersistedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as { state?: { settings?: Partial<AppSettings> } };
    return { ...DEFAULT_SETTINGS, ...(parsed.state?.settings ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Where an operator wants to land after signing in. Same-origin paths only. */
export function readHomeHref(fallback: string): string {
  const href = readPersistedSettings().homeHref;
  return href.startsWith("/") && !href.startsWith("//") ? href : fallback;
}
