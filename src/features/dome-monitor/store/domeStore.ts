/**
 * Dome Monitor store — zustand vanilla store, lives outside React.
 *
 * Telemetry updates mutate buffers in place and bump a revision counter;
 * the scene subscribes outside React's render cycle, writes instanceColor,
 * and calls invalidate() once.  Zero component re-renders for telemetry.
 */

import { create } from "zustand";
import type { DomeTelemetry, MetricMode, SelectionRef } from "../types";
import { MOCK_TELEMETRY } from "../data/telemetry.mock";

export interface DomeState {
  /** Current selection. */
  selection: SelectionRef;
  /** Face the pointer is over (null = nothing). */
  hoveredFace: number | null;
  /** Which metric colours the elements. */
  metricMode: MetricMode;
  /** Live (or mock) telemetry snapshot. */
  telemetry: DomeTelemetry;
  /** Monotonic counter — bumped on every telemetry update. */
  revision: number;

  /* ---- actions ---- */
  selectFace: (fceNum: number) => void;
  selectElement: (fceNum: number, elementIdx: number) => void;
  clearSelection: () => void;
  setHover: (fceNum: number | null) => void;
  setMetricMode: (mode: MetricMode) => void;
  updateTelemetry: (t: DomeTelemetry) => void;
}

export const useDomeStore = create<DomeState>((set) => ({
  selection: { level: "array" },
  hoveredFace: null,
  metricMode: "states",
  telemetry: MOCK_TELEMETRY,
  revision: 0,

  selectFace: (fceNum) =>
    set({ selection: { level: "face", faceNum: fceNum } }),

  selectElement: (fceNum, elementIdx) =>
    set({ selection: { level: "element", faceNum: fceNum, elementIdx } }),

  clearSelection: () =>
    set({ selection: { level: "array" } }),

  setHover: (fceNum) =>
    set({ hoveredFace: fceNum }),

  setMetricMode: (mode) =>
    set({ metricMode: mode }),

  updateTelemetry: (t) =>
    set((state) => ({ telemetry: t, revision: state.revision + 1 })),
}));
