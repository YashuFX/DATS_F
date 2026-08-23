"use client";

import { useEffect } from "react";
import { usePassHistoryStore } from "../store/passHistoryStore";

/**
 * Pull the persisted archive into the store, once, after the first paint.
 *
 * The store is created with `skipHydration`, so it starts on the seeded log on
 * both server and client and the first render matches. This is what lets the
 * stored records in afterwards. Every screen that reads the archive calls it —
 * `persist.rehydrate()` is idempotent, so more than one caller is harmless.
 */
export function useArchiveRehydration(): void {
  useEffect(() => {
    void usePassHistoryStore.persist.rehydrate();
  }, []);
}
