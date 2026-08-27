"use client";

import { useRef } from "react";

const DRAG_THRESHOLD_PX = 6;

/** Just the bit of a pointer/mouse event this needs — R3F types `onClick`
 *  against `MouseEvent` and `onPointerDown` against `PointerEvent`; both
 *  carry `clientX`/`clientY`, so this stays generic over either. */
interface PositionedEvent {
  clientX: number;
  clientY: number;
}

/**
 * Distinguishes a click from a drag-to-orbit release.
 *
 * OrbitControls and this app's own click-to-select share the same pointer
 * events on the same canvas — a drag that ends over a different face than
 * it started on (the dome rotates under the pointer mid-drag) would
 * otherwise silently re-select whatever face happens to be under the
 * cursor at release, which is exactly the "stays interactive until you
 * close it" requirement breaking in the worst way: the panel would jump to
 * an unrelated face just from orbiting.
 */
export function useDragThreshold() {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (e: PositionedEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    isDrag: (e: PositionedEvent) => {
      if (!start.current) return false;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      return Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;
    },
  };
}
