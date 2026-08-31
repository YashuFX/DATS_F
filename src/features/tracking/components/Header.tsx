'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/features/shell/BrandMark';
import { OperatorChip } from '@/features/shell/OperatorChip';
import { useDashboard } from '../context/DashboardContext';

export default function Header() {
  const { mode, setMode, stationCoords } = useDashboard();
  const [time, setTime] = useState<string>('09:03:00');
  const [date, setDate] = useState<string>('20 May 2025 EEST');

  // The offline readout is two constants, so it is derived below rather than
  // written into state — which also removes a setState from this effect body.
  useEffect(() => {
    if (mode === 'offline') return;

    const updateTime = () => {
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setDate(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} Local`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const displayTime = mode === 'offline' ? '09:03:00' : time;
  const displayDate = mode === 'offline' ? '20 May 2025 EEST' : date;

  return (
    <header className="flex items-center justify-between shrink-0 bg-da-surface border-b-[max(1px,0.0625rem)] border-da-border px-6 py-1.5 transition-colors duration-200 gap-4">
      {/* Identity — same mark, name and attribution as every other console. */}
      <BrandMark section="Tracking" className="pr-2" />

      {/* Left side: Mode & Station Coordinates */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-da-label">Mode</span>
          <div className="flex p-0.5 bg-da-bg rounded-da border-[max(1px,0.0625rem)] border-da-border">
            <button
              onClick={() => setMode('realtime')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-da-sm transition-all duration-200 cursor-pointer ${
                mode === 'realtime'
                  ? 'bg-da-brand text-da-on-brand shadow-da-brand'
                  : 'text-da-muted hover:text-da-text'
              }`}
            >
              Real-time
            </button>
            <button
              onClick={() => setMode('offline')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-da-sm transition-all duration-200 cursor-pointer ${
                mode === 'offline'
                  ? 'bg-da-brand text-da-on-brand shadow-da-brand'
                  : 'text-da-muted hover:text-da-text'
              }`}
            >
              Offline
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-3 px-4 border-l-[max(1px,0.0625rem)] border-da-border h-8">
          <ShieldCheck className="h-5 w-5 text-da-success" />
          <div className="flex flex-col justify-center">
            <span className="text-[0.5rem] font-bold uppercase tracking-widest text-da-label leading-none">System Status</span>
            <span className="text-xs font-black uppercase text-da-success leading-tight">Operational</span>
          </div>
        </div>

        {/* Latitude */}
        <div className="flex items-center gap-4 px-4 border-l-[max(1px,0.0625rem)] border-da-border h-8">
          <div className="flex flex-col justify-center">
            <span className="text-[0.5rem] font-bold uppercase tracking-widest text-da-label leading-none">Latitude</span>
            <span className="text-xs font-bold da-nums text-da-text leading-tight">
              {stationCoords.lat.toFixed(6)}° N
            </span>
          </div>
        </div>

        {/* Longitude */}
        <div className="flex items-center gap-4 px-4 border-l-[max(1px,0.0625rem)] border-da-border h-8">
          <div className="flex flex-col justify-center">
            <span className="text-[0.5rem] font-bold uppercase tracking-widest text-da-label leading-none">Longitude</span>
            <span className="text-xs font-bold da-nums text-da-text leading-tight">
              {stationCoords.lng.toFixed(6)}° E
            </span>
          </div>
        </div>

        {/* Elevation */}
        <div className="flex items-center gap-4 px-4 border-l-[max(1px,0.0625rem)] border-da-border h-8">
          <div className="flex flex-col justify-center">
            <span className="text-[0.5rem] font-bold uppercase tracking-widest text-da-label leading-none">Elevation</span>
            <span className="text-xs font-bold da-nums text-da-text leading-tight">
              {stationCoords.elevation} m
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Time and actions */}
      <div className="flex items-center justify-end gap-6">
        {/* Date and Time */}
        <div className="flex flex-col items-end justify-center">
          <span className="text-[1.0625rem] font-bold da-nums tracking-tight text-da-text tabular-nums leading-none">
            {displayTime}
          </span>
          <span className="text-[0.5625rem] font-semibold text-da-muted mt-0.5 tracking-wider uppercase">
            {displayDate}
          </span>
        </div>

        <div className="flex items-center gap-2 border-l-[max(1px,0.0625rem)] border-da-border pl-4 h-8">
          <OperatorChip />
        </div>
      </div>
    </header>
  );
}
