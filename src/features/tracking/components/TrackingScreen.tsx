'use client';

import React from 'react';
import { DashboardProvider } from '../context/DashboardContext';
import Header from './Header';
import SatelliteTabs from './SatelliteTabs';
import TargetTrackingMap from './TargetTrackingMap';
import SatelliteInfo from './SatelliteInfo';
import RotorControl from './RotorControl';
import RadioControl from './RadioControl';
import PassTimeline from './PassTimeline';
import NextPasses from './NextPasses';
import TrackEvents from './TrackEvents';
import Footer from './Footer';

/**
 * TRACKING — the satellite ground-control console.
 *
 * The `dats-tracking` class is load-bearing, not decorative: `globals.css`
 * keys the root font-size off it, because this screen is drawn on a 1619x1066
 * canvas while the archival board is drawn on 1440x878. Removing the class
 * hands this screen the archival board's scale and it renders oversize.
 *
 * Row weights 48/19/33 come from the approved design and are proportions, not
 * pixels, so the whole console scales as one object at any resolution.
 */
export function TrackingScreen() {
  return (
    <DashboardProvider>
      <div className="dats-tracking flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-da-bg select-none text-da-text">
        <Header />
        <SatelliteTabs />

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5">
          {/* Map and the three control panels */}
          <div className="grid min-h-0 flex-[48_48_0%] grid-cols-12 items-stretch gap-4">
            <div className="col-span-6 h-full min-h-0">
              <TargetTrackingMap />
            </div>
            <div className="col-span-2 h-full min-h-0">
              <SatelliteInfo />
            </div>
            <div className="col-span-2 h-full min-h-0">
              <RotorControl />
            </div>
            <div className="col-span-2 h-full min-h-0">
              <RadioControl />
            </div>
          </div>

          {/* Elevation timeline */}
          <div className="min-h-0 w-full flex-[19_19_0%]">
            <PassTimeline />
          </div>

          {/* Pass table and event log */}
          <div className="grid min-h-0 flex-[33_33_0%] grid-cols-12 items-stretch gap-4">
            <div className="col-span-8 h-full min-h-0">
              <NextPasses />
            </div>
            <div className="col-span-4 h-full min-h-0">
              <TrackEvents />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </DashboardProvider>
  );
}
