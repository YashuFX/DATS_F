"use client";

import { useEffect } from "react";
import { usePassHistoryStore } from "../store/passHistoryStore";

const STORAGE_KEY = "dats-pass-history";

/**
 * Keep this tab's archive in step with what is on disk.
 *
 * Two jobs. First, pull the persisted archive into the store once after the
 * first paint — the store is created with `skipHydration` so that server and
 * first client render agree, and this is what lets the stored records in
 * afterwards.
 *
 * Second, listen for other tabs. `storage` fires only in tabs that did not make
 * the write, so a pass archived by a scheduler open in one tab reaches a Task
 * History open in another without either being reloaded.
 *
 * Both are idempotent, so more than one caller is harmless.
 */
export function useArchiveRehydration(): void {
  useEffect(() => {
    void usePassHistoryStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY)
        void usePassHistoryStore.persist.rehydrate();
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
