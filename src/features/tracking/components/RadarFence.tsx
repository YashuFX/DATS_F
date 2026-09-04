'use client';

import React from 'react';
import { TRACKING } from '@/features/mnc/data/mnc.mock';

/**
 * The tracking volume, as the simulation actually defines it.
 *
 * These were three hard-coded strings — "-60° to +60°", "10° to 70°", "0 to
 * 2000 km" — and every one of them was wrong about the station they were drawn
 * over. The dome is hemispherical: 26 faces cover the full 360° of azimuth and
 * 0-90° of elevation between them, and the ±30° figure that inspired the old
 * azimuth range is a single FACE's scan limit, not the aperture's.
 *
 * Read from `TRACKING` so the caption, the shell drawn on the globe and the
 * planner's own visibility test cannot drift apart.
 */
export default function RadarFence() {
  const parameters = [
    { label: 'Azimuth', value: '0° to 360°' },
    { label: 'Elevation', value: `${TRACKING.elevationMaskDeg}° to 90°` },
    { label: 'Max Range', value: `${TRACKING.maxRangeKm.toLocaleString()} km` },
    { label: 'Face Scan', value: `±${TRACKING.faceScanLimitDeg}°` },
  ];

  return (
    <div className="bg-white/65 dark:bg-black/60 backdrop-blur-xs border-[max(1px,0.0625rem)] border-black/10 dark:border-white/10 px-4 py-3 rounded-da shadow-da-card select-none transition-colors w-48 font-sans">
      <div className="text-[0.625rem] font-black uppercase text-da-success tracking-wider mb-2 da-nums">
        Fence Parameters
      </div>
      <div className="flex flex-col gap-1.5">
        {parameters.map((param) => (
          <div key={param.label} className="flex justify-between items-center text-[0.625rem]">
            <span className="text-da-muted font-bold da-nums uppercase tracking-wide">
              {param.label}
            </span>
            <span className="text-da-text font-black da-nums">
              {param.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
