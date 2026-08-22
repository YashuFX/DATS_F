'use client';

import React from 'react';
import { Clock, Compass, MapPin, Pencil } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

/**
 * Section heading used three times down this panel: a small accent marker, then
 * the label in accent small-caps. Matches the approved design, where these read
 * as dividers rather than as another row of data.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase tracking-widest text-da-success">
      <span className="inline-block h-1 w-1 rotate-45 bg-da-success shrink-0" />
      {children}
    </span>
  );
}

/** One of the four real-time readouts. Compact, square-ish, value centred. */
function Stat({
  label,
  value,
  unit,
  tone = 'text-da-text',
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da-sm px-2 py-1.5 flex h-full flex-col justify-between">
      <span className="text-[0.5625rem] font-bold uppercase tracking-wide text-da-muted">
        {label}
      </span>
      <span className="flex items-baseline justify-center gap-0.5">
        <span className={`text-lg da-nums font-black leading-none ${tone}`}>{value}</span>
        {unit && (
          <span className="text-[0.625rem] font-bold text-da-muted da-nums">{unit}</span>
        )}
        {icon}
      </span>
    </div>
  );
}

export default function SatelliteInfo() {
  const { activeSat, satellites, livePosition, countdownSeconds, mode } = useDashboard();
  const sat = satellites[activeSat];

  // Helper to format countdown timer
  const formatCountdown = (secs: number) => {
    if (secs <= 0) return 'Pass ended';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="da-card flex flex-col h-full min-h-0 p-2 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-1.5 shrink-0">
        <span className="text-[0.6875rem] font-black uppercase tracking-widest text-da-text">
          Satellite Info
        </span>
        <span className="text-[0.625rem] font-bold da-nums text-da-muted">
          ID: {sat.noradId}
        </span>
      </div>

      {/* Identity: status dot, name, edit affordance, liveness */}
      <div className="flex items-center justify-between gap-1 mt-1.5 shrink-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-da-success shrink-0" />
          <span className="text-[0.8125rem] font-black text-da-text truncate">
            {sat.shortName}
          </span>
          <Pencil className="h-2.5 w-2.5 text-da-label shrink-0" />
        </span>
        <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5rem] font-black bg-da-success/10 text-da-success border-[max(1px,0.0625rem)] border-da-success/25 shrink-0">
          Alive
        </span>
      </div>

      {/* Pass countdown, with the operating countries alongside it */}
      <div className="flex items-center justify-between gap-1 mt-1.5 shrink-0">
        <span className="flex items-center gap-1 min-w-0">
          <Clock className="h-2.5 w-2.5 text-da-label shrink-0" />
          <span className="text-[0.6875rem] font-bold text-da-muted">Pass ends in</span>
          <span className="text-[0.6875rem] da-nums font-black text-da-text">
            {mode === 'offline' ? sat.passDuration : formatCountdown(countdownSeconds)}
          </span>
        </span>
        <span className="flex items-center gap-0.5 text-[0.625rem] shrink-0">
          {sat.countryFlags.map((flag, idx) => (
            <span key={idx} title="Operating Country">{flag}</span>
          ))}
        </span>
      </div>

      {/* Real-time position */}
      <div className="flex min-h-0 grow-[3] flex-col gap-1 mt-2">
        <SectionLabel>Real-time Position</SectionLabel>
        <div className="grid h-full grid-cols-2 gap-1">
          <Stat
            label="Elevation"
            value={`${livePosition.elevation.toFixed(1)}°`}
            tone="text-da-success"
          />
          <Stat
            label="Azimuth"
            value={`${livePosition.azimuth.toFixed(1)}°`}
            tone="text-da-success"
            icon={<Compass className="h-2.5 w-2.5 text-da-label shrink-0 ml-0.5" />}
          />
          <Stat label="Altitude" value={livePosition.altitude.toFixed(0)} unit="km" />
          <Stat label="Velocity" value={livePosition.velocity.toFixed(2)} unit="km/s" />
        </div>
      </div>

      {/* Position data */}
      <div className="flex min-h-0 grow flex-col gap-1 mt-2">
        <SectionLabel>Position Data</SectionLabel>
        <div className="grid h-full grid-cols-2 gap-1">
          <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da-sm px-2 py-1.5 flex h-full flex-col justify-between">
            <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase text-da-muted">
              <MapPin className="h-2 w-2 shrink-0" />
              Latitude
            </span>
            <span className="text-[0.75rem] da-nums font-black text-da-success">
              {livePosition.lat.toFixed(6)}° N
            </span>
          </div>
          <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da-sm px-2 py-1.5 flex h-full flex-col justify-between">
            <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase text-da-muted">
              <MapPin className="h-2 w-2 shrink-0" />
              Longitude
            </span>
            <span className="text-[0.75rem] da-nums font-black text-da-success">
              {livePosition.lng.toFixed(6)}° E
            </span>
          </div>
        </div>
      </div>

      {/* Orbital data */}
      <div className="flex min-h-0 grow flex-col gap-1 mt-2 mb-0.5">
        <SectionLabel>Orbital Data</SectionLabel>
        <div className="grid h-full items-center grid-cols-3 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da-sm px-2 py-1.5">
          <div className="flex flex-col">
            <span className="text-[0.5625rem] font-bold text-da-muted uppercase">Apogee</span>
            <span className="text-[0.75rem] da-nums font-black text-da-text mt-0.5">
              {sat.apogee.toFixed(1)} km
            </span>
          </div>
          <div className="flex flex-col border-l-[max(1px,0.0625rem)] border-da-border pl-1.5">
            <span className="text-[0.5625rem] font-bold text-da-muted uppercase">Perigee</span>
            <span className="text-[0.75rem] da-nums font-black text-da-text mt-0.5">
              {sat.perigee.toFixed(1)} km
            </span>
          </div>
          <div className="flex flex-col border-l-[max(1px,0.0625rem)] border-da-border pl-1.5">
            <span className="text-[0.5625rem] font-bold text-da-muted uppercase">
              Inclination
            </span>
            <span className="text-[0.75rem] da-nums font-black text-da-text mt-0.5">
              {sat.inclination.toFixed(2)}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
