'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ActiveMode = 'realtime' | 'offline';
export type SatId = 't1' | 't2' | 't3';

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

interface DashboardContextType {
  mode: ActiveMode;
  setMode: (mode: ActiveMode) => void;
  activeSat: SatId;
  setActiveSat: (id: SatId) => void;
  satellites: Record<SatId, Satellite>;
  livePosition: {
    azimuth: number;
    elevation: number;
    altitude: number;
    velocity: number;
    lat: number;
    lng: number;
  };
  countdownSeconds: number;
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

const initialSatellites: Record<SatId, Satellite> = {
  t1: {
    id: 'T1',
    noradId: '36561',
    name: 'YUBILEINY (RS30)',
    shortName: 'YUBILEINY',
    description: 'YUBILEINY (RS30) - Radio Amateur satellite',
    alive: true,
    countryFlags: ['🇷🇺'],
    baseAzimuth: 27.2,
    baseElevation: -11.3,
    baseAltitude: 1490,
    baseVelocity: 7.21,
    apogee: 1500.2,
    perigee: 1480.4,
    inclination: 98.20,
    passDuration: '0s',
    vfo1Uplink: '145.825 MHz',
    vfo2Downlink: '435.325 MHz',
    vfo1Freq: '145.825.000',
    vfo2Freq: '435.325.000',
  },
  t2: {
    id: 'T2',
    noradId: '25544',
    name: 'ISS (ZARYA)',
    shortName: 'ISS (ZARYA)',
    description: 'ISS (ZARYA) - International Space Station',
    alive: true,
    countryFlags: ['🇷🇺', '🇺🇸'],
    baseAzimuth: 306.5,
    baseElevation: 9.7,
    baseAltitude: 427,
    baseVelocity: 7.66,
    apogee: 429.1,
    perigee: 417.6,
    inclination: 98.12,
    passDuration: '8m 54s',
    vfo1Uplink: '145.987 MHz',
    vfo2Downlink: '437.810 MHz',
    vfo1Freq: '145.986.689',
    vfo2Freq: '437.809.928',
  },
  t3: {
    id: 'T3',
    noradId: '07530',
    name: 'OSCAR 7 (AO-7)',
    shortName: 'OSCAR 7',
    description: 'OSCAR 7 (AO-7) - Phase IIB amateur satellite',
    alive: true,
    countryFlags: ['🇺🇸'],
    baseAzimuth: 222.6,
    baseElevation: 26.3,
    baseAltitude: 1450,
    baseVelocity: 7.15,
    apogee: 1461.5,
    perigee: 1442.3,
    inclination: 101.82,
    passDuration: '14m 20s',
    vfo1Uplink: '145.975 MHz',
    vfo2Downlink: '29.400 MHz',
    vfo1Freq: '145.975.120',
    vfo2Freq: '29.400.085',
  },
};

const initialEvents: TrackEvent[] = [
  { time: '09:03:00.124', id: 'TRK-0248', name: 'YUBILEINY', status: 'locked', message: 'LOCK ACQUIRED' },
  { time: '09:02:58.771', id: 'TRK-0250', name: 'ISS (ZARYA)', status: 'detected', message: 'DETECTED' },
  { time: '09:02:51.362', id: 'TRK-0248', name: 'YUBILEINY', status: 'locked', message: 'TELEMETRY DECODED' },
  { time: '09:02:44.219', id: 'TRK-0251', name: 'OSCAR 7', status: 'tentative', message: 'ASSOCIATION CONFIRMED' },
  { time: '09:02:40.115', id: 'TRK-0242', name: 'UNKNOWN', status: 'lost', message: 'TRACK LOST' },
];

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ActiveMode>('realtime');
  const [activeSat, setActiveSat] = useState<SatId>('t2');
  const [satellites] = useState<Record<SatId, Satellite>>(initialSatellites);
  
  // Dynamic Live Position Simulation
  const [livePosition, setLivePosition] = useState({
    azimuth: 306.5,
    elevation: 9.7,
    altitude: 427,
    velocity: 7.66,
    lat: 13.035571678248347,
    lng: 77.51063448300057,
  });

  const [countdownSeconds, setCountdownSeconds] = useState(534); // 8m 54s in seconds
  const [dopplerShift, setDopplerShift] = useState(9922); // +9922 Hz

  // Rotor states
  const [rotorConnected, setRotorConnected] = useState<'connected' | 'disconnected' | 'parking'>('connected');
  const [rotorTracking, setRotorTracking] = useState(true);
  const [rotorIp, setRotorIp] = useState('192.168.60.97:4533');

  // Radio states
  const [radioConnected, setRadioConnected] = useState(true);
  const [radioTracking, setRadioTracking] = useState(true);
  const [radioModel, setRadioModel] = useState('FT-857D');
  const [vfo1Freq, setVfo1Freq] = useState('145.986.689');
  const [vfo2Freq, setVfo2Freq] = useState('437.809.928');

