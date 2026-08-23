"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * The drill-down chain lives in the URL: array tile → chassis slot → board
 * channel.
 *
 * Search params rather than a store, deliberately. An operator who has drilled
 * to "tile B2, slot 6, channel 6" can hand that link to the next shift, the
 * browser Back button walks back up the chain, and a reload lands where they
 * were. None of that works if the selection only exists in React state.
 *
 * `useSearchParams` forces client rendering up to the nearest Suspense
 * boundary on a prerendered route, so every screen using this sits inside one.
 */
export function useDrillParams() {
  const router = useRouter();
  const params = useSearchParams();

  const get = useCallback(
    (key: string, fallback: string) => params.get(key) ?? fallback,
    [params],
  );

  const getNumber = useCallback(
    (key: string, fallback: number) => {
      const raw = params.get(key);
      const parsed = raw === null ? Number.NaN : Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    [params],
  );

  /** Update params on the current screen without stacking history entries. */
  const set = useCallback(
    (next: Record<string, string | number>) => {
      const search = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) search.set(key, String(value));
      router.replace(`?${search.toString()}`, { scroll: false });
    },
    [params, router],
  );

  /** Drill into another screen, carrying context. This one is a history step. */
  const drillTo = useCallback(
    (path: string, next: Record<string, string | number>) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) search.set(key, String(value));
      router.push(`${path}?${search.toString()}`);
    },
    [router],
  );

  return { get, getNumber, set, drillTo };
}
