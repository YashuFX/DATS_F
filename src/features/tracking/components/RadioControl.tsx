'use client';

import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

/** Transmitter mode presets */
const TRANSMITTER_MODES = [
  'Mode V/U FM - Voice Repeater CTCSS 67.0',
  'Mode U/V FM - Voice Repeater CTCSS 88.5',
  'Mode V/V FM - Simplex',
  'Mode U/U SSB - CW/Data',
  'Mode V/U SSB - Linear Transponder',
  'Mode S/U FM - S-Band Downlink',
];

/** CTCSS tone options */
const CTCSS_TONES = ['67.0', '69.3', '71.9', '74.4', '77.0', '79.7', '82.5', '85.4', '88.5', '91.5', '94.8', '100.0', '103.5', '107.2', '110.9', '114.8', '118.8', '123.0', '127.3', '131.8', '136.5', '141.3', '146.2', '151.4', '156.7', '162.2', '167.9', '173.8', '179.9', '186.2', '192.8', '203.5', '210.7', '218.1', '225.7', '233.6', '241.8', '250.3'];

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

  // Settings panel visibility
  const [txSettingsOpen, setTxSettingsOpen] = useState(false);
  const [selectedTxMode, setSelectedTxMode] = useState(TRANSMITTER_MODES[0]);
  const [ctcssTone, setCtcssTone] = useState('67.0');
  const [txPower, setTxPower] = useState('5');

  // VFO dropdown state
  const [vfo1Open, setVfo1Open] = useState(false);
  const [vfo2Open, setVfo2Open] = useState(false);
  const [selectedVfo1, setSelectedVfo1] = useState(sat.vfo1Uplink);
  const [selectedVfo2, setSelectedVfo2] = useState(sat.vfo2Downlink);

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

  /** VFO frequency presets for each satellite */
  const vfoPresets = {
    uplink: [
      { label: `${sat.name} Uplink`, value: sat.vfo1Uplink },
      { label: 'APRS 144.800 MHz', value: '144.800 MHz' },
      { label: 'CW Beacon 145.825 MHz', value: '145.825 MHz' },
      { label: 'Telemetry 2245.000 MHz', value: '2245.000 MHz' },
    ],
    downlink: [
      { label: `${sat.name} Downlink`, value: sat.vfo2Downlink },
      { label: 'APRS 435.800 MHz', value: '435.800 MHz' },
      { label: 'S-Band 2200.000 MHz', value: '2200.000 MHz' },
      { label: 'X-Band 8450.000 MHz', value: '8450.000 MHz' },
    ],
  };

  return (
    <div className="radio-control da-card flex flex-col justify-between h-full min-h-0 p-3 select-none overflow-hidden text-da-text font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-1 border-b border-da-border pb-1.5 shrink-0">
        <span className="text-[11px] font-black uppercase tracking-wider text-da-text whitespace-nowrap">
TELEMETRY STATUS 
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
Telemtery         </div>
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
              <option value="IC-7300" className="bg-da-surface text-da-text">IC-7300</option>
              <option value="FT-991A" className="bg-da-surface text-da-text">FT-991A</option>
              <option value="IC-705" className="bg-da-surface text-da-text">IC-705</option>
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
          <div className="flex-1 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-2.5 py-1 text-[11px] font-mono font-bold text-da-text min-w-0">
            <select
              value={selectedTxMode}
              onChange={(e) => setSelectedTxMode(e.target.value)}
              aria-label="Select Transmitter Mode"
              className="text-[11px] font-mono font-bold bg-transparent text-da-text focus:outline-none w-full cursor-pointer truncate"
            >
              {TRANSMITTER_MODES.map((mode) => (
                <option key={mode} value={mode} className="bg-da-surface text-da-text">{mode}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setTxSettingsOpen(!txSettingsOpen)}
            className={`px-2 py-1 text-[10px] font-mono font-bold border-[max(1px,0.0625rem)] rounded-da transition-colors cursor-pointer flex items-center justify-center h-8 shrink-0 lowercase ${
              txSettingsOpen
                ? 'bg-da-info text-da-on-brand border-da-info/60'
                : 'bg-da-bg border-da-border text-da-text hover:bg-da-bg/80'
            }`}
          >
            settings
          </button>
        </div>
      </div>

      {/* Transmitter Settings Panel (collapsible) */}
      {txSettingsOpen && (
        <div className="shrink-0 bg-da-bg border border-da-border rounded-da p-2.5 mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-da-muted">TX Settings</span>
            <button onClick={() => setTxSettingsOpen(false)} className="text-da-muted hover:text-da-text cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* CTCSS Tone */}
          <div className="mb-1.5">
            <label className="text-[9px] font-bold text-da-muted uppercase tracking-wider">CTCSS Tone (Hz)</label>
            <select
              value={ctcssTone}
              onChange={(e) => setCtcssTone(e.target.value)}
              className="mt-0.5 w-full bg-da-surface border border-da-border rounded-da px-2 py-1 text-[10px] font-mono font-bold text-da-text focus:outline-none cursor-pointer"
            >
              {CTCSS_TONES.map((tone) => (
                <option key={tone} value={tone} className="bg-da-surface text-da-text">{tone} Hz</option>
              ))}
            </select>
          </div>

          {/* TX Power */}
          <div>
            <label className="text-[9px] font-bold text-da-muted uppercase tracking-wider">TX Power (W)</label>
            <select
              value={txPower}
              onChange={(e) => setTxPower(e.target.value)}
              className="mt-0.5 w-full bg-da-surface border border-da-border rounded-da px-2 py-1 text-[10px] font-mono font-bold text-da-text focus:outline-none cursor-pointer"
            >
              <option value="1" className="bg-da-surface text-da-text">1 W (QRP)</option>
              <option value="5" className="bg-da-surface text-da-text">5 W (Low)</option>
              <option value="10" className="bg-da-surface text-da-text">10 W (Med)</option>
              <option value="25" className="bg-da-surface text-da-text">25 W (High)</option>
              <option value="50" className="bg-da-surface text-da-text">50 W (Full)</option>
              <option value="100" className="bg-da-surface text-da-text">100 W (Max)</option>
            </select>
          </div>
        </div>
      )}

      {/* VFO select boxes */}
      <div className="flex flex-col gap-1.5 mt-1.5 shrink-0">
        <div className="relative">
          <span className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider">VFO 1</span>
          <div
            onClick={() => { setVfo1Open(!vfo1Open); setVfo2Open(false); }}
            className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-1.5 mt-0.5 text-xs font-mono font-bold text-da-text flex justify-between items-center cursor-pointer hover:bg-da-bg/80 transition-colors"
          >
            <span className="truncate">Uplink: {selectedVfo1}</span>
            <span className="text-da-muted text-[10px] ml-1 shrink-0">▼</span>
          </div>
          {vfo1Open && (
            <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-da-surface border border-da-border rounded-da shadow-lg overflow-hidden">
              {vfoPresets.uplink.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setSelectedVfo1(preset.value); setVfo1Open(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                    selectedVfo1 === preset.value
                      ? 'bg-da-info/20 text-da-info'
                      : 'text-da-text hover:bg-da-bg/60'
                  }`}
                >
                  <span className="block text-[9px] font-bold text-da-muted uppercase">{preset.label}</span>
                  <span>{preset.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <span className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider">VFO 2</span>
          <div
            onClick={() => { setVfo2Open(!vfo2Open); setVfo1Open(false); }}
            className="bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-1.5 mt-0.5 text-xs font-mono font-bold text-da-text flex justify-between items-center cursor-pointer hover:bg-da-bg/80 transition-colors"
          >
            <span className="truncate">Downlink: {selectedVfo2}</span>
            <span className="text-da-muted text-[10px] ml-1 shrink-0">▼</span>
          </div>
          {vfo2Open && (
            <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-da-surface border border-da-border rounded-da shadow-lg overflow-hidden">
              {vfoPresets.downlink.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setSelectedVfo2(preset.value); setVfo2Open(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                    selectedVfo2 === preset.value
                      ? 'bg-da-info/20 text-da-info'
                      : 'text-da-text hover:bg-da-bg/60'
                  }`}
                >
                  <span className="block text-[9px] font-bold text-da-muted uppercase">{preset.label}</span>
                  <span>{preset.value}</span>
                </button>
              ))}
            </div>
          )}
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
