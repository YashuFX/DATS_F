'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SITE, TRACKING, BEAMS_PER_TARGET } from '@/features/mnc/data/mnc.mock';
import {
  activeTarget,
  useSimStore,
  type BeamPointing,
} from '@/features/mnc/sim/simStore';
import {
  beamDirections,
  carryingBeamIndex,
  separationDeg,
  type BeamAssignment,
  type ClusterBeam,
} from '@/features/mnc/sim/beamPlanner';
import { orbitalElements, type SatelliteState } from '@/features/mnc/sim/lookAngles';
import { currentPass, findPassesFor, type SatellitePass } from '@/features/mnc/sim/passes';

/**
 * TRACKING — the console's data, adapted from the simulation.
 *
 * ---- what this used to be ----
 *
 * Three hard-coded spacecraft, a 1 Hz `setInterval` that random-walked azimuth
 * and elevation, a hand-written pass table, and track events drawn from
 * `Math.random()`. Nothing on this screen had any relationship to the SGP4
 * simulation the M&C board runs, which meant the two screens could — and did —
 * disagree about where the same sky was.
 *
 * ---- what it is now ----
 *
 * An ADAPTER. Every number below comes from `features/mnc/sim`: the same
 * propagator, the same beam planner, the same pass search the globe draws from.
 * This file is the single seam where that simulation is mapped onto the shapes
 * this console's panels already expect, which is why the panels themselves
 * barely changed — they still call `useDashboard()`, it just tells the truth
 * now.
 *
 * Two things are deliberately still local state: the rotor and the radio. This
 * simulation models the SKY, not the ground equipment, and inventing a rotor
 * position from an orbit would be exactly the kind of plausible fiction the
 * rest of this change removes. They stay operator-driven, and the one number
 * that IS derivable — Doppler — is derived.
 */

/** A satellite id from the simulated catalogue, e.g. `SAT-07`. */
export type SatId = string;

export type ActiveMode = 'realtime' | 'offline';

export interface Satellite {
  id: string;
  noradId: string;
  name: string;
  shortName: string;
  description: string;
  alive: boolean;
  countryFlags: string[];
  baseAzimuth: number;
  baseElevation: number;
  baseAltitude: number;
  baseVelocity: number;
  apogee: number;
  perigee: number;
  inclination: number;
  passDuration: string;
  vfo1Uplink: string;
  vfo2Downlink: string;
  vfo1Freq: string;
  vfo2Freq: string;
}

export interface TrackEvent {
  time: string;
  id: string;
  name: string;
  status: 'locked' | 'detected' | 'tentative' | 'lost' | 'unknown';
  message: string;
}

/** The beam cluster serving the selected target, ready to render. */
export interface BeamReadout {
  beams: ClusterBeam[];
  /** Index into `beams` of the one currently holding the target. */
  carrying: number;
  /** How far the target has walked off the commanded direction, degrees. */
  driftDeg: number;
  /** The face carrying this cluster, or null when the target is unserved. */
  assignment: BeamAssignment | null;
  commanded: { azimuthDeg: number; elevationDeg: number };
  beamsPerTarget: number;
}

