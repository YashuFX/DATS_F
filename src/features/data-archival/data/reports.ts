import { archivalConfig } from "../config";
import type { ReportItem, ReportTemplate, ScheduledReport, SeriesPoint } from "../types";

/**
 * REPORTS fixture. The daily summary generated at 18:38:42 is the same document
 * archived as record `r-8` (RPT-056) on the Archive Browser.
 */

const at = (iso: string) => Date.parse(iso);
const T0 = archivalConfig.demoEpoch;
const MB = 1024 ** 2;

export const SEED_REPORT_STATS = {
  generatedThisMonth: 142,
  scheduled: 9,
  generating: 2,
  failed: 1,
  avgGenerationSeconds: 42,
  totalSizeGB: 3.8,
};

export const SEED_REPORTS: ReportItem[] = [
  {
    id: "RPT-056",
    name: "Daily Archive Summary — 20 May 2025",
    category: "Operations",
    period: "20 May 2025",
    generatedAt: at("2025-05-20T18:38:42+05:30"),
    sizeBytes: 6.2 * MB,
    format: "PDF",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-055",
    name: "Storage Utilization & Forecast",
    category: "Capacity",
    period: "Week 20",
    generatedAt: at("2025-05-20T18:11:04+05:30"),
    sizeBytes: 3.4 * MB,
    format: "PDF",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-054",
    name: "Mission Data Completeness — TRACK-284",
    category: "Mission",
    period: "18 – 20 May 2025",
    generatedAt: at("2025-05-20T17:52:31+05:30"),
    sizeBytes: 11.8 * MB,
    format: "XLSX",
    status: "ready",
    owner: "r.iyer",
  },
  {
    id: "RPT-053",
    name: "Calibration Drift Analysis",
    category: "Engineering",
    period: "13 – 20 May 2025",
    generatedAt: at("2025-05-20T17:20:18+05:30"),
    sizeBytes: 8.1 * MB,
    format: "PDF",
    status: "generating",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-052",
    name: "Retention Compliance Audit",
    category: "Compliance",
    period: "May 2025",
    generatedAt: at("2025-05-20T16:45:09+05:30"),
    sizeBytes: 2.6 * MB,
    format: "PDF",
    status: "ready",
    owner: "s.menon",
  },
  {
    id: "RPT-051",
    name: "Alert Response Summary",
    category: "Operations",
    period: "19 – 20 May 2025",
    generatedAt: at("2025-05-20T15:30:55+05:30"),
    sizeBytes: 1.9 * MB,
    format: "CSV",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-050",
    name: "RF Link Quality Digest",
    category: "Engineering",
    period: "20 May 2025",
    generatedAt: at("2025-05-20T14:02:12+05:30"),
    sizeBytes: 5.3 * MB,
    format: "PDF",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-049",
    name: "Task Failure Analysis",
    category: "Operations",
    period: "Week 20",
    generatedAt: at("2025-05-20T12:41:38+05:30"),
    sizeBytes: 4.7 * MB,
    format: "XLSX",
    status: "ready",
    owner: "r.iyer",
  },
  {
    id: "RPT-048",
    name: "Ingest Throughput Report",
    category: "Capacity",
    period: "19 May 2025",
    generatedAt: at("2025-05-20T09:15:24+05:30"),
    sizeBytes: 2.2 * MB,
    format: "CSV",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-047",
    name: "Cold Vault Restore Drill",
    category: "Compliance",
    period: "19 May 2025",
    generatedAt: at("2025-05-20T08:00:00+05:30"),
    sizeBytes: 9.4 * MB,
    format: "PDF",
    status: "failed",
    owner: "s.menon",
  },
  {
    id: "RPT-046",
    name: "Scheduler Efficiency Report",
    category: "Operations",
    period: "Week 19",
    generatedAt: at("2025-05-19T23:00:41+05:30"),
    sizeBytes: 3.1 * MB,
    format: "PDF",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-045",
    name: "Data Egress & Export Ledger",
    category: "Compliance",
    period: "May 2025",
    generatedAt: at("2025-05-19T22:15:07+05:30"),
    sizeBytes: 1.4 * MB,
    format: "JSON",
    status: "ready",
    owner: "auto-scheduler",
  },
  {
    id: "RPT-044",
    name: "Monthly Integrity Certificate",
    category: "Compliance",
    period: "April 2025",
    generatedAt: at("2025-05-19T20:30:52+05:30"),
    sizeBytes: 0.9 * MB,
    format: "PDF",
    status: "ready",
    owner: "s.menon",
  },
  {
    id: "RPT-043",
    name: "Quarterly Capacity Forecast",
    category: "Capacity",
    period: "Q2 2025",
    generatedAt: at("2025-05-19T18:05:33+05:30"),
    sizeBytes: 7.6 * MB,
    format: "XLSX",
    status: "scheduled",
    owner: "auto-scheduler",
  },
];

export const SEED_SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: "s-1",
    name: "Daily Archive Summary",
    cadence: "Every day · 23:00 IST",
    nextRunAt: at("2025-05-20T23:00:00+05:30"),
    format: "PDF",
    accent: "da-c1",
  },
  {
    id: "s-2",
    name: "Alert Response Summary",
    cadence: "Every day · 06:00 IST",
    nextRunAt: at("2025-05-21T06:00:00+05:30"),
    format: "CSV",
    accent: "da-c2",
  },
  {
    id: "s-3",
    name: "Storage Utilization & Forecast",
    cadence: "Mondays · 07:30 IST",
    nextRunAt: at("2025-05-26T07:30:00+05:30"),
    format: "PDF",
    accent: "da-c5",
  },
  {
    id: "s-4",
    name: "Retention Compliance Audit",
    cadence: "1st of month · 02:00 IST",
    nextRunAt: at("2025-06-01T02:00:00+05:30"),
    format: "PDF",
    accent: "da-c3",
  },
  {
    id: "s-5",
    name: "Monthly Integrity Certificate",
    cadence: "1st of month · 03:00 IST",
    nextRunAt: at("2025-06-01T03:00:00+05:30"),
    format: "PDF",
    accent: "da-c6",
  },
];

export const SEED_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "tpl-1",
    name: "Archive Summary",
    description: "Volume, records and integrity for a chosen window",
    icon: "file-text",
    accent: "da-c1",
    runCount: 412,
  },
  {
    id: "tpl-2",
    name: "Capacity Forecast",
    description: "Growth curve and projected days to full",
    icon: "bar-chart",
    accent: "da-c5",
    runCount: 96,
  },
  {
    id: "tpl-3",
    name: "Mission Completeness",
    description: "Expected vs archived records per mission",
    icon: "target",
    accent: "da-c3",
    runCount: 158,
  },
  {
    id: "tpl-4",
    name: "Compliance Audit",
    description: "Retention policy adherence and checksum trail",
    icon: "list",
    accent: "da-c6",
    runCount: 74,
  },
];

/** Output format mix over the last 30 days. */
export const SEED_REPORT_FORMAT_MIX = [
  { id: "PDF", percent: 58, color: "da-c1" },
  { id: "XLSX", percent: 21, color: "da-c5" },
  { id: "CSV", percent: 14, color: "da-c2" },
  { id: "JSON", percent: 7, color: "da-c3" },
];

/** Reports generated per day over the last twelve days. */
const HISTORY = [6, 4, 7, 5, 9, 8, 6, 11, 7, 5, 8, 6];

const DAY_MS = 86_400_000;

export const SEED_REPORT_HISTORY: SeriesPoint[] = HISTORY.map((value, i) => ({
  t: T0 - (HISTORY.length - 1 - i) * DAY_MS,
  value,
}));
