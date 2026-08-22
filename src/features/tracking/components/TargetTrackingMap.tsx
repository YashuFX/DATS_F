'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Crosshair, Maximize2, RefreshCw } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import RadarFence from './RadarFence';

// Import MapInner dynamically with SSR disabled to prevent Leaflet execution on server-side.
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-da-surface text-da-muted transition-colors duration-200">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-da-success" />
        <span className="text-xs font-bold uppercase tracking-wider da-nums">
          Loading Ground Station Maps...
        </span>
      </div>
    </div>
  ),
});

export default function TargetTrackingMap() {
  const {
    showOrbits,
    setShowOrbits,
    showTrails,
    setShowTrails,
    showLabels,
    setShowLabels,
  } = useDashboard();

  return (
    <div className="da-card flex flex-col h-full min-h-0 relative overflow-hidden transition-colors duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b-[max(1px,0.0625rem)] border-da-border shrink-0 select-none bg-da-surface">
        <span className="text-xs font-black uppercase tracking-wider text-da-text">
          Target Tracking
        </span>
        <div className="flex items-center gap-4">
          {/* Controls */}
          <label className="flex items-center gap-1.5 text-[0.625rem] font-bold text-da-muted cursor-pointer hover:text-da-text transition-colors">
            <input
              type="checkbox"
              checked={showOrbits}
              onChange={(e) => setShowOrbits(e.target.checked)}
              className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded"
            />
            Show Orbits
          </label>
          <label className="flex items-center gap-1.5 text-[0.625rem] font-bold text-da-muted cursor-pointer hover:text-da-text transition-colors">
            <input
              type="checkbox"
              checked={showTrails}
              onChange={(e) => setShowTrails(e.target.checked)}
              className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded"
            />
            Show Trails
          </label>
          <label className="flex items-center gap-1.5 text-[0.625rem] font-bold text-da-muted cursor-pointer hover:text-da-text transition-colors">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded"
            />
            Show Labels
          </label>

          <div className="flex items-center gap-2 border-l-[max(1px,0.0625rem)] border-da-border pl-4 text-da-muted">
            <button className="p-1 rounded-da-sm hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer" title="Reset View">
              <Crosshair className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 rounded-da-sm hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer" title="Fullscreen">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="grow relative z-0">
        <MapInner />

        {/* Floating Map Legend (Bottom Left) - translucent glassmorphic style matching the mockup */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/65 dark:bg-black/60 backdrop-blur-xs border-[max(1px,0.0625rem)] border-black/10 dark:border-white/10 px-4 py-3 rounded-da shadow-da-card select-none transition-colors">
          <div className="flex flex-col gap-2">
            {[
              { label: 'LOCKED', color: 'bg-[#10b981]' },
              { label: 'DETECTED', color: 'bg-[#3b82f6]' },
              { label: 'TENTATIVE', color: 'bg-[#f59e0b]' },
              { label: 'LOST', color: 'bg-[#ef4444]' },
              { label: 'UNKNOWN', color: 'bg-[#5a6e85]' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-[0.625rem] font-black uppercase text-da-muted dark:text-white/70 tracking-wider da-nums">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Fence Parameters (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-10">
          <RadarFence />
        </div>
      </div>
    </div>
  );
}
