"use client";

/**
 * Tracking simulation state.
 *
 * A store rather than component state because three separate subtrees read it:
 * the header's run control, the Cesium globe, and the tracking panel's
 * readouts. They are not in a parent/child relationship, and threading a
 * simulation clock through the M&C board's grid would mean re-rendering every
 * panel on every tick.
 *
 * The clock is SIMULATED, not wall time. `timeScale` lets an operator run a
 * pass at 60× to see the whole geometry in a minute — which is the only way to
 * demonstrate a 10-minute LEO pass in a review — while the propagator still
 * receives real timestamps and produces true SGP4 positions.
 */

import { create } from "zustand";
import { propagateAll, type SatelliteState } from "./lookAngles";
import { planBeams, separationDeg, type BeamPlan } from "./beamPlanner";
import { REPOINT_DEG } from "../data/mnc.mock";
import { findPasses, type Pass } from "./passes";

const EMPTY_PLAN: BeamPlan = {
  assignments: [],
  rejected: [],
  visibleCount: 0,
  beamsUsed: 0,
  beamsTotal: 0,
  budgetCapacityTargets: 0,
};

/**
 * Where the array has been TOLD to look, and for which spacecraft.
 *
 * Held rather than recomputed every tick, because a real array does not
 * re-steer continuously — it is given a direction and holds it while the
 * target moves. The gap that opens up between this and the target's true
 * position is the pointing error the five-beam cluster exists to absorb.
 */
export interface BeamPointing {
  satelliteId: string;
  azimuthDeg: number;
  elevationDeg: number;
}

/**
 * How far the target may drift off the commanded direction before the array
 * re-steers.
 *
 * Read from the beam design rather than chosen here: it is the radius the five
 * footprints are sized to cover between them, so moving one without the other
 * would open a hole in the cluster. See `BEAMS` in mnc.mock.
 */
/* Re-exported from the beam design rather than chosen here: it is the radius
   the five footprints are sized to cover between them, so moving one without
   the other would open a hole in the cluster. See `BEAMS` in mnc.mock. */

export interface SimState {
  running: boolean;
  /** Simulated epoch, ms. */
  simTime: number;
  /** Simulated seconds per real second. */
  timeScale: number;
  states: SatelliteState[];
  plan: BeamPlan;
  /** Which target the readouts are drawn for. Null = the highest pass. */
  selectedId: string | null;
  /**
   * Commanded pointing of every cluster the array is currently holding, keyed
   * by satellite id.
   *
   * One per TRACKED target, not one for the selection. The aperture is serving
   * everything the planner assigned beams to whether or not an operator has
   * clicked on it, and each of those clusters is steered and re-steered on its
   * own schedule — so the pointing state has to be per target or the display
   * can only ever be honest about one of them.
   */
  pointings: Record<string, BeamPointing>;
  /** The active target's entry, for the readouts. Derived from `pointings`. */
  pointing: BeamPointing | null;
  /** Upcoming contacts over the next few hours. */
  passes: Pass[];
  /** Sim epoch the pass search was last run from. */
  passesComputedAt: number;
  /** Wall clock the pass search last ran at, ms. Not part of the simulation —
   *  it exists only to keep the search off consecutive frames. */
  passesComputedRealAt: number;

  start: () => void;
  stop: () => void;
  reset: () => void;
  setTimeScale: (scale: number) => void;
  selectSatellite: (id: string | null) => void;
  /** Advance by `deltaMs` of REAL time; the clock applies `timeScale`. */
  advance: (deltaMs: number) => void;
}

/** Epoch the simulation opens on. Fixed, so a reload shows the same sky. */
const T0 = Date.UTC(2026, 8, 2, 6, 0, 0);

function evaluate(simTime: number) {
  const states = propagateAll(new Date(simTime));
  return { states, plan: planBeams(states) };
}

/**
 * The commanded pointing after this instant.
 *
 * Returns the PREVIOUS object unchanged while the target is still inside the
 * cluster — identity matters here, because a new object every tick would
 * re-render the readouts and restart the globe's cluster geometry four times a
 * second for a direction that has not moved.
 */