  // Map settings
  const [showOrbits, setShowOrbits] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Events
  const [events, setEvents] = useState<TrackEvent[]>(initialEvents);

  const stationCoords = {
    lat: 13.035571678248347,
    lng: 77.51063448300057,
    elevation: 780, // m
  };

  const addEvent = (event: TrackEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 19)]);
  };

  // Selecting a different satellite resets the live readouts to that
  // satellite's baseline. React's documented way to reset state when a value
  // changes is to compare it during render, not to write state from an effect:
  // the effect version renders one frame showing the previous satellite's
  // numbers before correcting itself.
  const [syncedSat, setSyncedSat] = useState(activeSat);
  if (syncedSat !== activeSat) {
    setSyncedSat(activeSat);
      const selected = satellites[activeSat];
      setLivePosition({
        azimuth: selected.baseAzimuth,
        elevation: selected.baseElevation,
        altitude: selected.baseAltitude,
        velocity: selected.baseVelocity,
        // Simulate offsets based on active satellite
        lat: stationCoords.lat + (activeSat === 't1' ? -0.15 : activeSat === 't3' ? 0.25 : 0.08),
        lng: stationCoords.lng + (activeSat === 't1' ? 0.3 : activeSat === 't3' ? -0.2 : 0.12),
      });

      if (activeSat === 't1') {
        setCountdownSeconds(0);
        setVfo1Freq(selected.vfo1Freq);
        setVfo2Freq(selected.vfo2Freq);
        setDopplerShift(-1420);
      } else if (activeSat === 't2') {
        setCountdownSeconds(534);
        setVfo1Freq(selected.vfo1Freq);
        setVfo2Freq(selected.vfo2Freq);
        setDopplerShift(9922);
      } else {
        setCountdownSeconds(860);
        setVfo1Freq(selected.vfo1Freq);
        setVfo2Freq(selected.vfo2Freq);
        setDopplerShift(3452);
      }
  }

  // Live updates simulator for Real-time mode
  useEffect(() => {
    if (mode !== 'realtime') return;

    const interval = setInterval(() => {
      // Slightly drift Azimuth, Elevation, Altitude, Doppler and Countdown
      setLivePosition(prev => {
        // Azimuth wraps around 360
        let newAz = prev.azimuth + (Math.random() - 0.3) * 0.2;
        if (newAz < 0) newAz += 360;
        if (newAz >= 360) newAz -= 360;

        // Elevation climbs or falls slowly
        let newEl = prev.elevation + (Math.random() - 0.45) * 0.1;
        if (newEl > 90) newEl = 90;
        if (newEl < -90) newEl = -90;

        // Altitude drifts by a few meters
        const newAlt = prev.altitude + (Math.random() - 0.5) * 0.05;
        // Velocity drifts slightly
        const newVel = prev.velocity + (Math.random() - 0.5) * 0.002;

        // Latitude/longitude drift to show satellite trail movement
        const newLat = prev.lat + (Math.random() - 0.4) * 0.002;
        const newLng = prev.lng + (Math.random() - 0.4) * 0.0035;

        return {
          azimuth: parseFloat(newAz.toFixed(1)),
          elevation: parseFloat(newEl.toFixed(1)),
          altitude: parseFloat(newAlt.toFixed(1)),
          velocity: parseFloat(newVel.toFixed(2)),
          lat: parseFloat(newLat.toFixed(6)),
          lng: parseFloat(newLng.toFixed(6)),
        };
      });

      setCountdownSeconds(prev => {
        if (prev <= 1) return 600; // Reset countdown
        return prev - 1;
      });

      setDopplerShift(prev => {
        const drift = Math.floor((Math.random() - 0.5) * 15);
        return prev + drift;
      });

      // Randomly trigger new track events
      if (Math.random() < 0.05) {
        const targetIds = ['TRK-0248', 'TRK-0250', 'TRK-0249', 'TRK-0251', 'TRK-0242'];
        const targetNames = ['YUBILEINY', 'ISS (ZARYA)', 'TRK-0249', 'OSCAR 7', 'TRK-0242'];
        const statuses: ('locked' | 'detected' | 'tentative' | 'lost' | 'unknown')[] = [
          'locked', 'detected', 'tentative', 'lost', 'unknown'
        ];
        const messages = [
          'TELEMETRY DECODED', 'LOCK ACQUIRED', 'SIGNAL ACQUIRED', 'RANGE UPDATE', 'TRACK LOST', 'ASSOCIATION UPDATED'
        ];

        const index = Math.floor(Math.random() * targetIds.length);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const msg = messages[Math.floor(Math.random() * messages.length)];

        const now = new Date();
        const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;

        addEvent({
          time: timeStr,
          id: targetIds[index],
          name: targetNames[index],
          status: status,
          message: msg,
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode]);

  return (
    <DashboardContext.Provider
      value={{
        mode,
        setMode,
        activeSat,
        setActiveSat,
        satellites,
        livePosition,
        countdownSeconds,
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
        stationCoords,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
