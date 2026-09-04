"use client";

import { useSyncExternalStore } from "react";
import { detectWebGL } from "@/features/dome-monitor/lib/detectWebGL";

/**
 * Whether this browser can give us a WebGL context.
 *
 * `useSyncExternalStore` rather than an effect that calls setState: the answer
 * is a property of the environment, not React state, and setting state
 * synchronously in an effect costs a cascading render on every mount. It also
 * gives a server snapshot for free — the server reports false, so SSR renders
 * the flat tile and the client upgrades on hydration without a mismatch.
 *
 * The probe lives in its own module rather than in DomeCanvas: importing it
 * from there made Three.js a static dependency of this hook, and therefore of
 * the M&C board, defeating the dynamic import that keeps the renderer out of
 * the initial bundle.
 *
 * The probe itself is cached module-wide. `getSnapshot` runs on every render
 * and the probe creates and discards a canvas, which is far too expensive to
 * repeat; the capability cannot change within a session anyway.
 */
let cached: boolean | null = null;

function getSnapshot(): boolean {
  if (cached === null) cached = detectWebGL();
  return cached;
}

/** The capability never changes mid-session, so there is nothing to subscribe to. */
const subscribe = () => () => {};

export function useWebGLAvailable(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
