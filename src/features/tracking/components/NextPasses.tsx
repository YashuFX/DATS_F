'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';

interface PassData {
  num: number;
  status: 'visible' | 'upcoming';
  isLive?: boolean;
  aos: string;
  los: string;
  duration: string;
  maxElevationPct: number;
  distAos: string;
  distLos: string;
  distPeak: string;
  maxElVal: string;
  maxElColor: string;
}

export default function NextPasses() {
  const { activeSat, satellites } = useDashboard();
  const sat = satellites[activeSat];

  const passList: PassData[] = [
    {
      num: 1,
      status: 'visible',
      isLive: true,
      aos: '08:56:00',
      los: '09:11:55',
      duration: '15m 55s',
      maxElevationPct: 89,
      distAos: '2,372.64 km',
      distLos: '2,365.42 km',
      distPeak: '426.19 km',
      maxElVal: '89.79°',
      maxElColor: 'text-da-success',
    },
    {
      num: 2,
      status: 'upcoming',
      aos: '10:38:27',
      los: '10:47:02',
      duration: '8m 35s',
      maxElevationPct: 11,
      distAos: '2,372.24 km',
      distLos: '2,361.15 km',
      distPeak: '1,512.48 km',
      maxElVal: '9.99°',
      maxElColor: 'text-da-c2',
    },
    {
      num: 3,
      status: 'upcoming',
      aos: '00:11:11',
      los: '00:15:27',
      duration: '4m 16s',
      maxElevationPct: 2,
      distAos: '2,338.86 km',
      distLos: '2,350.46 km',
      distPeak: '2,165.97 km',
      maxElVal: '1.67°',
      maxElColor: 'text-da-label',
    },
    {
      num: 4,
      status: 'upcoming',
      aos: '01:44:00',
      los: '01:54:33',
      duration: '10m 33s',
      maxElevationPct: 39,
      distAos: '2,338.62 km',
      distLos: '2,363.33 km',
      distPeak: '684.34 km',
      maxElVal: '35.42°',
      maxElColor: 'text-da-text',
    },
    {
      num: 5,
      status: 'upcoming',
      aos: '03:20:50',
      los: '03:31:23',
      duration: '10m 33s',
      maxElevationPct: 33,
      distAos: '2,349.23 km',
      distLos: '2,368.62 km',
      distPeak: '774.19 km',
      maxElVal: '30.19°',
      maxElColor: 'text-da-text',
    },
    {
      num: 6,
      status: 'upcoming',
      aos: '05:00:15',
      los: '05:07:44',
      duration: '7m 29s',
      maxElevationPct: 14,
      distAos: '2,352.41 km',
      distLos: '2,369.18 km',
      distPeak: '1,220.14 km',
      maxElVal: '13.12°',
      maxElColor: 'text-da-muted',
    },
    {
      num: 7,
      status: 'upcoming',
      aos: '06:42:10',
      los: '06:51:30',
      duration: '9m 20s',
      maxElevationPct: 18,
      distAos: '2,361.80 km',
      distLos: '2,371.44 km',
      distPeak: '1,024.50 km',
      maxElVal: '16.45°',
      maxElColor: 'text-da-muted',
    },
  ];

  return (
    <div className="da-card flex flex-col p-3 select-none w-full h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 border-b-[max(1px,0.0625rem)] border-da-border pb-2">
        <h3 className="text-[0.6875rem] font-black uppercase tracking-wider text-da-text">
          Next Passes for {sat.name} in Next 24 Hours ({passList.length} Passes)
        </h3>
      </div>

      {/* Table Container */}
      <div className="grow min-h-0 overflow-auto mt-1">
        <table className="h-full w-full text-left border-collapse text-[0.625rem] font-medium min-w-[43.75rem]">
          <thead>
            <tr className="text-da-label border-b-[max(1px,0.0625rem)] border-da-border/60 font-black uppercase tracking-wider">
              <th className="py-1.5 w-8 font-black">#</th>
              <th className="py-1.5 w-28 font-black">Status</th>
              <th className="py-1.5 font-black">AOS (Start)</th>
              <th className="py-1.5 font-black">LOS (End)</th>
              <th className="py-1.5 font-black">Duration</th>
              <th className="py-1.5 w-24 font-black">Max Elevation</th>
              <th className="py-1.5 font-black">Distance at AOS</th>
              <th className="py-1.5 font-black">Distance at LOS</th>
              <th className="py-1.5 font-black">Distance at Peak</th>
              <th className="py-1.5 text-right font-black">Max El</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-da-border/40 da-nums text-da-muted">
            {passList.map(pass => (
              <tr key={pass.num} className="hover:bg-da-bg/40 transition-colors">
                <td className="py-1.5 text-da-label">{pass.num}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    {pass.status === 'visible' ? (
                      <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-success/10 text-da-success border-[max(1px,0.0625rem)] border-da-success/20">
                        Visible
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-warn/10 text-da-warn border-[max(1px,0.0625rem)] border-da-warn/30">
                        Upcoming
                      </span>
                    )}

                    {pass.isLive && (
                      <span className="px-1.5 py-0.5 rounded-da-sm text-[0.5625rem] font-black uppercase bg-da-danger text-white flex items-center gap-1 animate-pulse">
                        <span className="h-1 w-1 bg-white rounded-full" />
                        Live
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 text-da-text font-bold">{pass.aos}</td>
                <td className="py-1.5">{pass.los}</td>
                <td className="py-1.5 font-sans font-semibold">{pass.duration}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-da-bg rounded-full h-1.5 overflow-hidden border-[max(1px,0.0625rem)] border-da-border">
                      <div
                        className="bg-da-success h-full rounded-full"
                        style={{ width: `${pass.maxElevationPct}%` }}
                      />
                    </div>
                    <span className="text-[0.625rem] text-da-label font-bold">{pass.maxElevationPct}%</span>
                  </div>
                </td>
                <td className="py-1.5">{pass.distAos}</td>
                <td className="py-1.5">{pass.distLos}</td>
                <td className="py-1.5">{pass.distPeak}</td>
                <td className={`py-1.5 text-right font-black ${pass.maxElColor}`}>
                  {pass.maxElVal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
