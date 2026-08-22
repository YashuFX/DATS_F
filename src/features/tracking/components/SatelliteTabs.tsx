'use client';

import React from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useDashboard, SatId } from '../context/DashboardContext';

export default function SatelliteTabs() {
  const { activeSat, setActiveSat, satellites, livePosition, mode } = useDashboard();

  // Return the live position values if this is the active satellite in real-time mode,
  // otherwise return the base values for display.
  const getDisplayCoords = (satId: SatId) => {
    const sat = satellites[satId];
    if (satId === activeSat && mode === 'realtime') {
      return {
        az: livePosition.azimuth,
        el: livePosition.elevation,
      };
    }
    return {
      az: sat.baseAzimuth,
      el: sat.baseElevation,
    };
  };

  const tabs: { id: SatId; dotColor: string }[] = [
    { id: 't1', dotColor: 'bg-da-c2' },
    { id: 't2', dotColor: 'bg-da-success' },
    { id: 't3', dotColor: 'bg-da-info' },
  ];

  return (
    <div className="flex items-center justify-between shrink-0 bg-da-surface border-b-[max(1px,0.0625rem)] border-da-border px-6 py-1 gap-4 transition-colors duration-200">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map(tab => {
          const sat = satellites[tab.id];
          const coords = getDisplayCoords(tab.id);
          const isSelected = activeSat === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveSat(tab.id)}
              className={`group flex items-center gap-3 px-3 py-1 border-[max(1px,0.0625rem)] rounded-da cursor-pointer select-none transition-all duration-200 ${
                isSelected
                  ? 'bg-da-bg border-da-border text-da-text shadow-da-card font-bold scale-[1.01]'
                  : 'bg-transparent border-transparent text-da-muted hover:bg-da-bg/40 hover:text-da-text'
              }`}
            >
              {/* Colored status dot */}
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${tab.dotColor}`} />
              
              {/* Text info */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.625rem] uppercase font-black tracking-wider text-da-label">
                    {sat.id}
                  </span>
                  <span className="text-xs font-bold whitespace-nowrap">
                    {sat.shortName}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[0.5625rem] da-nums text-da-muted">
                  <span>Az {coords.az.toFixed(1)}°</span>
                  <span className="text-da-label">|</span>
                  <span className={coords.el >= 0 ? 'text-da-success' : 'text-da-danger'}>
                    El {coords.el.toFixed(1)}°
                  </span>
                </div>
              </div>

              {/* Close/Remove tab icon (visual only) */}
              <button className="ml-2 text-da-label group-hover:text-da-text opacity-0 group-hover:opacity-100 hover:bg-da-border p-0.5 rounded transition-all cursor-pointer">
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Add Tab Button */}
        <button className="h-8 w-8 flex items-center justify-center border-[max(1px,0.0625rem)] border-dashed border-da-border rounded-da text-da-muted hover:text-da-text hover:border-da-muted hover:bg-da-bg/40 transition-all cursor-pointer">
          <Plus className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-72 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-da-label">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Search satellites (by name or NORAD ID)"
          className="w-full pl-9 pr-4 py-1 text-xs bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text placeholder:text-da-label focus:outline-hidden focus:border-da-brand transition-all"
        />
      </div>
    </div>
  );
}
