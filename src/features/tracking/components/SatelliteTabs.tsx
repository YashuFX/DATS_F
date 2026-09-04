'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { TRACK_COLOUR } from '@/features/mnc/trackColours';

/**
 * The served set, as tabs.
 *
 * This used to be three fixed tabs for three hard-coded spacecraft. The
 * aperture serves whatever the sky presents and the beam budget allows — a
 * dozen or two at any instant, changing as passes rise and set — so a fixed
 * tab bar could only ever have been decoration.
 *
 * Ordered by descending elevation, which is the planner's own order and also
 * the operational one: the highest pass has the shortest slant range and the
 * most time left on it.
 *
 * The tabs are CAPPED. A rail of twenty-five is not a tab bar, it is a list
 * with no room to read any entry — so the overflow is counted rather than
 * drawn, and the search box below narrows the set instead.
 */
const MAX_TABS = 8;

export default function SatelliteTabs() {
  const { activeSat, setActiveSat, satellites, satelliteOrder, livePosition } = useDashboard();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return satelliteOrder;
    return satelliteOrder.filter((id) => {
      const sat = satellites[id];
      if (!sat) return false;
      return (
        id.toLowerCase().includes(q) ||
        sat.name.toLowerCase().includes(q) ||
        sat.noradId.includes(q)
      );
    });
  }, [query, satelliteOrder, satellites]);

  const shown = matches.slice(0, MAX_TABS);
  const hidden = matches.length - shown.length;

  return (
    <div className="flex items-center justify-between shrink-0 bg-da-surface border-b-[max(1px,0.0625rem)] border-da-border px-6 py-1 gap-4 transition-colors duration-200">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.length === 0 && (
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-da-label py-2">
            {query ? 'No match in the served set' : 'Nothing in the fence'}
          </span>
        )}

        {shown.map((id) => {
          const sat = satellites[id];
          if (!sat) return null;
          const isSelected = activeSat === id;
          // The selection's angles come from the live readout, which reticks
          // four times a second; the rest carry their own last-propagated
          // state. Both are the same numbers — one is simply fresher.
          const az = isSelected ? livePosition.azimuth : sat.baseAzimuth;
          const el = isSelected ? livePosition.elevation : sat.baseElevation;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSat(id)}
              title={`${sat.name} — NORAD ${sat.noradId}`}
              className={`group flex items-center gap-3 px-3 py-1 border-[max(1px,0.0625rem)] rounded-da cursor-pointer select-none transition-all duration-200 ${
                isSelected
                  ? 'bg-da-bg border-da-border text-da-text shadow-da-card font-bold scale-[1.01]'
                  : 'bg-transparent border-transparent text-da-muted hover:bg-da-bg/40 hover:text-da-text'
              }`}
            >
              {/* The same hue the globe paints this object: the selection is
                  the target colour out on the sky, the rest are tracked. */}
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: isSelected ? TRACK_COLOUR.target : TRACK_COLOUR.tracked }}
              />

              <span className="flex flex-col items-start">
                <span className="flex items-center gap-1.5">
                  <span className="text-[0.625rem] uppercase font-black tracking-wider text-da-label">
                    {id}
                  </span>
                  <span className="text-xs font-bold whitespace-nowrap">{sat.name}</span>
                </span>
                <span className="flex items-center gap-2 mt-0.5 text-[0.5625rem] da-nums text-da-muted">
                  <span>Az {az.toFixed(1)}°</span>
                  <span className="text-da-label">|</span>
                  <span className={el >= 0 ? 'text-da-success' : 'text-da-danger'}>
                    El {el.toFixed(1)}°
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {hidden > 0 && (
          <span
            title="Served targets beyond the tab rail — search to bring one forward"
            className="flex h-8 items-center rounded-da border-[max(1px,0.0625rem)] border-dashed border-da-border px-2.5 text-[0.625rem] font-black uppercase tracking-wider text-da-muted"
          >
            +{hidden} more
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative w-72 shrink-0">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-da-label">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search satellites (by name or NORAD ID)"
          className="w-full pl-9 pr-4 py-1 text-xs bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-da-text placeholder:text-da-label focus:outline-hidden focus:border-da-brand transition-all"
        />
      </div>
    </div>
  );
}
