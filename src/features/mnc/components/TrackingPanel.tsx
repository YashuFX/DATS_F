"use client";

import { useCallback, useRef } from "react";
import { Panel } from "./Panel";
import { TrackingGlobe } from "./TrackingGlobe";
import type { GlobeApi } from "../globeApi";

/**
 * The M&C board's tracking panel: the shared tracking display, in the board's
 * panel chrome.
 *
 * The display itself lives in `TrackingGlobe` because the tracking console at
 * `/tracking` shows the same instrument inside its own card. Two copies would
 * have drifted the first time either was touched, and "the map on the console
 * is the map on the board" is the property that makes the two screens worth
 * having side by side.
 */
export function TrackingPanel({ className }: { className?: string }) {
  const apiRef = useRef<GlobeApi | null>(null);
  const onReady = useCallback((api: GlobeApi) => {
    apiRef.current = api;
  }, []);

  return (
    <Panel
      className={className}
      title="Tracking Display"
      expandHref="/tracking"
      expandLabel="Open Tracking"
      bodyClassName="relative"
    >
      <TrackingGlobe onReady={onReady} />
    </Panel>
  );
}
