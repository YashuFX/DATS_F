import { archivalConfig } from "../config";
import type { AlertRecord, NamedCount, SeriesPoint } from "../types";

/**
 * ALERTS fixture.
 *
 * The five most recent entries are the same alerts the Archive Browser's rail
 * shows (`SEED_ALERTS` in `seed.ts`), carried here with the extra console
 * fields — category, threshold, state and who acknowledged them.
 */

const at = (iso: string) => Date.parse(iso);
const T0 = archivalConfig.demoEpoch;

export const SEED_ALERT_STATS = {
  active: 18,
  critical: 4,
  acknowledged: 7,
  resolved24h: 63,
  meanTimeToAckSeconds: 4 * 60 + 12,
};

export const ALERT_CATEGORIES = [
  "All Categories",
  "Thermal",
  "RF Link",
  "Storage",
  "Calibration",
  "Network",
  "Power",
  "Integrity",
];

export const ALERT_SOURCES = [
  "All Sources",
  "Tile-03",
  "Tile-07",
  "Tile-12",
  "TX-Array",
  "Controller-1",
  "Controller-2",
  "Archive Server",
  "arch-node-03",
];

export const SEED_ALERT_FEED: AlertRecord[] = [
  {
    id: "AL-2291",
    severity: "critical",
    title: "High Temperature Detected",
    source: "Tile-07",
    category: "Thermal",
    metricLabel: "Temperature",
    metricValue: "78.1 °C",
    threshold: "> 75.0 °C",
    state: "active",
    timestamp: at("2025-05-20T18:41:22+05:30"),
  },
  {
    id: "AL-2290",
    severity: "critical",
    title: "RF Link Degraded",
    source: "Tile-03 → Master",
    category: "RF Link",
    metricLabel: "BER",
    metricValue: "2.1e-3",
    threshold: "> 1.0e-3",
    state: "active",
    timestamp: at("2025-05-20T18:39:47+05:30"),
  },
  {
    id: "AL-2289",
    severity: "warning",
    title: "Storage Threshold Warning",
    source: "Archive Server",
    category: "Storage",
    metricLabel: "Usage",
    metricValue: "82.4%",
    threshold: "> 80.0%",
    state: "acknowledged",
    timestamp: at("2025-05-20T18:38:15+05:30"),
    acknowledgedBy: "s.menon",
  },
  {
    id: "AL-2288",
    severity: "warning",
    title: "Calibration Mismatch",
    source: "TX-Array",
    category: "Calibration",
    metricLabel: "Phase Error",
    metricValue: "5.2°",
    threshold: "> 4.0°",
    state: "active",
    timestamp: at("2025-05-20T18:37:02+05:30"),
  },
  {
    id: "AL-2287",
    severity: "info",
    title: "Network Latency High",
    source: "Controller-2",
    category: "Network",
    metricLabel: "Latency",
    metricValue: "245 ms",
    threshold: "> 200 ms",
    state: "acknowledged",
    timestamp: at("2025-05-20T18:36:18+05:30"),
    acknowledgedBy: "r.iyer",
  },
  {
    id: "AL-2286",
    severity: "critical",
    title: "Vault Write Failure",
    source: "arch-node-03",
    category: "Storage",
    metricLabel: "Failed Writes",
    metricValue: "3 in 60 s",
    threshold: "> 0",
    state: "active",
    timestamp: at("2025-05-20T18:34:21+05:30"),
  },
  {
    id: "AL-2285",
    severity: "warning",
    title: "Replication Lag",
    source: "Remote Vault",
    category: "Storage",
    metricLabel: "Lag",
    metricValue: "94 s",
    threshold: "> 60 s",
    state: "active",
    timestamp: at("2025-05-20T18:32:44+05:30"),
  },
  {
    id: "AL-2284",
    severity: "info",
    title: "Beam Settle Time Elevated",
    source: "TX-Array",
    category: "RF Link",
    metricLabel: "Settle",
    metricValue: "180 ms",
    threshold: "> 150 ms",
    state: "acknowledged",
    timestamp: at("2025-05-20T18:29:11+05:30"),
    acknowledgedBy: "auto-triage",
  },
  {
    id: "AL-2283",
    severity: "warning",
    title: "PSU Ripple Above Nominal",
    source: "Tile-12",
    category: "Power",
    metricLabel: "Ripple",
    metricValue: "42 mV",
    threshold: "> 35 mV",
    state: "active",
    timestamp: at("2025-05-20T18:24:57+05:30"),
  },
  {
    id: "AL-2282",
    severity: "critical",
    title: "Checksum Mismatch on Restore",
    source: "Cold Storage",
    category: "Integrity",
    metricLabel: "Segments",
    metricValue: "2 of 1,204",
    threshold: "> 0",
    state: "acknowledged",
    timestamp: at("2025-05-20T18:18:03+05:30"),
    acknowledgedBy: "s.menon",
  },
  {
    id: "AL-2281",
    severity: "info",
    title: "Ingest Queue Backpressure",
    source: "arch-node-01",
    category: "Storage",
    metricLabel: "Queue Depth",
    metricValue: "812 blocks",
    threshold: "> 500",
    state: "resolved",
    timestamp: at("2025-05-20T18:09:38+05:30"),
    acknowledgedBy: "auto-triage",
  },
  {
    id: "AL-2280",
    severity: "warning",
    title: "Gain Drift Detected",
    source: "Tile-05",
    category: "Calibration",
    metricLabel: "Drift",
    metricValue: "+0.18 dB",
    threshold: "> 0.15 dB",
    state: "resolved",
    timestamp: at("2025-05-20T17:58:12+05:30"),
    acknowledgedBy: "r.iyer",
  },
  {
    id: "AL-2279",
    severity: "warning",
    title: "API Latency SLO Breach",
    source: "Controller-2",
    category: "Network",
    metricLabel: "p95",
    metricValue: "1.84 s",
    threshold: "> 0.50 s",
    state: "active",
    timestamp: at("2025-05-20T17:46:29+05:30"),
  },
  {
    id: "AL-2278",
    severity: "info",
    title: "Cooling Fan Speed Increased",
    source: "Tile-07",
    category: "Thermal",
    metricLabel: "Fan",
    metricValue: "88% duty",
    threshold: "> 80%",
    state: "resolved",
    timestamp: at("2025-05-20T17:31:50+05:30"),
    acknowledgedBy: "auto-triage",
  },
  {
    id: "AL-2277",
    severity: "critical",
    title: "Worker Node Unreachable",
    source: "arch-node-03",
    category: "Network",
    metricLabel: "Heartbeat",
    metricValue: "missed 3",
    threshold: "> 2",
    state: "resolved",
    timestamp: at("2025-05-20T17:12:04+05:30"),
    acknowledgedBy: "s.menon",
  },
  {
    id: "AL-2276",
    severity: "warning",
    title: "Retention Sweep Overrun",
    source: "Scheduler",
    category: "Storage",
    metricLabel: "Duration",
    metricValue: "38 min",
    threshold: "> 30 min",
    state: "resolved",
    timestamp: at("2025-05-20T16:55:41+05:30"),
    acknowledgedBy: "auto-triage",
  },
];

