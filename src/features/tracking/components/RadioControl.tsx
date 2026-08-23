'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function RadioControl() {
  const {
    radioConnected,
    setRadioConnected,
    radioTracking,
    setRadioTracking,
    radioModel,
    setRadioModel,
    vfo1Freq,
    vfo2Freq,
    dopplerShift,
    activeSat,
    satellites,
  } = useDashboard();

  const sat = satellites[activeSat];

  // Helper to format Doppler shift string
  const formatDoppler = (hz: number) => {
    const sign = hz >= 0 ? '+' : '';
    const formatted = Math.abs(hz).toLocaleString('en-US');
    return `${sign}${formatted} Hz`;
  };

  // Helper to format LED frequency readout
  const getLiveFrequency = (baseFreqStr: string, isDownlink: boolean) => {
    const digits = parseInt(baseFreqStr.replace(/\./g, ''), 10);
    if (isNaN(digits)) return baseFreqStr;

    let shifted = digits;
    if (radioTracking) {
      if (isDownlink) {
        shifted += dopplerShift;
      } else {
        shifted -= dopplerShift;
      }
    }

    const str = String(shifted);
    if (str.length < 9) return baseFreqStr;
    const p1 = str.substring(0, 3);
    const p2 = str.substring(3, 6);
    const p3 = str.substring(6, 9);
    return `${p1}.${p2}.${p3}`;
  };

  return (
    <div className="radio-control da-card flex flex-col justify-between h-full min-h-0 p-3 select-none overflow-hidden text-da-text font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 border-b border-da-border pb-1.5 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-wider text-da-text whitespace-nowrap">
          RADIO RIG CONTROL
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-da-success">
          <span className="h-1.5 w-1.5 rounded-full bg-da-success animate-pulse shrink-0" />
          <span className="truncate font-semibold">{radioModel} Tracking</span>
          <span className="text-da-muted font-normal shrink-0 ml-0.5">⊙ 0s</span>
        </div>
      </div>

      {/* Rig Select */}
      <div className="mt-2 shrink-0">
        <div className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider mb-1">
          Radio rig
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-2 text-xs font-mono font-bold text-da-text shadow-inner min-w-0">
            <select
              value={radioModel}
              onChange={(e) => setRadioModel(e.target.value)}
              aria-label="Select Radio Rig Model"
              className="text-xs da-nums font-bold bg-transparent text-da-text focus:outline-none w-full cursor-pointer"
            >
              <option value="FT-857D" className="bg-da-surface text-da-text">FT-857D</option>
              <option value="IC-9700" className="bg-da-surface text-da-text">IC-9700</option>
              <option value="TS-2000" className="bg-da-surface text-da-text">TS-2000</option>
            </select>
          </div>
          <button 
            aria-label="Radio Rig Settings"
            className="p-1.5 rounded-da bg-blue-600 hover:bg-blue-500 text-da-on-brand transition-colors cursor-pointer flex items-center justify-center shrink-0 h-7 w-7 border border-da-info/40 shadow-sm"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Transmitter details */}
      <div className="mt-1.5 shrink-0">
        <div className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider mb-0.5">
          Transmitter
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-2.5 py-1 text-[11px] font-mono font-bold text-da-text truncate">
            <span className="truncate">Mode V/U FM - Voice Repeater CTCSS 67.0</span>
          </div>
          <button className="px-2 py-1 text-[10px] font-mono font-bold bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text hover:bg-da-bg/80 transition-colors cursor-pointer flex items-center justify-center h-8 shrink-0 lowercase">
            settings
          </button>
        </div>
      </div>

      {/* VFO select boxes */}
      <div className="flex flex-col gap-1.5 mt-1.5 shrink-0">
        <div>
          <span className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider">VFO 1</span>
          <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-1.5 mt-0.5 text-xs font-mono font-bold text-da-text flex justify-between items-center cursor-pointer">
            <span className="truncate">Uplink: {sat.vfo1Uplink}</span>
            <span className="text-da-muted text-[10px] ml-1 shrink-0">▼</span>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider">VFO 2</span>
          <div className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-1.5 mt-0.5 text-xs font-mono font-bold text-da-text flex justify-between items-center cursor-pointer">
            <span className="truncate">Downlink: {sat.vfo2Downlink}</span>
            <span className="text-da-muted text-[10px] ml-1 shrink-0">▼</span>
          </div>
        </div>
      </div>

      {/* Clean Green Monospace LED Box */}
      <div className="bg-da-success-soft border border-da-success/30 rounded-md p-2 my-1.5 flex flex-col gap-1 shrink-0 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-da-muted font-semibold text-[10px]">VFO 1</span>
          <span className="text-da-success font-black tracking-wider da-nums">{getLiveFrequency(vfo1Freq, false)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-da-muted font-semibold text-[10px]">VFO 2</span>
          <span className="text-da-success font-black tracking-wider da-nums">{getLiveFrequency(vfo2Freq, true)}</span>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-[var(--color-da-success)]/20 pt-1 mt-0.5">
          <span className="text-da-muted font-semibold text-[10px]">Doppler shift:</span>
          <span className="text-da-success font-black tracking-wider da-nums">{formatDoppler(dopplerShift).replace(/,/g, '.')}</span>
        </div>
      </div>

      {/* Control Actions Stack */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {/* Row 1: CONNECT & DISCONNECT */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setRadioConnected(true)}
            className={`py-1.5 rounded-da text-[10px] font-bold uppercase text-center transition-all cursor-pointer ${
              radioConnected
                ? 'bg-da-bg text-da-label border-[max(1px,0.0625rem)] border-da-border'
                : 'bg-da-bg border-[max(1px,0.0625rem)] border-da-border text-da-text hover:bg-da-bg/80'
            }`}
            disabled={radioConnected}
          >
            CONNECT
          </button>

          <button
            onClick={() => setRadioConnected(false)}
            className="py-1.5 rounded-da text-[10px] font-bold uppercase text-center bg-da-danger hover:bg-da-danger/90 text-da-on-brand shadow-sm transition-all cursor-pointer"
            disabled={!radioConnected}
          >
            DISCONNECT
          </button>
        </div>

        {/* Row 2: TRACK RADIO & STOP */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setRadioTracking(true)}
            className={`py-1.5 rounded-da text-[10px] font-bold uppercase text-center transition-all cursor-pointer ${
              radioTracking
                ? 'bg-da-bg text-da-label border-[max(1px,0.0625rem)] border-da-border'
                : 'bg-da-bg border-[max(1px,0.0625rem)] border-da-border text-da-text hover:bg-da-bg/80'
            }`}
            disabled={!radioConnected}
          >
            TRACK RADIO
          </button>

          <button
            onClick={() => setRadioTracking(false)}
            className="py-1.5 rounded-da text-[10px] font-bold uppercase text-center bg-da-danger hover:bg-da-danger/90 text-da-on-brand shadow-md transition-all cursor-pointer"
            disabled={!radioConnected || !radioTracking}
          >
            STOP
          </button>
        </div>
      </div>
    </div>
  );
}
