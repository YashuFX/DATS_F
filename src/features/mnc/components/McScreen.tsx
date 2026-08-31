"use client";

import { TrackingPanel } from "./TrackingPanel";
import { HealthOverviewPanel } from "./HealthOverviewPanel";
import { HealthPreviewPanel } from "./HealthPreviewPanel";
import { SchedulerPanel } from "./SchedulerPanel";
import { ParameterPanel } from "./ParameterPanel";

/**
 * The M&C board.
 *
 * CSS Grid rather than nested flex columns, because the layout is genuinely
 * two-dimensional: Scheduler spans two columns on the second row while
 * Parameter Panel sits under Health Preview alone. Expressing that with flex
 * needs a wrapper column that exists only to hold the span, and the two rows
 * then cannot share a row height.
 *
 * Placement is EXPLICIT (`col-start` / `row-start`) rather than left to
 * auto-flow, which decouples the visual board from DOM order. DOM order is
 * therefore free to be the reading order — tracking, health, preview,
 * schedule, parameters — which is what the single-column phone stack and a
 * screen reader both get.
 *
 * RESPONSIVE LADDER. The console already scales with the viewport: globals.css
 * drives root font-size from `min(1.1111vw, 1.8223vh)`, so a rem-authored
 * layout tracks the window without breakpoints. These only change TOPOLOGY, at
 * the widths where a column count stops being readable:
 *
 *   base  one column; each panel keeps a workable min-height so the globe and
 *         the dome are not slivers, and the page scrolls.
 *   md    two columns — tracking beside health, the two parameter tables
 *         beside each other, schedule full width beneath.
 *   xl    the design's three-column board, no page scroll.
 *
 * Every track is `minmax(0, …)`: without the 0 floor a grid track refuses to
 * shrink below its content, so a scrolling table would push its row taller
 * instead of scrolling inside it.
 */
export function McScreen() {
  return (
    <div
      className={[
        "grid h-full min-h-0 gap-[0.625rem] overflow-auto p-[0.625rem]",
        "grid-cols-1 auto-rows-[minmax(17rem,auto)]",
        "md:grid-cols-2 md:auto-rows-[minmax(15rem,auto)]",
        "xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1fr)]",
        "xl:grid-rows-[minmax(0,1.12fr)_minmax(0,1fr)] xl:auto-rows-auto xl:overflow-hidden",
      ].join(" ")}
    >
      <TrackingPanel className="md:col-start-1 md:row-start-1 xl:col-start-1 xl:row-start-1" />
      <HealthOverviewPanel className="md:col-start-2 md:row-start-1 xl:col-start-2 xl:row-start-1" />
      <HealthPreviewPanel className="md:col-start-1 md:row-start-2 xl:col-start-3 xl:row-start-1" />
      <SchedulerPanel className="md:col-span-2 md:col-start-1 md:row-start-3 xl:col-span-2 xl:col-start-1 xl:row-start-2" />
      <ParameterPanel className="md:col-start-2 md:row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-2" />
    </div>
  );
}
