'use client';

import React from 'react';

export default function RadarFence() {
  const parameters = [
    { label: 'Azimuth', value: '-60° to +60°' },
    { label: 'Elevation', value: '10° to 70°' },
    { label: 'Range/Height', value: '0 to 2000 km' },
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
