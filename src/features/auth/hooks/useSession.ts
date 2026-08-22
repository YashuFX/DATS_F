"use client";

import { useEffect, useState } from "react";
import { readSession, SESSION_EVENT } from "../lib/store";
import type { SessionState } from "../types";

/**
 * The current session, as React state.
 *
 * Starts at `checking` on the server and on first client render — the session
 * lives in localStorage, which does not exist during SSR, so anything else
 * would render one tree on the server and a different one on hydration. The
 * guard uses that third state to hold a splash rather than flashing either the
 * protected screen or the login redirect.
 *
 * Re-reads on the store's own event (sign-in/sign-out in this tab) and on
 * `storage` (the same in another tab), so signing out once signs out
 * everywhere the board is open.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "checking" });

  useEffect(() => {
    const sync = () => {
      const session = readSession();
      setState(session ? { status: "authenticated", session } : { status: "anonymous" });
    };

    sync();
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}
