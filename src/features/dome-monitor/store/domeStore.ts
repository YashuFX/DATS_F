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
import {
  CAMERA_DEFAULT_DISTANCE,
  ELEMENT_VISIBILITY_SHOW_DISTANCE,
  ELEMENT_VISIBILITY_HIDE_DISTANCE,
} from "../config";

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
  /** Distance from the dome centre to the camera (metres). */
  cameraDistance: number;
  /**
   * Semantic zoom — whether faces show 7 557 individual element dots
   * (true) or an aggregate status texture (false). Computed here, in one
   * place, with hysteresis (see config.ts), rather than in each of
   * ElementLayer/FaceStatusTexture separately: two components independently
   * thresholding the same distance risks them disagreeing for a frame, and
   * a single shared threshold would need re-deriving the same band twice.
   */
  elementsVisible: boolean;
  /**
   * Acknowledge/shelve state per alarm id. Alarms themselves are derived
   * fresh from telemetry every render (see AlarmsPanel) rather than stored —
   * only the operator's response to one needs to persist. Acknowledging
   * means "I have seen it", never "it is fixed": it does not remove the
   * alarm. Shelving suppresses it from the active list until `shelvedUntil`,
   * a mandatory expiry — there is no permanent dismiss.
   */
  alarmAcks: Record<string, { acknowledged: boolean; shelvedUntil: number | null }>;
  /**
   * Whether the detail panel is showing the Alarms list rather than a face
   * selection. Lives here (not local component state) because the header's
   * "N faces flagged" pill (DomeShell) and the panel itself (DomeScreen) are
   * different React subtrees that both need to read/write it. Not
   * URL-synced — it isn't a geometric selection, it's transient UI state.
   */
  alarmsOpen: boolean;
  /**
   * Measured width, in CSS px, of the detail panel overlay — 0 until it has
   * been measured once.
   *
   * The panel overlays the canvas rather than sitting beside it, so opening
   * it changes nothing the 3D scene can observe: R3F still reports the full
   * canvas size while up to ~46% of it sits under the panel. This is how the
   * scene learns how much of its own viewport is covered, so it can centre
   * the dome in what is left (DomeScene -> lib/cameraFraming.viewportFraming).
   *
   * Measured, never recomputed: PANEL_WIDTH_CSS's clamp() resolves against a
   * viewport-derived root font-size, so a JS copy of that rule would be a
   * second source of truth — see the comment on PANEL_WIDTH_CSS.
   */
  panelWidth: number;
  /** Bumped by requestReframe() so "Zoom to Face" re-triggers the camera lerp
   *  even when the selection itself hasn't changed (the user drifted away
   *  with the orbit controls and wants to snap back). */
  reframeNonce: number;

  /* ---- actions ---- */
  selectFace: (fceNum: number) => void;
  selectElement: (fceNum: number, elementIdx: number) => void;
  clearSelection: () => void;
  setHover: (fceNum: number | null) => void;
  setMetricMode: (mode: MetricMode) => void;
  updateTelemetry: (t: DomeTelemetry) => void;
  setCameraDistance: (d: number) => void;
  acknowledgeAlarm: (id: string) => void;
  shelveAlarm: (id: string, durationMs: number) => void;
  setAlarmsOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  requestReframe: () => void;
}

export const useDomeStore = create<DomeState>((set) => ({
  selection: { level: "array" },
  hoveredFace: null,
  metricMode: "states",
  telemetry: MOCK_TELEMETRY,
  revision: 0,
  cameraDistance: CAMERA_DEFAULT_DISTANCE,
  elementsVisible: CAMERA_DEFAULT_DISTANCE <= ELEMENT_VISIBILITY_SHOW_DISTANCE,
  alarmAcks: {},
  alarmsOpen: false,
  panelWidth: 0,
  reframeNonce: 0,

  selectFace: (fceNum) =>
    set({ selection: { level: "face", faceNum: fceNum }, alarmsOpen: false }),

  selectElement: (fceNum, elementIdx) =>
    set({ selection: { level: "element", faceNum: fceNum, elementIdx }, alarmsOpen: false }),

  clearSelection: () =>
    set({ selection: { level: "array" }, alarmsOpen: false }),

  setHover: (fceNum) =>
    set({ hoveredFace: fceNum }),

  setMetricMode: (mode) =>
    set({ metricMode: mode }),

  updateTelemetry: (t) =>
    set((state) => ({ telemetry: t, revision: state.revision + 1 })),

  setCameraDistance: (d) =>
    set((state) => {
      let elementsVisible = state.elementsVisible;
      if (elementsVisible && d >= ELEMENT_VISIBILITY_HIDE_DISTANCE) elementsVisible = false;
      else if (!elementsVisible && d <= ELEMENT_VISIBILITY_SHOW_DISTANCE) elementsVisible = true;
      return { cameraDistance: d, elementsVisible };
    }),

  acknowledgeAlarm: (id) =>
    set((state) => ({
      alarmAcks: {
        ...state.alarmAcks,
        [id]: { acknowledged: true, shelvedUntil: state.alarmAcks[id]?.shelvedUntil ?? null },
      },
    })),

  shelveAlarm: (id, durationMs) =>
    set((state) => ({
      alarmAcks: {
        ...state.alarmAcks,
        [id]: { acknowledged: true, shelvedUntil: Date.now() + durationMs },
      },
    })),

  setAlarmsOpen: (open) => set({ alarmsOpen: open }),

  // Bail on an unchanged width: a ResizeObserver fires on every layout pass
  // that touches the panel, and each accepted write re-runs the scene's
  // projection effect.
  setPanelWidth: (width) =>
    set((state) => (state.panelWidth === width ? state : { panelWidth: width })),

  requestReframe: () => set((state) => ({ reframeNonce: state.reframeNonce + 1 })),
}));
