'use client';

import React, { useState } from 'react';
import { ArrowRight, ListFilter } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function TrackEvents() {
  const { events } = useDashboard();
  const [filter, setFilter] = useState('all');

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'locked':
        return 'text-da-success';
      case 'detected':
        return 'text-da-info';
      case 'tentative':
        return 'text-da-c2';
      case 'lost':
        return 'text-da-danger';
      default:
        return 'text-da-label';
    }
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <div className="da-card flex flex-col p-3 select-none w-full h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border pb-2 shrink-0">
        <span className="text-[0.6875rem] font-black uppercase tracking-wider text-da-text">
          Track Events
        </span>
        <div className="flex items-center gap-1 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da px-2.5 py-1">
          <ListFilter className="h-3 w-3 text-da-muted" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[0.625rem] font-black uppercase bg-transparent text-da-muted focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="locked">Locked</option>
            <option value="detected">Detected</option>
            <option value="tentative">Tentative</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="grow min-h-0 overflow-y-auto my-1 pr-1 flex flex-col">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[0.625rem] da-nums text-da-label">
            NO LOGS RECORDED
          </div>
        ) : (
          filteredEvents.map((evt, idx) => (
            <div
              key={idx}
              className="flex flex-1 min-h-[1.375rem] items-center justify-between text-[0.625rem] da-nums border-b-[max(1px,0.0625rem)] border-da-border/30 hover:bg-da-bg/20 transition-all px-1 rounded-da-sm"
            >
              <div className="flex items-center gap-4">
                {/* Time */}
                <span className="text-da-label da-nums">{evt.time}</span>
                {/* Target ID */}
                <span className="font-bold text-da-text">{evt.id}</span>
              </div>

              {/* Event Description */}
              <span className={`font-black uppercase text-right ${getStatusStyles(evt.status)}`}>
                {evt.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer view-all link */}
      <button className="shrink-0 flex items-center justify-center gap-1.5 w-full py-1.5 bg-da-bg border-[max(1px,0.0625rem)] border-da-border rounded-da text-[0.625rem] font-black uppercase text-da-muted hover:text-da-text hover:bg-da-border/40 transition-colors cursor-pointer">
        <span>View All Events</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