function repoint(previous: BeamPointing | undefined, target: SatelliteState): BeamPointing {
  if (
    previous &&
    previous.satelliteId === target.id &&
    separationDeg(
      target.azimuthDeg,
      target.elevationDeg,
      previous.azimuthDeg,
      previous.elevationDeg,
    ) <= REPOINT_DEG
  ) {
    return previous;
  }
  return {
    satelliteId: target.id,
    azimuthDeg: target.azimuthDeg,
    elevationDeg: target.elevationDeg,
  };
}

/**
 * The commanded pointing of every cluster the array is holding.
 *
 * Entries are carried over BY IDENTITY while their target is still inside the
 * cluster, which is what lets the globe skip re-deriving 12 clusters' geometry
 * on a tick where nothing was re-steered, and what keeps the readouts from
 * re-rendering four times a second for a direction that has not moved.
 *
 * Targets the planner has dropped fall out of the map rather than lingering:
 * a stale commanded direction for a spacecraft that has set is not a pointing,
 * it is a leak that would draw a cluster into the ground.
 *
 * The active target is always included even when the planner could not serve
 * it, because the readouts are drawn for the selection whether or not it has
 * beams — an operator clicking an unserved pass should see WHY, not a blank.
 */
function repointAll(
  previous: Record<string, BeamPointing>,
  states: SatelliteState[],
  plan: BeamPlan,
  active: SatelliteState | null,
): Record<string, BeamPointing> {
  const byId = new Map(states.map((s) => [s.id, s]));
  const next: Record<string, BeamPointing> = {};

  for (const assignment of plan.assignments) {
    const target = byId.get(assignment.satelliteId);
    if (target) next[target.id] = repoint(previous[target.id], target);
  }
  if (active && !next[active.id]) {
    next[active.id] = repoint(previous[active.id], active);
  }
  return next;
}

/**
 * How far the sim clock may run before the pass list is searched again.
 *
 * The search costs ~140 ms — three hours of propagation across the whole
 * catalogue — which is far too much to repeat on a 4 Hz tick, and pointless
 * besides: passes an hour out do not move. Re-running every 10 simulated
 * minutes keeps the list honest while the cost stays off the tick loop.
 */
const PASS_REFRESH_SIM_MS = 10 * 60 * 1000;
/**
 * …and no more often than this in REAL seconds, whatever the time scale.
 *
 * The simulated gate alone is not a budget. At 120x, ten simulated minutes go
 * by every five real seconds, so the search fires every five seconds and each
 * firing is a ~150 ms synchronous block on the main thread — a visible hitch
 * in the globe every few seconds, which reads as the satellites stuttering.
 * The two gates together mean the list is refreshed when it is stale AND when
 * the frame budget can afford it; at 1x the simulated gate still governs, and
 * a 180-minute horizon does not go stale in twenty seconds at any rate.
 */
const PASS_REFRESH_REAL_MS = 20_000;
/** How far ahead to search, minutes. */
const PASS_HORIZON_MIN = 180;

/**
 * Selectable simulation rates, simulated seconds per real second.
 *
 * A LEO pass lasts about ten minutes, and the rate an operator wants depends
 * entirely on what they are looking at. Watching the beam cluster hold a
 * target — the five tracking beams handing it between them as the pointing
 * drifts and re-steers — only works at or below real time: at 30x the target
 * crosses a beam in a fraction of a second and the handovers are a blur, which
 * is what "too fast to see" meant. The faster rates are still here for
 * skipping between passes, but they are no longer where the panel opens.
 *
 * The propagator receives real timestamps at every rate, so the geometry is
 * true whichever one is picked.
 */
export const TIME_SCALES = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60] as const;

/** Opens at real time: slow enough to watch the cluster work. */
const DEFAULT_TIME_SCALE = 1;

