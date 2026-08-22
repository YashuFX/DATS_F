import { archivalConfig } from "../config";
import type {
  ActivityPoint,
  AlertItem,
  ActiveTask,
  ArchiveRecord,
  DistributionSlice,
  PriorityFacet,
  StorageStats,
  SystemHealth,
  TypeFacet,
} from "../types";

/**
 * Every literal in this file is transcribed from the approved design
 * (20 May 2025, 18:42:31 IST). The live store starts from exactly this state,
 * so the first paint is pixel-identical to the mockup before anything moves.
 *
 * ── VALUES TO CONFIRM AGAINST A HI-RES EXPORT ──────────────────────────────
 * The supplied screenshot is a 1006px downscale of a 1440px board, so a few
 * small figures are not legible with certainty:
 *
 *  1. DATA TYPE facet counts sum to 135,534 but "All Types" reads 132,458
 *     (a 3,076 gap). The PRIORITY facets sum to 132,458 exactly, which
 *     confirms the total — so one data-type count is misread, most likely
 *     Scheduler Logs. Values kept as-read for visual fidelity.
 *  2. RESOLVED from the client's zoomed reference: the DATA DISTRIBUTION TB
 *     figures are 56.8 / 22.1 / 18.2 / 12.6 / 4.2 / 3.5 / 2.9 / 9.3 TB. They
 *     do not reconcile with the 48.72 TB total, but they are what the approved
 *     design shows — see the note on SEED_DISTRIBUTION below.
 * ──────────────────────────────────────────────────────────────────────────
 */

const T0 = archivalConfig.demoEpoch;
const at = (iso: string) => Date.parse(iso);

export const SEED_TOTAL_RECORDS = 132_458;
export const SEED_TOTAL_SIZE_TB = 48.72;
export const SEED_RECORDS_DELTA_PERCENT = 12.4;

export const SEED_HEALTH: SystemHealth = {
  systemStatus: "operational",
  dataStore: "online",
  lastArchiveAt: at("2025-05-20T18:40:12+05:30"),
  activeTaskCount: 12,
  criticalAlertCount: 2,
  dataIntegrity: "nominal",
  lastIntegrityCheckAt: at("2025-05-20T18:35:12+05:30"),
  checksumStatus: "verified",
  autoArchive: true,
  nextArchiveInSeconds: 2 * 60 + 17, // "In 02:17"
};

export const SEED_STORAGE: StorageStats = {
  usedTB: 48.7,
  totalTB: 120,
  archiveRateGBPerHour: 152,
  retentionDays: 89,
};

