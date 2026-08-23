"use client";

import { create } from "zustand";
import type { Severity } from "../types";
import { useSettingsStore } from "./settingsStore";

/**
 * Notifications.
 *
 * Deliberately not persisted: a toast that survives a reload is a bug. What is
 * persisted is the operator's decision about *how* they arrive, which lives in
 * the settings store — this one only holds what is currently on screen.
 *
 * Every rule the Notifications tab exposes is enforced here rather than in the
 * host component, so a suppressed severity never becomes a timer that fires
 * into nothing.
 */

export interface Notification {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  ts: number;
}

interface NotifyState {
  items: Notification[];
  push: (severity: Severity, message: string, title?: string) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

const TITLES: Record<Severity, string> = {
  info: "Notice",
  success: "Done",
  warning: "Warning",
  error: "Error",
};

let seq = 0;

export const useNotifyStore = create<NotifyState>((set, get) => ({
  items: [],

  push: (severity, message, title) => {
    const { settings, logEvent } = useSettingsStore.getState();

    // The event log records it either way. Suppressing a notification hides it
    // from the operator's attention, not from the record.
    logEvent(
      severity === "error"
        ? "error"
        : severity === "warning"
          ? "warn"
          : severity === "success"
            ? "ok"
            : "info",
      message,
    );

    if (!settings.notificationsEnabled) return;
    if (!settings.notifySeverities[severity]) return;

    seq += 1;
    const item: Notification = {
      id: `n-${Date.now()}-${seq}`,
      severity,
      title: title ?? TITLES[severity],
      message,
      ts: Date.now(),
    };

    set((state) => ({
      // A modal cannot stack — the second one would sit behind the first with
      // no way to reach it.
      items:
        settings.notifyStyle === "dialog"
          ? [item]
          : [item, ...state.items].slice(0, Math.max(1, settings.notifyStack)),
    }));

    // Dialogs wait for an answer; the other two styles time out.
    if (settings.notifyStyle !== "dialog") {
      window.setTimeout(
        () => get().dismiss(item.id),
        Math.max(1, settings.notifyDurationSec) * 1000,
      );
    }
  },

  dismiss: (id) =>
    set((state) => ({ items: state.items.filter((n) => n.id !== id) })),

  clear: () => set({ items: [] }),
}));

/** Imperative entry point — usable from event handlers anywhere in the app. */
export const notify = (
  severity: Severity,
  message: string,
  title?: string,
) => useNotifyStore.getState().push(severity, message, title);
