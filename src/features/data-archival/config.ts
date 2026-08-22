import type { DataTypeMeta, PriorityId } from "./types";

/**
 * Everything a host application might want to rebrand or retime lives here.
 * Import the module and spread an override onto `archivalConfig` at the entry
 * point — no component reads a hard-coded label.
 */
export const archivalConfig = {
  brand: {
    title: "DATA ARCHIVAL",
    subtitle: "All Logs, Data, Tasks & Alerts",
  },
  /** IST. The board is a ground-segment console; times are always local site time. */
  timeZone: "Asia/Kolkata",
  timeZoneLabel: "IST",
  /**
   * The demo timeline starts here and advances in real time, which keeps the
   * board consistent with the approved design (20 May 2025, 18:42:31 IST)
   * instead of drifting to whatever today happens to be.
   */
  demoEpoch: Date.parse("2025-05-20T18:42:31+05:30"),
  /** Single store tick. One timer drives the whole board. */
  tickMs: 1000,
  /** A new archive record streams in on a random interval inside this range. */
  recordIntervalMs: [15_000, 25_000] as const,
  /** A new alert appears on a random interval inside this range. */
  alertIntervalMs: [45_000, 90_000] as const,
  /** Deterministic PRNG seed — the demo replays identically every time. */
  seed: 20250520,
  maxVisibleRecords: 8,
  maxVisibleTasks: 6,
  maxVisibleAlerts: 5,
} as const;

export const TABS = [
  { id: "archive-browser", label: "ARCHIVE BROWSER", href: "/data-archival" },
  { id: "logs", label: "LOGS", href: "/data-archival/logs" },
  { id: "tasks", label: "TASKS", href: "/data-archival/tasks" },
  { id: "alerts", label: "ALERTS", href: "/data-archival/alerts" },
  { id: "reports", label: "REPORTS", href: "/data-archival/reports" },
  { id: "exports", label: "EXPORTS", href: "/data-archival/exports" },
] as const;

export const DATA_TYPES: DataTypeMeta[] = [
  { id: "telemetry", label: "Telemetry Data", color: "da-c1" },
  { id: "waveform", label: "Waveform Data", color: "da-c2" },
  { id: "scheduler", label: "Scheduler Logs", color: "da-c3" },
  { id: "system", label: "System Logs", color: "da-c4" },
  { id: "configuration", label: "Configuration", color: "da-c5" },
  { id: "calibration", label: "Calibration Data", color: "da-c6" },
  { id: "reports", label: "Reports", color: "da-c7" },
];

export const DATA_TYPE_MAP: Record<string, DataTypeMeta> = Object.fromEntries(
  DATA_TYPES.map((t) => [t.id, t]),
);

export const PRIORITIES: { id: PriorityId; label: string; color: string }[] = [
  { id: "critical", label: "Critical", color: "da-danger" },
  { id: "high", label: "High", color: "da-warn" },
  { id: "medium", label: "Medium", color: "da-info" },
  { id: "low", label: "Low", color: "da-label" },
];

export const SOURCES = [
  "All Sources",
  "Tile-05",
  "Tile-12",
  "TX-Array",
  "Controller-1",
  "Controller-2",
  "Scheduler",
  "Cal Module",
  "Analytics",
  "Archive Server",
];

export const MISSIONS = [
  "All Missions",
  "TRACK-284",
  "SCHED-312",
  "WF-128",
  "SYSTEM",
  "CAL-089",
  "CONFIG",
  "RPT-056",
];

export const LOCATIONS = [
  "All Locations",
  "Primary Array",
  "Remote Vault",
  "Cold Storage",
  "Edge Cache",
];