export const SEED_RECORDS: ArchiveRecord[] = [
  {
    id: "r-1",
    timestamp: at("2025-05-20T18:40:12+05:30"),
    dataType: "telemetry",
    source: "Tile-05",
    mission: "TRACK-284",
    fileName: "telemetry_tile05_20250520_184012.h5",
    sizeBytes: 2.45 * 1024 ** 3,
    priority: "high",
    status: "archived",
  },
  {
    id: "r-2",
    timestamp: at("2025-05-20T18:39:58+05:30"),
    dataType: "scheduler",
    source: "Scheduler",
    mission: "SCHED-312",
    fileName: "scheduler_log_20250520_183958.log",
    sizeBytes: 14.2 * 1024 ** 2,
    priority: "medium",
    status: "archived",
  },
  {
    id: "r-3",
    timestamp: at("2025-05-20T18:39:41+05:30"),
    dataType: "waveform",
    source: "TX-Array",
    mission: "WF-128",
    fileName: "waveform_txarray_20250520_183941.bin",
    sizeBytes: 5.67 * 1024 ** 3,
    priority: "high",
    status: "archived",
  },
  {
    id: "r-4",
    timestamp: at("2025-05-20T18:39:33+05:30"),
    dataType: "system",
    source: "Controller-1",
    mission: "SYSTEM",
    fileName: "system_log_20250520_183933.log",
    sizeBytes: 6.7 * 1024 ** 2,
    priority: "low",
    status: "archived",
  },
  {
    id: "r-5",
    timestamp: at("2025-05-20T18:39:21+05:30"),
    dataType: "calibration",
    source: "Cal Module",
    mission: "CAL-089",
    fileName: "calib_tnrx_20250520_183921.cal",
    sizeBytes: 312 * 1024 ** 2,
    priority: "medium",
    status: "archived",
  },
  {
    id: "r-6",
    timestamp: at("2025-05-20T18:39:10+05:30"),
    dataType: "telemetry",
    source: "Tile-12",
    mission: "TRACK-284",
    fileName: "telemetry_tile12_20250520_183910.h5",
    sizeBytes: 2.41 * 1024 ** 3,
    priority: "high",
    status: "archived",
  },
  {
    id: "r-7",
    timestamp: at("2025-05-20T18:38:59+05:30"),
    dataType: "configuration",
    source: "System",
    mission: "CONFIG",
    fileName: "system_config_20250520_183859.json",
    sizeBytes: 1.3 * 1024 ** 2,
    priority: "low",
    status: "archived",
  },
  {
    id: "r-8",
    timestamp: at("2025-05-20T18:38:42+05:30"),
    dataType: "reports",
    source: "Analytics",
    mission: "RPT-056",
    fileName: "report_daily_20250520_183842.pdf",
    sizeBytes: 6.2 * 1024 ** 2,
    priority: "medium",
    status: "archived",
  },
];

export const SEED_TASKS: ActiveTask[] = [
  {
    id: "t-1",
    title: "Telemetry Data Archival",
    subtitle: "Tile-05",
    icon: "file-text",
    progress: 72,
    etaSeconds: 14 * 60 + 32,
    rate: 0.055,
    accent: "da-c1",
  },
  {
    id: "t-2",
    title: "Waveform Data Compression",
    subtitle: "TX-Array",
    icon: "activity",
    progress: 45,
    etaSeconds: 12 * 60 + 11,
    rate: 0.062,
    accent: "da-c3",
  },
  {
    id: "t-3",
    title: "Log Retention & Cleanup",
    subtitle: "System",
    icon: "list",
    progress: 89,
    etaSeconds: 3 * 60 + 21,
    rate: 0.048,
    accent: "da-c4",
  },
  {
    id: "t-4",
    title: "Calibration Data Validation",
    subtitle: "Cal Module",
    icon: "target",
    progress: 33,
    etaSeconds: 15 * 60 + 42,
    rate: 0.041,
    accent: "da-c6",
  },
  {
    id: "t-5",
    title: "Report Generation",
    subtitle: "Analytics",
    icon: "bar-chart",
    progress: 66,
    etaSeconds: 6 * 60 + 18,
    rate: 0.07,
    accent: "da-c7",
  },
  {
    id: "t-6",
    title: "Backup to Remote Storage",
    subtitle: "Archive Server",
    icon: "database",
    progress: 78,
    etaSeconds: 9 * 60 + 7,
    rate: 0.05,
    accent: "da-c5",
  },
];

export const SEED_ALERTS: AlertItem[] = [
  {
    id: "a-1",
    severity: "critical",
    title: "High Temperature Detected",
    source: "Tile-07",
    metricLabel: "Temperature",
    metricValue: "78°C",
    timestamp: at("2025-05-20T18:41:22+05:30"),
  },
  {
    id: "a-2",
    severity: "critical",
    title: "RF Link Degraded",
    source: "Tile-03 → Master",
    metricLabel: "BER",
    metricValue: "2.1e-3",
    timestamp: at("2025-05-20T18:39:47+05:30"),
  },
  {
    id: "a-3",
    severity: "warning",
    title: "Storage Threshold Warning",
    source: "Archive Server",
    metricLabel: "Usage",
    metricValue: "82%",
    timestamp: at("2025-05-20T18:38:15+05:30"),
  },
  {
    id: "a-4",
    severity: "warning",
    title: "Calibration Mismatch",
    source: "TX-Array",
    metricLabel: "Phase Error",
    metricValue: "5.2°",
    timestamp: at("2025-05-20T18:37:02+05:30"),
  },
  {
    id: "a-5",
    severity: "info",
    title: "Network Latency High",
    source: "Controller-2",
    metricLabel: "Latency",
    metricValue: "245ms",
    timestamp: at("2025-05-20T18:36:18+05:30"),
  },
];

