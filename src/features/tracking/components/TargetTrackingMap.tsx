'use client';

import React from 'react';
import { Crosshair, Maximize2 } from 'lucide-react';
import { TrackingGlobe, type GlobeApi } from '@/features/mnc';
import { useDashboard } from '../context/DashboardContext';
import RadarFence from './RadarFence';

/**
 * TARGET TRACKING — the console's map.
 *
 * The instrument inside this card is `TrackingGlobe`, the same display the M&C
 * board shows. It replaced a Leaflet map driven by three hard-coded satellites
 * on a random walk, which meant the two screens could disagree about where the
 * same sky was. They cannot now: there is one propagator and one component.
 *
 * The CARD is unchanged — same `da-card`, same header, same `col-span-6` slot,
 * same fence readout floating over it. Only what is drawn inside it moved.
 *
 * The three header checkboxes were decorative before: they set state nothing
 * read. They are wired to the globe now, which is also why the two icon buttons
 * are relabelled — "Fullscreen" had no implementation behind it, and a control
 * that costs a press to discover is inert is worse on an operator console than
 * no control at all.
 */
export default function TargetTrackingMap() {
  const {
    showOrbits,
    setShowOrbits,
    showTrails,
    setShowTrails,
    showLabels,
    setShowLabels,
  } = useDashboard();

  const apiRef = React.useRef<GlobeApi | null>(null);

  /* The globe is created long after this mounts, so the toggles an operator set
     before it was ready have to be replayed onto it — otherwise a box ticked
     during the Cesium load silently does nothing. */
  const onReady = React.useCallback(
    (api: GlobeApi) => {
      apiRef.current = api;
      api.setOrbitVisible(showOrbits);
      api.setSlantVisible(showTrails);
      api.setLabelsVisible(showLabels);
    },
    [showOrbits, showTrails, showLabels],
  );

  /* One handler rather than three closures built during render: the globe is a
     mutable resource reached through a ref, and a ref must only be touched from
     an event or an effect. */
  const applyToggle = React.useCallback(
    (kind: 'orbits' | 'trails' | 'labels', next: boolean) => {
      const api = apiRef.current;
      if (kind === 'orbits') {
        setShowOrbits(next);
        api?.setOrbitVisible(next);
      } else if (kind === 'trails') {
        setShowTrails(next);
        api?.setSlantVisible(next);
      } else {
        setShowLabels(next);
        api?.setLabelsVisible(next);
      }
    },
    [setShowOrbits, setShowTrails, setShowLabels],
  );

  const resetView = React.useCallback(() => apiRef.current?.focusSite(), []);
  const fitAll = React.useCallback(() => apiRef.current?.fitAll(), []);

  const toggles: {
    kind: 'orbits' | 'trails' | 'labels';
    label: string;
    title: string;
    checked: boolean;
  }[] = [
    {
      kind: 'orbits',
      label: 'Show Orbits',
      title: "The selected target's orbit track, one revolution centred on now",
      checked: showOrbits,
    },
    {
      kind: 'trails',
      label: 'Show Trails',
      title: 'Slant paths from the station to every pass holding a beam cluster',
      checked: showTrails,
    },
    {
      kind: 'labels',
      label: 'Show Labels',
      title: 'Object names on tracked and selected spacecraft',
      checked: showLabels,
    },
  ];

  return (
    <div className="da-card flex flex-col h-full min-h-0 relative overflow-hidden transition-colors duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b-[max(1px,0.0625rem)] border-da-border shrink-0 select-none bg-da-surface">
        <span className="text-xs font-black uppercase tracking-wider text-da-text">
          Target Tracking
        </span>
        <div className="flex items-center gap-4">
          {toggles.map((toggle) => (
            <label
              key={toggle.label}
              title={toggle.title}
              className="flex items-center gap-1.5 text-[0.625rem] font-bold text-da-muted cursor-pointer hover:text-da-text transition-colors"
            >
              <input
                type="checkbox"
                checked={toggle.checked}
                onChange={(e) => applyToggle(toggle.kind, e.target.checked)}
                className="accent-da-info h-3.5 w-3.5 cursor-pointer rounded"
              />
              {toggle.label}
            </label>
          ))}

          <div className="flex items-center gap-2 border-l-[max(1px,0.0625rem)] border-da-border pl-4 text-da-muted">
            <button
              type="button"
              onClick={resetView}
              className="p-1 rounded-da-sm hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer"
              title="Centre on the ground station"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={fitAll}
              className="p-1 rounded-da-sm hover:bg-da-bg hover:text-da-text transition-colors cursor-pointer"
              title="Fit every tracked object in frame"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="grow relative z-0 min-h-0">
        <TrackingGlobe onReady={onReady} />

        {/* Floating Fence Parameters.
            Lifted clear of the bottom edge, which the globe's capacity strip
            now spans end to end. The old map legend that used to sit opposite
            it is gone with the Leaflet map: it named statuses (LOCKED /
            TENTATIVE / UNKNOWN) this display does not have, and the capacity
            strip already carries a legend for the colours it does use. */}
        <div className="absolute bottom-[3.5rem] right-4 z-20">
          <RadarFence />
        </div>
      </div>
    </div>
  );
}
