import { archivalConfig } from "../config";
import type { ActivityPoint, ExportDestination, ExportJob } from "../types";

/**
 * EXPORTS fixture — outbound jobs pulling archived data back out of the vault,
 * on the same 20 May 2025 timeline as every other tab.
 */

const at = (iso: string) => Date.parse(iso);
const T0 = archivalConfig.demoEpoch;
const GB = 1024 ** 3;

export const SEED_EXPORT_STATS = {
  transferring: 4,
  queued: 6,
  completed24h: 87,
  egressTB: 3.2,
  aggregateThroughputMBs: 412,
  failed24h: 2,
};

export const SEED_EXPORT_JOBS: ExportJob[] = [
  {
    id: "EXP-8841",
    dataset: "Telemetry — TRACK-284",
    range: "18 – 20 May 2025",
    destination: "NAS",
    format: "HDF5",
    sizeBytes: 412 * GB,
    progress: 68,
    status: "transferring",
    requestedBy: "r.iyer",
    requestedAt: at("2025-05-20T17:52:10+05:30"),
    throughputMBs: 186,
  },
  {
    id: "EXP-8840",
    dataset: "Waveform Captures — Beam 12",
    range: "20 May 2025",
    destination: "NAS",
    format: "TAR.GZ",
    sizeBytes: 264 * GB,
    progress: 41,
    status: "transferring",
    requestedBy: "s.menon",
    requestedAt: at("2025-05-20T18:06:44+05:30"),
    throughputMBs: 124,
  },
  {
    id: "EXP-8839",
    dataset: "Scheduler Logs — Week 20",
    range: "13 – 20 May 2025",
    destination: "NAS",
    format: "ZIP",
    sizeBytes: 18.4 * GB,
    progress: 93,
    status: "transferring",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T18:22:03+05:30"),
    throughputMBs: 62,
  },
  {
    id: "EXP-8838",
    dataset: "Calibration Set CAL-089",
    range: "20 May 2025",
    destination: "NAS",
    format: "CSV",
    sizeBytes: 6.1 * GB,
    progress: 77,
    status: "transferring",
    requestedBy: "r.iyer",
    requestedAt: at("2025-05-20T18:31:29+05:30"),
    throughputMBs: 40,
  },
  {
    id: "EXP-8837",
    dataset: "System Logs — Controller-1",
    range: "19 – 20 May 2025",
    destination: "NAS",
    format: "ZIP",
    sizeBytes: 9.8 * GB,
    progress: 100,
    status: "verifying",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T18:12:55+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8836",
    dataset: "Telemetry — Tile-12 Full Day",
    range: "19 May 2025",
    destination: "NAS",
    format: "HDF5",
    sizeBytes: 388 * GB,
    progress: 0,
    status: "queued",
    requestedBy: "s.menon",
    requestedAt: at("2025-05-20T18:35:41+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8835",
    dataset: "Mission Bundle — SCHED-312",
    range: "15 – 20 May 2025",
    destination: "NAS",
    format: "PARQUET",
    sizeBytes: 74.2 * GB,
    progress: 0,
    status: "queued",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T18:37:18+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8834",
    dataset: "Configuration Snapshots",
    range: "May 2025",
    destination: "NAS",
    format: "ZIP",
    sizeBytes: 1.2 * GB,
    progress: 0,
    status: "queued",
    requestedBy: "r.iyer",
    requestedAt: at("2025-05-20T18:39:02+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8833",
    dataset: "Waveform Captures — TX-Array",
    range: "18 May 2025",
    destination: "NAS",
    format: "TAR.GZ",
    sizeBytes: 512 * GB,
    progress: 100,
    status: "completed",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T16:40:12+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8832",
    dataset: "Alert Ledger — Week 20",
    range: "13 – 20 May 2025",
    destination: "NAS",
    format: "CSV",
    sizeBytes: 0.8 * GB,
    progress: 100,
    status: "completed",
    requestedBy: "s.menon",
    requestedAt: at("2025-05-20T15:58:37+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8831",
    dataset: "Telemetry — TRACK-281",
    range: "16 – 17 May 2025",
    destination: "NAS",
    format: "HDF5",
    sizeBytes: 296 * GB,
    progress: 62,
    status: "failed",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T14:21:05+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8830",
    dataset: "Integrity Manifest — April",
    range: "April 2025",
    destination: "NAS",
    format: "PARQUET",
    sizeBytes: 3.4 * GB,
    progress: 100,
    status: "completed",
    requestedBy: "auto-scheduler",
    requestedAt: at("2025-05-20T12:00:00+05:30"),
    throughputMBs: 0,
  },
  {
    id: "EXP-8829",
    dataset: "Calibration History — Q1",
    range: "Jan – Mar 2025",
    destination: "NAS",
    format: "TAR.GZ",
    sizeBytes: 128 * GB,
    progress: 100,
    status: "completed",
    requestedBy: "r.iyer",
    requestedAt: at("2025-05-20T09:44:26+05:30"),
    throughputMBs: 0,
  },
];

export const SEED_EXPORT_DESTINATIONS: ExportDestination[] = [
  {
    id: "d-1",
    label: "NAS",
    kind: "Object store · ap-south-1",
    usedPercent: 64,
    state: "online",
    latencyMs: 42,
  },
  // {
  //   id: "d-2",
  //   label: "Analysis Cluster (NFS)",
  //   kind: "Shared filesystem",
  //   usedPercent: 81,
  //   state: "degraded",
  //   latencyMs: 118,
  // },
  // {
  //   id: "d-3",
  //   label: "Compliance Bucket",
  //   kind: "Object store · WORM",
  //   usedPercent: 37,
  //   state: "online",
  //   latencyMs: 58,
  // },
  // {
  //   id: "d-4",
  //   label: "Cold Archive (Tape)",
  //   kind: "LTO-9 library",
  //   usedPercent: 52,
  //   state: "online",
  //   latencyMs: 940,
  // },
  // {
  //   id: "d-5",
  //   label: "Engineering Share",
  //   kind: "SMB · on-site",
  //   usedPercent: 29,
  //   state: "online",
  //   latencyMs: 12,
  // },
];

/**
 * Egress per hour over the last twelve hours, in GB — plotted with the same
 * area chart the Archive Browser uses for ingest, so ingest and egress read as
 * two views of one pipeline.
 */
const EGRESS_GB = [180, 240, 320, 410, 380, 290, 350, 520, 610, 480, 440, 396];

const IST_OFFSET_MS = 5.5 * 3_600_000;
const topOfHour =
  Math.floor((T0 + IST_OFFSET_MS) / 3_600_000) * 3_600_000 - IST_OFFSET_MS;

export const SEED_EXPORT_THROUGHPUT: ActivityPoint[] = EGRESS_GB.map((gb, i) => ({
  t: topOfHour - (EGRESS_GB.length - 1 - i) * 3_600_000,
  gb,
}));
