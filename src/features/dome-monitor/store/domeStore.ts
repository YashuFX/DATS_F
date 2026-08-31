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
import { clampOrbitElevation } from "../lib/cameraFraming";
import {
  CAMERA_DEFAULT_DISTANCE,
  DEFAULT_SELECTED_FACE,
  CAMERA_PRESETS,
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
   * Where the camera currently sits, as the orbit puck's readout needs it:
   * azimuth in [0, 360), elevation in degrees, same convention as the face
   * geometry (lib/cameraFraming.ts). Written by the scene on every camera
   * move, from OrbitControls' own state — so it stays correct whether the
   * move came from a drag, the wheel, a preset, or the puck itself.
   */
  cameraAzimuth: number;
  cameraElevation: number;
  /**
   * A hand-driven orbit, written by the puck and consumed by the scene.
   *
   * The store is the channel because it is the one that already works from
   * both sides of the R3F Canvas boundary (the scene reads it, the DOM HUD
   * writes it), and because it keeps the puck free of any three.js import.
   * `nonce` is what makes a repeat of the same angles still register — the
   * same trick `reframeNonce` plays for "Zoom to Face".
   *
   * Applied instantly, never animated: this is a live drag, and a 450 ms
   * ease would lag a full drag behind the pointer.
   */
  orbitRequest: { azimuth: number; elevation: number; nonce: number } | null;
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
  /**
   * Whether the live telemetry link is held.
   *
   * Reading a face's flagged-element list while the numbers change underneath
   * every 4 s is the problem this exists to solve. It is deliberately a
   * FIRST-CLASS, VISIBLE state rather than a quiet toggle: a paused feed
   * means the dome is showing stale data, and an operator who has forgotten
   * that is in a worse position than one who never paused. ViewActions tints
   * its own control while this is true, and the header's LAST UPDATE clock
   * stops advancing.
   */
  feedPaused: boolean;
  /**
   * A request to capture the viewport as a PNG, consumed by the scene.
   *
   * It has to be the scene that does it: only DomeScene holds the WebGL
   * renderer, and with `frameloop="demand"` the drawing buffer is not valid
   * to read at an arbitrary moment — it must be rendered and read inside the
   * same task. Same nonce trick as `orbitRequest`.
   */
  snapshotRequest: { nonce: number } | null;
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
  setCameraPose: (distance: number, azimuth: number, elevation: number) => void;
  requestOrbit: (azimuth: number, elevation: number) => void;
  acknowledgeAlarm: (id: string) => void;
  shelveAlarm: (id: string, durationMs: number) => void;
  setAlarmsOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  requestReframe: () => void;
  setFeedPaused: (paused: boolean) => void;
  requestSnapshot: () => void;
}

export const useDomeStore = create<DomeState>((set) => ({
  selection: { level: "face", faceNum: DEFAULT_SELECTED_FACE },
  hoveredFace: null,
  metricMode: "states",
  telemetry: MOCK_TELEMETRY,
  revision: 0,
  cameraDistance: CAMERA_DEFAULT_DISTANCE,
  cameraAzimuth: CAMERA_PRESETS[0].azimuth,
  cameraElevation: CAMERA_PRESETS[0].elevation,
  orbitRequest: null,
  elementsVisible: CAMERA_DEFAULT_DISTANCE <= ELEMENT_VISIBILITY_SHOW_DISTANCE,
  alarmAcks: {},
  alarmsOpen: false,
  panelWidth: 0,
  feedPaused: false,
  snapshotRequest: null,
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

  // Fires on EVERY OrbitControls change event — a drag is ~60 of these a
  // second — so it bails on a move too small to show anywhere. Without that
  // the puck would re-render on sub-pixel damping settle long after the
  // camera has visually stopped.
  setCameraPose: (distance, azimuth, elevation) =>
    set((state) => {
      let elementsVisible = state.elementsVisible;
      if (elementsVisible && distance >= ELEMENT_VISIBILITY_HIDE_DISTANCE) elementsVisible = false;
      else if (!elementsVisible && distance <= ELEMENT_VISIBILITY_SHOW_DISTANCE) elementsVisible = true;

      const settled =
        elementsVisible === state.elementsVisible &&
        Math.abs(distance - state.cameraDistance) < 1e-3 &&
        Math.abs(elevation - state.cameraElevation) < 0.05 &&
        // Azimuth wraps: 359.99 -> 0.01 is a small move, not a 360 one.
        Math.abs(((azimuth - state.cameraAzimuth + 540) % 360) - 180) < 0.05;
      if (settled) return state;

      return {
        cameraDistance: distance,
        cameraAzimuth: azimuth,
        cameraElevation: elevation,
        elementsVisible,
      };
    }),

  requestOrbit: (azimuth, elevation) =>
    set((state) => ({
      orbitRequest: {
        azimuth: ((azimuth % 360) + 360) % 360,
        elevation: clampOrbitElevation(elevation),
        nonce: (state.orbitRequest?.nonce ?? 0) + 1,
      },
    })),

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

  setFeedPaused: (paused) => set({ feedPaused: paused }),

  requestSnapshot: () =>
    set((state) => ({ snapshotRequest: { nonce: (state.snapshotRequest?.nonce ?? 0) + 1 } })),
}));
