'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function RotorControl() {
  const {
    livePosition,
    rotorConnected,
    setRotorConnected,
    rotorTracking,
    setRotorTracking,
    rotorIp,
    setRotorIp,
  } = useDashboard();

  const [ipVal, setIpVal] = useState(rotorIp);
  const [isEditingIp, setIsEditingIp] = useState(false);

  // CCW / CW / UP / DOWN manual adjustments
  const [manualOffsetAz, setManualOffsetAz] = useState(0);
  const [manualOffsetEl, setManualOffsetEl] = useState(0);

  const displayAz = (livePosition.azimuth + manualOffsetAz + 360) % 360;
  // Elevation clamped between -90 and 90
  const displayEl = Math.min(90, Math.max(-90, livePosition.elevation + manualOffsetEl));

  const azimuthRotation = displayAz;

  const handleAdjustAz = (amount: number) => {
    setManualOffsetAz(prev => prev + amount);
  };

  const handleAdjustEl = (amount: number) => {
    setManualOffsetEl(prev => prev + amount);
  };

  const handlePark = () => {
    setRotorConnected('parking');
    setRotorTracking(false);
    setTimeout(() => {
      setRotorConnected('disconnected');
      setManualOffsetAz(0);
      setManualOffsetEl(0);
    }, 2000);
  };

  return (
    <section className="rotor-control da-card flex flex-col justify-between h-full min-h-0 p-3 select-none overflow-hidden text-da-text font-sans" aria-label="Rotor control">
      {/* Header (ROTOR CONTROL title only) */}
      <div className="flex items-center justify-between pb-1.5 shrink-0 border-b border-da-border">
        <span className="text-xs font-black uppercase tracking-wider text-da-text">
          ROTOR CONTROL
        </span>
      </div>

      {/* Connection Row (ROTOR S.A.T. + IP Select + Settings Button) */}
      <div className="shrink-0 my-1">
        <div className="text-[10px] font-extrabold text-da-muted uppercase tracking-wider mb-0.5">
          ROTOR S.A.T.
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-between bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-3 py-1.5 text-xs font-mono font-bold text-da-text shadow-inner min-w-0">
            {isEditingIp ? (
              <input
                type="text"
                value={ipVal}
                onChange={(e) => setIpVal(e.target.value)}
                onBlur={() => {
                  setRotorIp(ipVal);
                  setIsEditingIp(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setRotorIp(ipVal);
                    setIsEditingIp(false);
                  }
                }}
                aria-label="Rotor address"
                className="text-xs font-mono font-bold bg-transparent text-da-text focus:outline-none w-full"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setIsEditingIp(true)}
                className="text-xs font-mono font-bold text-da-text w-full cursor-pointer flex items-center justify-between"
              >
                <span className="truncate">{rotorIp}</span>
                <ChevronDown className="w-3.5 h-3.5 text-da-muted shrink-0 ml-1" />
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsEditingIp(true)}
            aria-label="Edit rotor address"
            className="p-1.5 rounded-da bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 w-8 h-8 sm:w-9 sm:h-9 border border-blue-500/40 shadow-sm"
          >
            <Settings className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Enlarged Dials Container with Readouts Directly Underneath */}
      <div className="flex items-center justify-around w-full grow py-1 gap-2 min-h-0">
        {/* Azimuth Dial & Readout Column */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 max-w-[7.5rem] max-h-[7.5rem] aspect-square flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" viewBox="-6 -6 112 112">
              {/* Outer circle */}
              <circle cx="50" cy="50" r="40" className="fill-da-bg dark:fill-[#0b1320] stroke-da-border dark:stroke-[#1e293b]" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="44" fill="none" className="stroke-da-border opacity-40" strokeWidth="1" />

              {/* Dynamic Green Sweep Arc */}
              {(() => {
                const radius = 40;
                const endX = 50 + radius * Math.sin(displayAz * Math.PI / 180);
                const endY = 50 - radius * Math.cos(displayAz * Math.PI / 180);
                return (
                  <path
                    d={`M 50 50 L 50 10 A 40 40 0 ${displayAz > 180 ? 1 : 0} 1 ${endX} ${endY} Z`}
                    fill="#10b981"
                    fillOpacity="0.18"
                    stroke="none"
                  />
                );
              })()}

              {/* Guidelines */}
              <line x1="50" y1="10" x2="50" y2="90" className="stroke-da-border opacity-70" strokeWidth="1" strokeDasharray="2, 2" />
              <line x1="10" y1="50" x2="90" y2="50" className="stroke-da-border opacity-70" strokeWidth="1" strokeDasharray="2, 2" />

              {/* Compass Labels */}
              <text x="50" y="21" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">0</text>
              <text x="81" y="53" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">90</text>
              <text x="50" y="86" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">180</text>
              <text x="19" y="53" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">270</text>

              {/* Top Caret indicator */}
              <path d="M 50 3 L 46 7 M 50 3 L 54 7" fill="none" className="stroke-da-muted" strokeWidth="1.25" />

              {/* Azimuth Needle */}
              <g transform={`rotate(${azimuthRotation} 50 50)`}>
                <line x1="50" y1="50" x2="50" y2="13" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="50,9 46.5,14 53.5,14" fill="#ef4444" />
              </g>
              {/* Center Pivot */}
              <circle cx="50" cy="50" r="4.5" fill="#ef4444" />
            </svg>
          </div>
          {/* AZ Readout directly under Azimuth dial */}
          <div className="text-center font-mono mt-0.5">
            <span className="text-da-muted text-xs font-bold mr-1">AZ:</span>
            <span className="text-da-text text-lg sm:text-xl font-black tracking-tight da-nums">{displayAz.toFixed(1)}°</span>
          </div>
        </div>

        {/* Elevation Dial & Readout Column */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 max-w-[7.5rem] max-h-[7.5rem] aspect-square flex items-center justify-center">
            <svg className="w-full h-full overflow-visible" viewBox="-6 -6 112 112">
              {/* Background quadrant wedge */}
              <path d="M 15 85 L 83 85 A 68 68 0 0 0 15 17 Z" className="fill-[#042819]/80 stroke-da-border" strokeWidth="1.5" />

              {/* Dynamic green sweep arc for elevation */}
              {(() => {
                const radius = 68;
                const rad = displayEl * Math.PI / 180;
                const endX = 15 + radius * Math.cos(rad);
                const endY = 85 - radius * Math.sin(rad);
                return (
                  <path
                    d={`M 15 85 L 85 85 A 68 68 0 0 0 ${endX} ${endY} Z`}
                    fill="#10b981"
                    fillOpacity="0.25"
                    stroke="none"
                  />
                );
              })()}

              {/* 45 degrees dashed line */}
              {(() => {
                const radius = 68;
                const rad = 45 * Math.PI / 180;
                const x = 15 + radius * Math.cos(rad);
                const y = 85 - radius * Math.sin(rad);
                return (
                  <line x1="15" y1="85" x2={x} y2={y} className="stroke-da-border opacity-80" strokeWidth="1" strokeDasharray="2, 2" />
                );
              })()}

              {/* Labels */}
              <text x="78" y="80" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">0</text>
              <text x="58" y="42" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">45</text>
              <text x="25" y="27" textAnchor="middle" className="text-[10px] font-black fill-da-text font-mono">90</text>

              {/* Elevation Needle */}
              <g transform={`rotate(${-displayEl} 15 85)`}>
                <line x1="15" y1="85" x2="83" y2="85" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="83,85 78,81.5 78,88.5" fill="#ef4444" />
                <path d="M 89 85 L 85 81 M 89 85 L 85 89" fill="none" className="stroke-da-muted" strokeWidth="1.25" />
              </g>
              {/* Center Pivot */}
              <circle cx="15" cy="85" r="4.5" fill="#ef4444" />
            </svg>
          </div>
          {/* EL Readout directly under Elevation dial */}
          <div className="text-center font-mono mt-0.5">
            <span className="text-da-muted text-xs font-bold mr-1">EL:</span>
            <span className="text-da-text text-lg sm:text-xl font-black tracking-tight da-nums">{displayEl.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* Manual Fine Tuning Controls (CCW, CW, UP, DOWN) */}
      <div className="flex justify-between w-full shrink-0 gap-1.5 my-1">
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => handleAdjustAz(-1)}
            className="flex-1 py-1.5 text-xs font-mono font-bold bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text hover:bg-da-bg/80 shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-0.5"
          >
            <span className="text-da-muted font-extrabold">↺</span> CCW
          </button>
          <button
            onClick={() => handleAdjustAz(1)}
            className="flex-1 py-1.5 text-xs font-mono font-bold bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text hover:bg-da-bg/80 shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-0.5"
          >
            CW <span className="text-da-muted font-extrabold">↴</span>
          </button>
        </div>
        <div className="flex gap-1 flex-1">
          <button
            onClick={() => handleAdjustEl(1)}
            className="flex-1 py-1.5 text-xs font-mono font-bold bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text hover:bg-da-bg/80 shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-0.5"
          >
            <span className="text-da-muted font-extrabold">↑</span> UP
          </button>
          <button
            onClick={() => handleAdjustEl(-1)}
            className="flex-1 py-1.5 text-xs font-mono font-bold bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text hover:bg-da-bg/80 shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-0.5"
          >
            <span className="text-da-muted font-extrabold">↓</span> DOWN <span className="text-da-muted font-extrabold">↓</span>
          </button>
        </div>
      </div>

      {/* Action Buttons Stack (Uniform Font Sizing) */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {/* TRACKING banner button */}
        <button
          onClick={() => setRotorTracking(!rotorTracking)}
          className="w-full py-1.5 bg-[#4ade80] hover:bg-[#22c55e] text-black font-extrabold text-[11px] uppercase tracking-wider rounded-da transition-colors cursor-pointer shadow-sm flex items-center justify-center"
        >
          TRACKING
        </button>

        {/* Row 1: CONNECT / DISCONNECT / PARK */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setRotorConnected('connected')}
            className={`py-1.5 rounded-da text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center transition-all cursor-pointer ${
              rotorConnected === 'connected'
                ? 'bg-da-bg text-da-label border-[max(1px,0.0625rem)] border-da-border'
                : 'bg-da-bg border-[max(1px,0.0625rem)] border-da-border text-da-text hover:bg-da-bg/80'
            }`}
            disabled={rotorConnected === 'connected'}
          >
            CONNECT
          </button>

          <button
            onClick={() => setRotorConnected('disconnected')}
            className="py-1.5 rounded-da text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center bg-da-danger hover:bg-da-danger/90 text-white shadow-sm transition-all cursor-pointer"
          >
            DISCONNECT
          </button>

          <button
            onClick={handlePark}
            className="py-1.5 rounded-da text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center bg-da-warn hover:bg-da-warn/90 text-black shadow-sm transition-all cursor-pointer"
          >
            {rotorConnected === 'parking' ? 'PARKING...' : 'PARK'}
          </button>
        </div>

        {/* Row 2: TRACK & STOP */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setRotorTracking(true)}
            className={`py-2 rounded-da text-[10.5px] sm:text-[11px] font-black uppercase tracking-tight text-center transition-all cursor-pointer ${
              rotorTracking
                ? 'bg-da-bg text-da-label border-[max(1px,0.0625rem)] border-da-border'
                : 'bg-da-bg border-[max(1px,0.0625rem)] border-da-border text-da-text hover:bg-da-bg/80'
            }`}
            disabled={rotorConnected !== 'connected'}
          >
            TRACK
          </button>

          <button
            onClick={() => {
              setRotorTracking(false);
              setManualOffsetAz(0);
              setManualOffsetEl(0);
            }}
            className="py-2 rounded-da text-[11px] sm:text-xs font-black uppercase tracking-wider text-center bg-da-danger hover:bg-da-danger/90 text-white shadow-md transition-all cursor-pointer"
          >
            STOP
          </button>
        </div>
      </div>
    </section>
  );
}