/** The `pointings` map and the active target's entry, computed together. */
function steer(
  previous: Record<string, BeamPointing>,
  states: SatelliteState[],
  plan: BeamPlan,
  selectedId: string | null,
): { pointings: Record<string, BeamPointing>; pointing: BeamPointing | null } {
  const active = pickTarget(states, plan, selectedId);
  const pointings = repointAll(previous, states, plan, active);
  return { pointings, pointing: active ? (pointings[active.id] ?? null) : null };
}

export const useSimStore = create<SimState>((set, get) => ({
  running: false,
  simTime: T0,
  timeScale: DEFAULT_TIME_SCALE,
  states: [],
  plan: EMPTY_PLAN,
  selectedId: null,
  pointings: {},
  pointing: null,
  passes: [],
  passesComputedAt: 0,
  passesComputedRealAt: 0,

  start: () => {
    // Evaluate immediately so pressing Start paints a populated sky on the
    // next frame rather than an empty one until the first tick lands.
    const { simTime, selectedId, pointings } = get();
    const { states, plan } = evaluate(simTime);
    set({
      running: true,
      states,
      plan,
      ...steer(pointings, states, plan, selectedId),
      passes: findPasses(simTime, PASS_HORIZON_MIN),
      passesComputedAt: simTime,
      passesComputedRealAt: Date.now(),
    });
  },

  stop: () => set({ running: false }),

  reset: () => {
    const { states, plan } = evaluate(T0);
    set({
      running: false,
      simTime: T0,
      states,
      plan,
      selectedId: null,
      ...steer({}, states, plan, null),
      passes: findPasses(T0, PASS_HORIZON_MIN),
      passesComputedAt: T0,
      passesComputedRealAt: Date.now(),
    });
  },

  setTimeScale: (timeScale) => set({ timeScale }),

  selectSatellite: (selectedId) => {
    // Re-steer immediately. Waiting for the next tick would leave the cluster
    // pointed at the previous spacecraft for a quarter second, which reads as
    // the click having selected the wrong object.
    const { states, plan, pointings } = get();
    set({ selectedId, ...steer(pointings, states, plan, selectedId) });
  },

  advance: (deltaMs) => {
    const { running, simTime, timeScale } = get();
    if (!running) return;
    const next = simTime + deltaMs * timeScale;
    const { states, plan } = evaluate(next);
    const steered = steer(get().pointings, states, plan, get().selectedId);

    // Re-search only when the clock has run far enough for the list to be
    // stale AND enough real time has passed to absorb the cost, so the
    // expensive part stays off the tick and off the frame budget.
    const { passesComputedAt, passesComputedRealAt } = get();
    const realNow = Date.now();
    if (
      next - passesComputedAt > PASS_REFRESH_SIM_MS &&
      realNow - passesComputedRealAt > PASS_REFRESH_REAL_MS
    ) {
      set({
        simTime: next,
        states,
        plan,
        ...steered,
        passes: findPasses(next, PASS_HORIZON_MIN),
        passesComputedAt: next,
        passesComputedRealAt: realNow,
      });
      return;
    }

    set({ simTime: next, states, plan, ...steered });
  },
}));

/**
 * The target the beam cluster is drawn for.
 *
 * Falls back to the highest tracked pass rather than to "none": the panel's
 * job on pressing Start is to show beams, and an operator who has not clicked
 * anything yet should see the array doing what it would actually do — serving
 * its best target.
 */
export function activeTarget(state: SimState): SatelliteState | null {
  return pickTarget(state.states, state.plan, state.selectedId);
}

/** The same choice, from the three pieces it actually depends on — so the
 *  reducers can make it before the new state object exists. */
function pickTarget(
  states: SatelliteState[],
  plan: BeamPlan,
  selectedId: string | null,
): SatelliteState | null {
  if (selectedId) {
    const picked = states.find((s) => s.id === selectedId);
    if (picked?.visible) return picked;
  }
  const tracked = new Set(plan.assignments.map((a) => a.satelliteId));
  const candidates = states.filter((s) => tracked.has(s.id));
  if (!candidates.length) return null;
  return candidates.reduce((best, s) => (s.elevationDeg > best.elevationDeg ? s : best));
}