export const SEED_TYPE_FACETS: TypeFacet[] = [
  { id: "scheduler", label: "Scheduler Logs", count: 33_281 },
  { id: "telemetry", label: "Telemetry Data", count: 56_837 },
  { id: "waveform", label: "Waveform Data", count: 22_144 },
  { id: "system", label: "System Logs", count: 12_697 },
  { id: "configuration", label: "Configuration", count: 4_231 },
  { id: "calibration", label: "Calibration Data", count: 3_452 },
  { id: "reports", label: "Reports", count: 2_892 },
];

export const SEED_PRIORITY_FACETS: PriorityFacet[] = [
  { id: "critical", label: "Critical", count: 1_245 },
  { id: "high", label: "High", count: 8_432 },
  { id: "medium", label: "Medium", count: 45_231 },
  { id: "low", label: "Low", count: 77_550 },
];

/**
 * Verbatim from the design's legend — both the TB figure and the percentage.
 *
 * These do not reconcile with the other cards, and that is intentional: the TB
 * column sums to 129.6 TB against a stated 48.72 TB total, and the percentages
 * sum to 88%, not 100%. The client asked for the approved design reproduced
 * exactly, so the printed values are left alone; only the donut's arc lengths
 * are normalised, so the ring closes instead of leaving a 12% wedge missing.
 */
export const SEED_DISTRIBUTION: DistributionSlice[] = [
  { id: "telemetry", label: "Telemetry Data", sizeTB: 56.8, percent: 38.5, color: "da-c1" },
  { id: "waveform", label: "Waveform Data", sizeTB: 22.1, percent: 15.0, color: "da-c2" },
  { id: "scheduler", label: "Scheduler Logs", sizeTB: 18.2, percent: 12.3, color: "da-c3" },
  { id: "system", label: "System Logs", sizeTB: 12.6, percent: 8.6, color: "da-c4" },
  { id: "configuration", label: "Configuration", sizeTB: 4.2, percent: 2.9, color: "da-c5" },
  { id: "calibration", label: "Calibration Data", sizeTB: 3.5, percent: 2.4, color: "da-c6" },
  { id: "reports", label: "Reports", sizeTB: 2.9, percent: 2.0, color: "da-c7" },
  { id: "other", label: "Other", sizeTB: 9.3, percent: 6.3, color: "da-c8" },
];

/**
 * 25 hourly buckets ending at the top of the current demo hour, traced point by
 * point off the design's curve: a near-zero start at 18:00, a fast climb to a
 * ~680 GB evening plateau, an overnight trough, the 03:00 bulk-archive spike
 * just under 900 GB, a jagged 400-520 GB daytime band, then a taper to ~120 GB.
 */
const ACTIVITY_GB = [
  60, 640, 660, 680, 620, 600, 470, 430, 520, 900, 780, 480, 430, 450, 470,
  500, 520, 400, 430, 470, 440, 420, 250, 300, 120,
];

export const SEED_ACTIVITY: ActivityPoint[] = (() => {
  // Floor to the top of the hour *in IST*, not UTC — IST is +05:30, so a UTC
  // hour boundary lands on :30 locally and the axis would read 18:30, 22:30.
  const IST_OFFSET_MS = 5.5 * 3_600_000;
  const topOfHour =
    Math.floor((T0 + IST_OFFSET_MS) / 3_600_000) * 3_600_000 - IST_OFFSET_MS;
  return ACTIVITY_GB.map((gb, i) => ({
    t: topOfHour - (ACTIVITY_GB.length - 1 - i) * 3_600_000,
    gb,
  }));
})();
