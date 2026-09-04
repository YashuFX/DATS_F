'use client';

import React from 'react';
import { Clock, Compass, MapPin, Radio } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { TRACK_COLOUR } from '@/features/mnc/trackColours';

/**
 * Section heading used down this panel: a small accent marker, then the label
 * in accent small-caps. These read as dividers rather than as another row of
 * data.
 */
function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-1">
      <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase tracking-widest text-da-success">
        <span className="inline-block h-1 w-1 rotate-45 bg-da-success shrink-0" />
        {children}
      </span>
      {aside}
    </span>
  );
}

/** One of the real-time readouts. Compact, square-ish, value centred. */
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

/**
 * SATELLITE INFO — everything known about the selected target.
 *
 * Every figure here now comes from the propagator the map draws from. It used
 * to come from a fixed table of three spacecraft whose azimuth was a random
 * walk, which meant this panel and the map beside it were describing different
 * skies.
 *
 * The BEAM CLUSTER section is new, and it is the one thing on this screen that
 * the map cannot show at a glance: which of the six beams serving this target
 * is actually holding it, and how far the spacecraft has walked off the
 * direction the array was steered to. That gap is the entire reason a target
 * costs five tracking beams instead of one — watching the mark move from SUM to
 * ΔEL+ and back is watching the pointing loop work.
 *
 * The panel keeps its grid slot and its outer size. The sections flex, so
 * adding one redistributes the space between them rather than growing the card.
 */
export default function SatelliteInfo() {
  const { activeSat, satellites, livePosition, countdownSeconds, inFence, beam } = useDashboard();
  const sat = activeSat ? satellites[activeSat] : undefined;

  if (!sat) {
    return (
      <div className="da-card flex h-full min-h-0 flex-col items-center justify-center p-2 select-none">
        <span className="text-[0.625rem] font-bold uppercase tracking-widest text-da-label">
          No target in the fence
        </span>
      </div>
    );
  }

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return 'Not in pass';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
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

      {/* Identity */}
      <div className="flex items-center justify-between gap-1 mt-1.5 shrink-0">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: TRACK_COLOUR.target }}
          />
          <span className="text-[0.8125rem] font-black text-da-text truncate">
            {sat.shortName}
          </span>
          <span className="text-[0.625rem] font-bold text-da-label truncate">{sat.name}</span>
        </span>
        {/* In the fence or not is the honest liveness signal here — the object
            is always "alive", the question is whether the station can see it. */}
        <span
          className={`px-1.5 py-0.5 rounded-da-sm text-[0.5rem] font-black border-[max(1px,0.0625rem)] shrink-0 ${
            inFence
              ? 'bg-da-success/10 text-da-success border-da-success/25'
              : 'bg-da-label/10 text-da-label border-da-label/25'
          }`}
        >
          {inFence ? 'In fence' : 'Out'}
        </span>
      </div>

      {/* Pass countdown */}
      <div className="flex items-center justify-between gap-1 mt-1.5 shrink-0">
        <span className="flex items-center gap-1 min-w-0">
          <Clock className="h-2.5 w-2.5 text-da-label shrink-0" />
          <span className="text-[0.6875rem] font-bold text-da-muted">Pass ends in</span>
          <span className="text-[0.6875rem] da-nums font-black text-da-text">
            {formatCountdown(countdownSeconds)}
          </span>
        </span>
        <span className="text-[0.625rem] da-nums font-bold text-da-muted shrink-0">
          {livePosition.rangeKm.toFixed(0)} km
        </span>
      </div>

      {/* Real-time position */}
      <div className="flex min-h-0 grow-[3] flex-col gap-1 mt-2">
        <SectionLabel>Real-time Position</SectionLabel>
        <div className="grid h-full grid-cols-2 gap-1">
          <Stat
            label="Elevation"
            value={`${livePosition.elevation.toFixed(1)}°`}
            tone={livePosition.elevation >= 0 ? 'text-da-success' : 'text-da-danger'}
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

      {/* Beam cluster — what the aperture is doing about this target */}
      <div className="flex min-h-0 grow-[2] flex-col gap-1 mt-2">
        <SectionLabel
          aside={
            beam?.assignment ? (
              <span className="da-nums text-[0.5625rem] font-black text-da-muted">
                F{beam.assignment.faceNum} · {beam.assignment.offBoresightDeg.toFixed(1)}° off
              </span>
            ) : (
              <span className="text-[0.5625rem] font-black uppercase text-da-danger">
                Unserved
              </span>
            )
          }
        >
          Beam Cluster
        </SectionLabel>

        <div className="flex h-full min-h-0 flex-col gap-1 rounded-da-sm border-[max(1px,0.0625rem)] border-da-border bg-da-bg px-2 py-1.5">
          <div className="flex items-baseline justify-between gap-1">
            <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase text-da-muted">
              <Radio className="h-2 w-2 shrink-0" />
              Pointing drift
            </span>
            <span className="da-nums text-[0.75rem] font-black text-da-text">
              {beam ? `${beam.driftDeg.toFixed(2)}°` : '—'}
            </span>
          </div>

          {/* The six beams and their share of this target's allocation. The
              highlighted one is the beam the spacecraft is actually inside, and
              therefore the beam the downlink is riding. */}
          <div className="grid grid-cols-3 gap-x-1.5 gap-y-0.5">
            {beam?.beams.map((b, i) => {
              const holding = b.role === 'tracking' && i === beam.carrying;
              const isData = b.role === 'data';
              return (
                <span key={b.id} className="flex items-center gap-1 min-w-0">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: isData
                        ? TRACK_COLOUR.beamData
                        : holding
                          ? TRACK_COLOUR.beamTrack
                          : 'transparent',
                      border: !isData && !holding ? `1px solid ${TRACK_COLOUR.beamTrack}` : undefined,
                      opacity: !isData && !holding ? 0.5 : 1,
                    }}
                  />
                  <span
                    className={`da-nums text-[0.5rem] font-black truncate ${
                      holding || isData ? 'text-da-text' : 'text-da-muted'
                    }`}
                  >
                    {b.id}
                  </span>
                  <span className="da-nums ml-auto text-[0.5rem] font-bold text-da-label">
                    {(b.share * 100).toFixed(0)}%
                  </span>
                </span>
              );
            })}
          </div>
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
              {Math.abs(livePosition.lat).toFixed(4)}° {livePosition.lat >= 0 ? 'N' : 'S'}
            </span>
          </div>
          <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da-sm px-2 py-1.5 flex h-full flex-col justify-between">
            <span className="flex items-center gap-1 text-[0.5625rem] font-bold uppercase text-da-muted">
              <MapPin className="h-2 w-2 shrink-0" />
              Longitude
            </span>
            <span className="text-[0.75rem] da-nums font-black text-da-success">
              {Math.abs(livePosition.lng).toFixed(4)}° {livePosition.lng >= 0 ? 'E' : 'W'}
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
