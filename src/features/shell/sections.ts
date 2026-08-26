import {
  Archive,
  CalendarClock,
  Crosshair,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * The top-level destinations in this application.
 *
 * One entry per section, not per screen: the drill-downs under a section
 * (`/monitor/lru`, `/task-history`) are reached from inside it, so listing them
 * here would turn a four-item switch into a sitemap. `match` is the prefix that
 * decides which entry is highlighted, which is why `/monitor` and not
 * `/monitor/array` — the section stays lit while you are three levels into it.
 */
export interface Section {
  id: string;
  label: string;
  href: string;
  match: string;
  icon: LucideIcon;
  blurb: string;
}

export const SECTIONS: Section[] = [
  {
    id: "monitoring",
    label: "Monitoring",
    href: "/monitor/array",
    match: "/monitor",
    icon: LayoutGrid,
    blurb: "Array health, chassis and RFSoC drill-down",
  },
  {
    id: "scheduler",
    label: "Scheduler",
    href: "/scheduler",
    match: "/scheduler",
    icon: CalendarClock,
    blurb: "Pass planning, contention and task history",
  },
  {
    id: "tracking",
    label: "Tracking",
    href: "/tracking",
    match: "/tracking",
    icon: Crosshair,
    blurb: "Live acquisition, rotor and radio control",
  },
  {
    id: "archival",
    label: "Archival",
    href: "/data-archival",
    match: "/data-archival",
    icon: Archive,
    blurb: "Records, logs, alerts, reports and exports",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    match: "/settings",
    icon: Settings,
    blurb: "Operator preferences and console configuration",
  },
];

/** Task History sits under the scheduler, so `/task-history` lights Scheduler. */
const ALIASES: Record<string, string> = { "/task-history": "/scheduler" };

export function sectionFor(pathname: string): Section | undefined {
  const path = ALIASES[pathname] ?? pathname;
  return SECTIONS.find(
    (s) => path === s.match || path.startsWith(`${s.match}/`),
  );
}
