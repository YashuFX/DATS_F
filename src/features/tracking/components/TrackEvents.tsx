'use client';

import React, { useState } from 'react';
import { ListFilter } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

/**
 * TRACK EVENTS — the fence log.
 *
 * Every line is now a real transition recorded by the adapter: a spacecraft
 * crossing into the tracking volume, winning or losing a beam cluster, or
 * setting. It used to be a random draw from five ids, five statuses and six
 * messages fired on a 5% chance each second, which produced a log that looked
 * busy and said nothing — rows referring to objects the map was not drawing.
 *
 * The name column is new. With a catalogue of 250 rather than three fixed
 * targets, an id alone is not enough to know what the row is about.
 */
export default function TrackEvents() {
  const { events, setActiveSat } = useDashboard();
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

  /* Events are keyed by time+id+message rather than by index: the list is
     prepended to, so an index key would re-associate every row with different
     data on each new event and animate the whole log instead of one row. */
  const keyFor = (e: (typeof events)[number], i: number) =>
    `${e.time}-${e.id}-${e.message}-${i}`;

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
            {filter === 'all' ? 'WAITING FOR FENCE ACTIVITY' : 'NO EVENTS OF THIS TYPE'}
          </div>
        ) : (
          filteredEvents.map((evt, idx) => (
            <button
              key={keyFor(evt, idx)}
              type="button"
              onClick={() => setActiveSat(evt.id)}
              title={`${evt.name} — select this target`}
              className="flex flex-1 min-h-[1.375rem] w-full cursor-pointer items-center justify-between gap-2 text-[0.625rem] da-nums border-b-[max(1px,0.0625rem)] border-da-border/30 hover:bg-da-bg/40 transition-all px-1 rounded-da-sm text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* Simulated time, not wall time — the console's own clock. */}
                <span className="text-da-label da-nums shrink-0">{evt.time}</span>
                <span className="font-bold text-da-text shrink-0">{evt.id}</span>
                <span className="truncate text-da-label">{evt.name}</span>
              </div>

              <span
                className={`font-black uppercase text-right shrink-0 ${getStatusStyles(evt.status)}`}
              >
                {evt.message}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