interface DashboardContextType {
  mode: ActiveMode;
  setMode: (mode: ActiveMode) => void;
  activeSat: SatId;
  setActiveSat: (id: SatId) => void;
  satellites: Record<SatId, Satellite>;
  /** Ids in the order the tabs should show them — highest pass first. */
  satelliteOrder: SatId[];
  livePosition: {
    azimuth: number;
    elevation: number;
    altitude: number;
    velocity: number;
    lat: number;
    lng: number;
    rangeKm: number;
    rangeRateKmS: number;
  };
  countdownSeconds: number;
  /** True while the active target is inside the fence. */
  inFence: boolean;
  /** Simulated epoch, ms — the console's clock. */
  simTime: number;
  /** Passes of the active target over the next 24 simulated hours. */
  passes: SatellitePass[];
  activePass: SatellitePass | null;
  /** The active target's beam cluster, or null when nothing is selected. */
  beam: BeamReadout | null;
  // Rotor
  rotorConnected: 'connected' | 'disconnected' | 'parking';
  setRotorConnected: (state: 'connected' | 'disconnected' | 'parking') => void;
  rotorTracking: boolean;
  setRotorTracking: (tracking: boolean) => void;
  rotorIp: string;
  setRotorIp: (ip: string) => void;
  // Radio
  radioConnected: boolean;
  setRadioConnected: (connected: boolean) => void;
  radioTracking: boolean;
  setRadioTracking: (tracking: boolean) => void;
  radioModel: string;
  setRadioModel: (model: string) => void;
  vfo1Freq: string;
  vfo2Freq: string;
  setVfo1Freq: (f: string) => void;
  setVfo2Freq: (f: string) => void;
  dopplerShift: number;
  // Map settings
  showOrbits: boolean;
  setShowOrbits: (show: boolean) => void;
  showTrails: boolean;
  setShowTrails: (show: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  // Events
  events: TrackEvent[];
  addEvent: (event: TrackEvent) => void;
  // Coordinates
  stationCoords: {
    lat: number;
    lng: number;
    elevation: number;
  };
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

/* ── derived per-spacecraft constants ──────────────────────────────────────
   The simulation models orbits, not radios. These are per-object constants an
   operator would read off a mission plan, derived from the catalogue number so
   they are STABLE for a given spacecraft and identical on every reload — the
   same determinism rule the TLE generator follows, and the reason there is no
   `Math.random()` anywhere in this file.
   ────────────────────────────────────────────────────────────────────────── */

/** Speed of light, km/s — for the Doppler shift, which IS derivable. */
const C_KM_S = 299_792.458;

/** S-band TT&C uplink, 2025-2110 MHz. */
function uplinkHz(noradId: string): number {
  return (2025 + (Number(noradId) % 850) / 10) * 1e6;
}

/** X-band payload downlink, 8025-8400 MHz. */
function downlinkHz(noradId: string): number {
  return (8025 + (Number(noradId) % 3750) / 10) * 1e6;
}

/** `2.071.875.000` — the grouped form the VFO readouts render. */
function groupHz(hz: number): string {
  return Math.round(hz)
    .toString()
    .padStart(10, '0')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatMHz(hz: number): string {
  return `${(hz / 1e6).toFixed(3)} MHz`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** The console's clock, printed. Simulated time, not wall time. */
function formatSimTime(ms: number): string {
  const d = new Date(ms);
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/** Map one simulated state onto the shape this console's panels expect. */
function toSatellite(state: SatelliteState, pass: SatellitePass | null): Satellite {
  const elements = orbitalElements(state.id);
  const up = uplinkHz(state.noradId);
  const down = downlinkHz(state.noradId);
  return {
    id: state.id,
    noradId: state.noradId,
    name: state.name,
    shortName: state.id,
    description: `${state.name} — ${state.regime} simulated target`,
    alive: true,
    countryFlags: ['🇮🇳'],
    baseAzimuth: state.azimuthDeg,
    baseElevation: state.elevationDeg,
    baseAltitude: state.altitudeKm,
    baseVelocity: state.speedKmS,
    apogee: elements?.apogeeKm ?? state.altitudeKm,
    perigee: elements?.perigeeKm ?? state.altitudeKm,
    inclination: elements?.inclinationDeg ?? 0,
    passDuration: pass ? formatDuration(pass.durationS) : '0s',
    vfo1Uplink: formatMHz(up),
    vfo2Downlink: formatMHz(down),
    vfo1Freq: groupHz(up),
    vfo2Freq: groupHz(down),
  };
}

/**
 * How far ahead the pass search runs, and how coarsely it is re-run.
 *
 * A 24-hour search over one satellite costs 20-55 ms. That is cheap for what
 * it answers and far too expensive to repeat on a 4 Hz tick, so it is bucketed:
 * the window start is rounded down and the result reused until the clock leaves
 * the bucket. Passes a day out do not move in half an hour of simulated time,
 * so nothing is lost — and at 60x the recompute still lands only every thirty
 * real seconds, where the globe's tween absorbs it.
 */
const PASS_HORIZON_MIN = 24 * 60;
const PASS_BUCKET_MS = 30 * 60 * 1000;

/**
 * Track events, from the sky rather than from a random number generator.
 *
 * Subscribed OUTSIDE React's render cycle and diffed against the previous
 * tick: an event is a TRANSITION — a spacecraft crossing into the fence,
 * winning or losing a beam cluster, setting — and a transition cannot be read
 * from a snapshot. Every line in the log is therefore something that actually
 * happened, at the simulated time it happened, and an operator can point at a
 * dot on the globe and find the row that put it there.
 */
function useFenceEvents(): [TrackEvent[], (event: TrackEvent) => void] {
  const [events, setEvents] = useState<TrackEvent[]>([]);

  const addEvent = React.useCallback((event: TrackEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 39)]);
  }, []);

  useEffect(() => {
    let previousVisible = new Set<string>();
    let previousTracked = new Set<string>();
    let seeded = false;

    return useSimStore.subscribe((state) => {
      const visible = new Set<string>();
      const names = new Map<string, string>();
      for (const s of state.states) {
        if (!s.visible) continue;
        visible.add(s.id);
        names.set(s.id, s.name);
      }
      const tracked = new Set(state.plan.assignments.map((a) => a.satelliteId));

      /* The first tick is a snapshot, not a set of transitions. Logging it
         would open the console with twenty "signal acquired" lines for passes
         that were already in progress before anyone was watching. */
      if (!seeded) {
        seeded = true;
        previousVisible = visible;
        previousTracked = tracked;
        return;
      }

      const time = formatSimTime(state.simTime);
      const batch: TrackEvent[] = [];
      const push = (id: string, status: TrackEvent['status'], message: string) =>
        batch.push({ time, id, name: names.get(id) ?? id, status, message });

      for (const id of visible) {
        if (!previousVisible.has(id)) push(id, 'detected', 'SIGNAL ACQUIRED');
      }
      for (const id of tracked) {
        if (!previousTracked.has(id)) push(id, 'locked', 'LOCK ACQUIRED');
      }
      for (const id of previousTracked) {
        // Beams released while the spacecraft is still up is a different fault
        // from the pass ending, and the two must not read the same: one is the
        // aperture running out of capacity, the other is orbital mechanics.
        if (!tracked.has(id) && visible.has(id)) push(id, 'tentative', 'BEAMS RELEASED');
      }
      for (const id of previousVisible) {
        if (!visible.has(id)) push(id, 'lost', 'TRACK LOST — LOS');
      }

      previousVisible = visible;
      previousTracked = tracked;

      if (batch.length === 0) return;
      // One state update per tick rather than one per event: a busy horizon can
      // produce half a dozen transitions in the same step.
      setEvents((prev) => [...batch, ...prev].slice(0, 40));
    });
  }, []);

  return [events, addEvent];
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  /* ---- the simulation ---- */
  const states = useSimStore((s) => s.states);
  const plan = useSimStore((s) => s.plan);
  const simTime = useSimStore((s) => s.simTime);
  const running = useSimStore((s) => s.running);
  const pointings = useSimStore((s) => s.pointings);
  const selectedId = useSimStore((s) => s.selectedId);
  const target = useSimStore(activeTarget);

  /* ---- ground equipment: operator-driven, not simulated ---- */
  const [rotorConnected, setRotorConnected] = useState<'connected' | 'disconnected' | 'parking'>('connected');
  const [rotorTracking, setRotorTracking] = useState(true);
  const [rotorIp, setRotorIp] = useState('192.168.60.97:4533');
  const [radioConnected, setRadioConnected] = useState(true);
  const [radioTracking, setRadioTracking] = useState(true);
  const [radioModel, setRadioModel] = useState('FT-857D');

  /* ---- map toggles ---- */
  const [showOrbits, setShowOrbits] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const [events, addEvent] = useFenceEvents();

  /* The tracking console opens live.
   *
   * This screen used to default to `mode: 'realtime'` with a random walk behind
   * it, so it was always moving. Now that "realtime" means the simulation is
   * actually running, opening stopped would show an operator a frozen sky and
   * leave them to discover the mode switch — a worse first frame than the one
   * they had. The M&C board keeps its explicit run control; this console starts
   * itself and offers the same switch in the header. */
  useEffect(() => {
    const store = useSimStore.getState();
    if (!store.running) store.start();
  }, []);

  const activeSat: SatId = target?.id ?? selectedId ?? '';

  /* ---- the tab set ----
     The served targets, in the planner's own order — descending elevation,
     which is also descending usefulness. The selection is pinned in front even
     when the planner could not serve it, so clicking an unserved pass does not
     make its own tab vanish. */
  const satelliteOrder = useMemo(() => {
    const order = plan.assignments.map((a) => a.satelliteId);
    if (activeSat && !order.includes(activeSat)) return [activeSat, ...order];
    return order;
  }, [plan, activeSat]);

  /* ---- passes for the selected target ---- */
  const passWindowStart = Math.floor(simTime / PASS_BUCKET_MS) * PASS_BUCKET_MS;
  const passes = useMemo(
    () => (activeSat ? findPassesFor(activeSat, passWindowStart, PASS_HORIZON_MIN) : []),
    [activeSat, passWindowStart],
  );
  const activePass = useMemo(() => currentPass(passes, simTime), [passes, simTime]);

  const byId = useMemo(() => new Map(states.map((s) => [s.id, s])), [states]);

  const satellites = useMemo(() => {
    const out: Record<SatId, Satellite> = {};
    for (const id of satelliteOrder) {
      const state = byId.get(id);
      if (state) out[id] = toSatellite(state, id === activeSat ? activePass : null);
    }
    return out;
  }, [satelliteOrder, byId, activeSat, activePass]);

  const livePosition = useMemo(
    () => ({
      azimuth: target?.azimuthDeg ?? 0,
      elevation: target?.elevationDeg ?? 0,
      altitude: target?.altitudeKm ?? 0,
      velocity: target?.speedKmS ?? 0,
      lat: target?.latDeg ?? SITE.latDeg,
      lng: target?.lonDeg ?? SITE.lonDeg,
      rangeKm: target?.rangeKm ?? 0,
      rangeRateKmS: target?.rangeRateKmS ?? 0,
    }),
    [target],
  );

  /* ---- the beam cluster serving the selection ----
     Drawn about the COMMANDED direction, not the spacecraft: the array is
     steered to a prediction and holds it while the target walks off, and that
     gap is the whole reason there are five tracking beams. Falling back to the
     target's own direction covers the tick between selecting an object and the
     array being re-steered onto it. */
  const beam = useMemo<BeamReadout | null>(() => {
    if (!target) return null;
    const latched: BeamPointing | undefined = pointings[target.id];
    const commanded = latched
      ? { azimuthDeg: latched.azimuthDeg, elevationDeg: latched.elevationDeg }
      : { azimuthDeg: target.azimuthDeg, elevationDeg: target.elevationDeg };
    const beams = beamDirections(commanded.azimuthDeg, commanded.elevationDeg);
    return {
      beams,
      carrying: carryingBeamIndex(beams, target.azimuthDeg, target.elevationDeg),
      driftDeg: separationDeg(
        target.azimuthDeg,
        target.elevationDeg,
        commanded.azimuthDeg,
        commanded.elevationDeg,
      ),
      assignment: plan.assignments.find((a) => a.satelliteId === target.id) ?? null,
      commanded,
      beamsPerTarget: BEAMS_PER_TARGET,
    };
  }, [target, pointings, plan]);

  /* ---- Doppler, actually computed ----
     f_shift = -(range rate / c) * f. The console used to drift a seeded
     integer by a random step; this is the shift the measured range rate
     implies on the spacecraft's own downlink, so it crosses zero at closest
     approach the way a real one does. */
  const dopplerShift = useMemo(() => {
    if (!target) return 0;
    return Math.round((-target.rangeRateKmS / C_KM_S) * downlinkHz(target.noradId));
  }, [target]);

  /* ---- VFO readouts ----
     Held as state so the operator can type over them, re-seeded when the
     selection changes. Compared during render rather than synchronised in an
     effect: the effect version renders one frame showing the previous
     spacecraft's frequencies before correcting itself. */
  const active = activeSat ? satellites[activeSat] : undefined;
  const [vfoSat, setVfoSat] = useState<SatId>('');
  const [vfo1Freq, setVfo1Freq] = useState('');
  const [vfo2Freq, setVfo2Freq] = useState('');
  if (active && vfoSat !== activeSat) {
    setVfoSat(activeSat);
    setVfo1Freq(active.vfo1Freq);
    setVfo2Freq(active.vfo2Freq);
  }

  const countdownSeconds = activePass ? Math.max(0, (activePass.los - simTime) / 1000) : 0;

  const value: DashboardContextType = {
    // The mode switch drives the simulation itself — an "offline" console that
    // kept propagating would be lying about which of the two it was in.
    mode: running ? 'realtime' : 'offline',
    setMode: (next) => {
      const store = useSimStore.getState();
      if (next === 'realtime') store.start();
      else store.stop();
    },
    activeSat,
    setActiveSat: (id) => useSimStore.getState().selectSatellite(id || null),
    satellites,
    satelliteOrder,
    livePosition,
    countdownSeconds,
    inFence: Boolean(target?.visible),
    simTime,
    passes,
    activePass,
    beam,
    rotorConnected,
    setRotorConnected,
    rotorTracking,
    setRotorTracking,
    rotorIp,
    setRotorIp,
    radioConnected,
    setRadioConnected,
    radioTracking,
    setRadioTracking,
    radioModel,
    setRadioModel,
    vfo1Freq,
    vfo2Freq,
    setVfo1Freq,
    setVfo2Freq,
    dopplerShift,
    showOrbits,
    setShowOrbits,
    showTrails,
    setShowTrails,
    showLabels,
    setShowLabels,
    events,
    addEvent,
    stationCoords: {
      lat: SITE.latDeg,
      lng: SITE.lonDeg,
      elevation: SITE.heightM,
    },
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export { TRACKING };