/** Alerts raised per hour over the last twelve hours. */
const TREND = [3, 2, 5, 4, 7, 6, 4, 9, 11, 8, 6, 5];

const IST_OFFSET_MS = 5.5 * 3_600_000;
const topOfHour =
  Math.floor((T0 + IST_OFFSET_MS) / 3_600_000) * 3_600_000 - IST_OFFSET_MS;

export const SEED_ALERT_TREND: SeriesPoint[] = TREND.map((value, i) => ({
  t: topOfHour - (TREND.length - 1 - i) * 3_600_000,
  value,
}));

export const SEED_ALERTS_BY_SOURCE: NamedCount[] = [
  { label: "Tile-07", count: 21, color: "da-danger", detail: "Thermal · RF Link" },
  { label: "arch-node-03", count: 17, color: "da-warn", detail: "Storage · Network" },
  { label: "TX-Array", count: 14, color: "da-c3", detail: "Calibration" },
  { label: "Controller-2", count: 11, color: "da-c1", detail: "Network" },
  { label: "Archive Server", count: 9, color: "da-c5", detail: "Storage" },
  { label: "Tile-12", count: 6, color: "da-c6", detail: "Power" },
];

export const SEED_ALERT_CATEGORY_FACETS: NamedCount[] = [
  { label: "Thermal", count: 24, color: "da-danger" },
  { label: "Storage", count: 31, color: "da-warn" },
  { label: "RF Link", count: 18, color: "da-c3" },
  { label: "Calibration", count: 12, color: "da-c6" },
  { label: "Network", count: 15, color: "da-c1" },
  { label: "Power", count: 7, color: "da-c2" },
  { label: "Integrity", count: 4, color: "da-c5" },
];
