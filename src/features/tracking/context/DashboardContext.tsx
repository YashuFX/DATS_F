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

/**
 * The three targets this console tracks — all ISRO spacecraft.
 *
 * The migrated console carried YUBILEINY (RS30), the ISS and OSCAR 7, which are
 * Russian, international and American respectively. This station tracks Indian
 * satellites, so the catalogue is RISAT-2B, CARTOSAT-3 and RESOURCESAT-2A, with
 * their real NORAD numbers and orbits.
 */
const initialSatellites: Record<SatId, Satellite> = {
  t1: {
    id: 'T1',
    noradId: '44233',
    name: 'RISAT-2B',
    shortName: 'RISAT-2B',
    description: 'RISAT-2B - X-band synthetic aperture radar imaging satellite',
    alive: true,
    countryFlags: ['🇮🇳'],
    baseAzimuth: 27.2,
    baseElevation: -11.3,
    baseAltitude: 557,
    baseVelocity: 7.58,
    apogee: 565.4,
    perigee: 548.9,
    inclination: 37.00,
    passDuration: '0s',
    vfo1Uplink: '2071.875 MHz',
    vfo2Downlink: '8212.500 MHz',
    vfo1Freq: '2.071.875.000',
    vfo2Freq: '8.212.500.000',
  },
  t2: {
    id: 'T2',
    noradId: '44804',
    name: 'CARTOSAT-3',
    shortName: 'CARTOSAT-3',
    description: 'CARTOSAT-3 - High-resolution Earth observation satellite',
    alive: true,
    countryFlags: ['🇮🇳'],
    baseAzimuth: 306.5,
    baseElevation: 9.7,
    baseAltitude: 509,
    baseVelocity: 7.61,
    apogee: 512.3,
    perigee: 504.8,
    inclination: 97.50,
    passDuration: '8m 54s',
    vfo1Uplink: '2101.800 MHz',
    vfo2Downlink: '8300.000 MHz',
    vfo1Freq: '2.101.800.000',
    vfo2Freq: '8.299.999.928',
  },
  t3: {
    id: 'T3',
    noradId: '41877',
    name: 'RESOURCESAT-2A',
    shortName: 'RESOURCESAT-2A',
    description: 'RESOURCESAT-2A - Multispectral land and water resources imager',
    alive: true,
    countryFlags: ['🇮🇳'],
    baseAzimuth: 222.6,
    baseElevation: 26.3,
    baseAltitude: 817,
    baseVelocity: 7.44,
    apogee: 823.7,
    perigee: 810.2,
    inclination: 98.72,
    passDuration: '14m 20s',
    vfo1Uplink: '2087.500 MHz',
    vfo2Downlink: '8125.000 MHz',
    vfo1Freq: '2.087.500.000',
    vfo2Freq: '8.125.000.085',
  },
};

const initialEvents: TrackEvent[] = [
  { time: '09:03:00.124', id: 'TRK-0248', name: 'RISAT-2B', status: 'locked', message: 'LOCK ACQUIRED' },
  { time: '09:02:58.771', id: 'TRK-0250', name: 'CARTOSAT-3', status: 'detected', message: 'DETECTED' },
  { time: '09:02:51.362', id: 'TRK-0248', name: 'RISAT-2B', status: 'locked', message: 'TELEMETRY DECODED' },
  { time: '09:02:44.219', id: 'TRK-0251', name: 'RESOURCESAT-2A', status: 'tentative', message: 'ASSOCIATION CONFIRMED' },
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
        const targetNames = ['RISAT-2B', 'CARTOSAT-3', 'TRK-0249', 'RESOURCESAT-2A', 'TRK-0242'];
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
