"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from "../types";

/**
 * The settings store.
 *
 * `skipHydration` is not optional here. Zustand's `persist` normally rehydrates
 * while the module is evaluating, which on the client is before React's first
 * render — so an operator with a saved 1.2x board scale would render a 1.2x
 * tree against server HTML built at 1.0x, and every screen would throw a
 * hydration mismatch. Instead the store starts at defaults on both sides and
 * `SettingsRuntime` rehydrates in an effect, after the trees have matched.
 *
 * The visual half of that delay is covered by the pre-paint script in
 * `lib/apply.ts`, which restores the cached CSS variables before the browser
 * paints. So the operator never sees the default board; only React does, for
 * one commit.
 */

export type EventLevel = "info" | "ok" | "warn" | "error";

export interface SettingsEvent {
  id: string;
  ts: number;
  level: EventLevel;
  message: string;
}

interface SettingsState {
  settings: AppSettings;
  events: SettingsEvent[];
  /** False until `persist.rehydrate()` has run — components read defaults until then. */
  hydrated: boolean;

  update: (patch: Partial<AppSettings>, note?: string) => void;
  applyPreset: (name: string) => void;
  reset: () => void;
  replaceAll: (settings: AppSettings) => void;

  logEvent: (level: EventLevel, message: string) => void;
  clearEvents: () => void;
}

let eventSeq = 0;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      events: [],
      hydrated: false,

      logEvent: (level, message) => {
        eventSeq += 1;
        const entry: SettingsEvent = {
          id: `ev-${Date.now()}-${eventSeq}`,
          ts: Date.now(),
          level,
          message,
        };
        set((state) => ({
          events: [entry, ...state.events].slice(0, state.settings.auditLogCap),
        }));
      },

      update: (patch, note) => {
        const before = get().settings;
        set({ settings: { ...before, ...patch } });
        // The audit trail names what moved, not that "settings changed" — a log
        // that cannot answer "who turned this off" is not an audit trail.
        if (before.auditLogging) {
          const summary =
            note ??
            Object.entries(patch)
              .map(([key, value]) => `${key} → ${formatValue(value)}`)
              .join(", ");
          if (summary) get().logEvent("info", summary);
        }
      },

      applyPreset: (name) => {
        const preset = ACCENT_PRESETS.find((p) => p.name === name);
        if (!preset) return;
        get().update(
          {
            accentPreset: preset.name,
            colorBrand: preset.brand ?? "auto",
            colorSuccess: preset.success ?? "auto",
            colorWarn: preset.warn ?? "auto",
            colorDanger: preset.danger ?? "auto",
            colorInfo: preset.info ?? "auto",
          },
          `Colour preset applied — ${preset.name}`,
        );
      },

      reset: () => {
        set({ settings: DEFAULT_SETTINGS });
        get().logEvent("warn", "All settings reset to defaults");
      },

      replaceAll: (settings) => {
        set({ settings });
        get().logEvent("ok", "Configuration imported");
      },

      clearEvents: () => set({ events: [] }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      skipHydration: true,
      // Unknown keys from an older build are dropped; missing ones fall back to
      // the default, so a settings file written by a previous version still loads.
      merge: (persisted, current) => {
        const saved = persisted as Partial<SettingsState> | undefined;
        return {
          ...current,
          ...saved,
          settings: { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) },
          events: saved?.events ?? [],
        };
      },
      /* `hydrated` is flipped by `SettingsRuntime` once `rehydrate()` settles,
         not here — the callback fires inside the same commit that reads the
         store, and flipping it there would defeat the point of skipping it. */
      partialize: ({ settings, events }) => ({ settings, events }),
    },
  ),
);

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "on" : "off";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** The settings themselves — the selector every screen outside this feature uses. */
export const useSettings = () => useSettingsStore((s) => s.settings);
