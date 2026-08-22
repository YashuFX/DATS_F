import { archivalConfig } from "../config";
import type { LogEntry, LogLevelFacet, NamedCount, SeriesPoint } from "../types";

/**
 * LOGS fixture.
 *
 * Same timeline as `seed.ts` — 20 May 2025, 18:42:31 IST — so the log stream
 * lines up with the archive records, tasks and alerts on the other tabs: the
 * telemetry writes at 18:40:12 appear here as the archive-writer entries that
 * produced record `r-1`.
 */

const at = (iso: string) => Date.parse(iso);
const T0 = archivalConfig.demoEpoch;

export const SEED_LOG_TOTAL = 1_284_906;
export const SEED_LOG_INGEST_PER_MIN = 1_420;
export const SEED_LOG_RETENTION_DAYS = 30;

export const SEED_LOG_LEVEL_FACETS: LogLevelFacet[] = [
  { id: "error", label: "Error", count: 428 },
  { id: "warn", label: "Warning", count: 2_317 },
  { id: "info", label: "Info", count: 918_442 },
  { id: "debug", label: "Debug", count: 341_286 },
  { id: "trace", label: "Trace", count: 22_433 },
];

export const LOG_SUBSYSTEMS = [
  "All Subsystems",
  "archive-writer",
  "scheduler",
  "rf-frontend",
  "beamformer",
  "calibration",
  "storage-tier",
  "api-gateway",
  "health-monitor",
];

export const LOG_HOSTS = [
  "All Hosts",
  "arch-node-01",
  "arch-node-02",
  "ctrl-01",
  "ctrl-02",
  "tile-05",
  "tile-07",
  "tile-12",
  "tx-array",
];

export const SEED_LOG_ENTRIES: LogEntry[] = [
  {
    id: "l-01",
    timestamp: at("2025-05-20T18:42:28+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-01",
    message: "Segment sealed: telemetry_tile05_20250520_184012.h5 (2.45 GB, checksum ok)",
    traceId: "tr-9f4c21",
  },
  {
    id: "l-02",
    timestamp: at("2025-05-20T18:42:17+05:30"),
    level: "warn",
    subsystem: "storage-tier",
    source: "arch-node-02",
    message: "Tier-1 pool at 82.4% capacity — promotion of cold segments deferred",
    traceId: "tr-9f4c1e",
  },
  {
    id: "l-03",
    timestamp: at("2025-05-20T18:42:04+05:30"),
    level: "error",
    subsystem: "rf-frontend",
    source: "tile-07",
    message: "LNA thermal cut-out armed: T=78.1C exceeds 75.0C limit for 42s",
    traceId: "tr-9f4c11",
  },
  {
    id: "l-04",
    timestamp: at("2025-05-20T18:41:51+05:30"),
    level: "info",
    subsystem: "scheduler",
    source: "ctrl-01",
    message: "Job SCHED-312 transitioned QUEUED -> RUNNING on worker arch-node-02",
    traceId: "tr-9f4bf7",
  },
  {
    id: "l-05",
    timestamp: at("2025-05-20T18:41:34+05:30"),
    level: "debug",
    subsystem: "beamformer",
    source: "tx-array",
    message: "Phase solution converged in 6 iterations, residual 0.42 deg RMS",
    traceId: "tr-9f4be2",
  },
  {
    id: "l-06",
    timestamp: at("2025-05-20T18:41:22+05:30"),
    level: "error",
    subsystem: "health-monitor",
    source: "tile-07",
    message: "Alert raised HIGH_TEMPERATURE (severity=critical) — notifying operators",
    traceId: "tr-9f4bd9",
  },
  {
    id: "l-07",
    timestamp: at("2025-05-20T18:41:08+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-01",
    message: "Opened new segment waveform_txarray_20250520_184108.bin",
    traceId: "tr-9f4bc4",
  },
  {
    id: "l-08",
    timestamp: at("2025-05-20T18:40:57+05:30"),
    level: "warn",
    subsystem: "api-gateway",
    source: "ctrl-02",
    message: "Upstream archive-index responded in 1,842 ms (SLO 500 ms)",
    traceId: "tr-9f4bb0",
  },
  {
    id: "l-09",
    timestamp: at("2025-05-20T18:40:41+05:30"),
    level: "info",
    subsystem: "calibration",
    source: "tile-12",
    message: "Calibration table CAL-089 applied to 128 of 128 elements",
    traceId: "tr-9f4b9a",
  },
  {
    id: "l-10",
    timestamp: at("2025-05-20T18:40:12+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-01",
    message: "Record committed TRACK-284 -> vault/primary (2.45 GB in 3.1 s)",
    traceId: "tr-9f4b71",
  },
  {
    id: "l-11",
    timestamp: at("2025-05-20T18:39:58+05:30"),
    level: "debug",
    subsystem: "scheduler",
    source: "ctrl-01",
    message: "Rotated scheduler_log_20250520_183958.log at 14.2 MB",
    traceId: "tr-9f4b60",
  },
  {
    id: "l-12",
    timestamp: at("2025-05-20T18:39:47+05:30"),
    level: "error",
    subsystem: "rf-frontend",
    source: "tile-03",
    message: "Link margin degraded: BER 2.1e-3 over 30 s window, requesting re-sync",
    traceId: "tr-9f4b52",
  },
  {
    id: "l-13",
    timestamp: at("2025-05-20T18:39:41+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-02",
    message: "Record committed WF-128 -> vault/primary (5.67 GB in 7.4 s)",
    traceId: "tr-9f4b4b",
  },
  {
    id: "l-14",
    timestamp: at("2025-05-20T18:39:20+05:30"),
    level: "trace",
    subsystem: "storage-tier",
    source: "arch-node-02",
    message: "fsync barrier 41 ms, queue depth 6, dirty pages 812",
    traceId: "tr-9f4b30",
  },
  {
    id: "l-15",
    timestamp: at("2025-05-20T18:39:04+05:30"),
    level: "warn",
    subsystem: "calibration",
    source: "tx-array",
    message: "Phase error 5.2 deg on element 44 exceeds 4.0 deg tolerance",
    traceId: "tr-9f4b1c",
  },
  {
    id: "l-16",
    timestamp: at("2025-05-20T18:38:51+05:30"),
    level: "info",
    subsystem: "scheduler",
    source: "ctrl-01",
    message: "Retention sweep queued: 1,204 segments older than 30 d",
    traceId: "tr-9f4b08",
  },
  {
    id: "l-17",
    timestamp: at("2025-05-20T18:38:42+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-01",
    message: "Record committed RPT-056 -> vault/primary (6.2 MB in 0.4 s)",
    traceId: "tr-9f4afd",
  },
  {
    id: "l-18",
    timestamp: at("2025-05-20T18:38:29+05:30"),
    level: "debug",
    subsystem: "api-gateway",
    source: "ctrl-02",
    message: "GET /v2/archive/search?type=telemetry -> 200 in 96 ms (412 hits)",
    traceId: "tr-9f4ae9",
  },
  {
    id: "l-19",
    timestamp: at("2025-05-20T18:38:15+05:30"),
    level: "warn",
    subsystem: "storage-tier",
    source: "arch-node-01",
    message: "Replication lag to remote vault is 94 s (threshold 60 s)",
    traceId: "tr-9f4ad4",
  },
  {
    id: "l-20",
    timestamp: at("2025-05-20T18:37:58+05:30"),
    level: "info",
    subsystem: "health-monitor",
    source: "ctrl-01",
    message: "Integrity sweep 18:35 complete — 24,118 checksums verified, 0 mismatched",
    traceId: "tr-9f4ac0",
  },
  {
    id: "l-21",
    timestamp: at("2025-05-20T18:37:36+05:30"),
    level: "error",
    subsystem: "storage-tier",
    source: "arch-node-03",
    message: "Write to /vault/cold/seg-88421 failed: EIO — retrying on replica 2",
    traceId: "tr-9f4aa1",
  },
  {
    id: "l-22",
    timestamp: at("2025-05-20T18:37:19+05:30"),
    level: "info",
    subsystem: "beamformer",
    source: "tx-array",
    message: "Beam 12 steered to AZ 142.6 / EL 38.2, settle time 180 ms",
    traceId: "tr-9f4a8d",
  },
  {
    id: "l-23",
    timestamp: at("2025-05-20T18:37:02+05:30"),
    level: "trace",
    subsystem: "archive-writer",
    source: "arch-node-02",
    message: "Compression ratio 3.14:1 on waveform block 0x1f4a (zstd-9)",
    traceId: "tr-9f4a74",
  },
  {
    id: "l-24",
    timestamp: at("2025-05-20T18:36:44+05:30"),
    level: "info",
    subsystem: "scheduler",
    source: "ctrl-02",
    message: "Nightly report RPT-056 scheduled for 23:00 IST",
    traceId: "tr-9f4a58",
  },
  {
    id: "l-25",
    timestamp: at("2025-05-20T18:36:18+05:30"),
    level: "warn",
    subsystem: "api-gateway",
    source: "ctrl-02",
    message: "Client 10.4.18.22 latency 245 ms — throttling to 40 req/s",
    traceId: "tr-9f4a31",
  },
  {
    id: "l-26",
    timestamp: at("2025-05-20T18:35:59+05:30"),
    level: "debug",
    subsystem: "calibration",
    source: "tile-05",
    message: "Gain drift +0.18 dB since 12:00 sweep, within nominal band",
    traceId: "tr-9f4a14",
  },
  {
    id: "l-27",
    timestamp: at("2025-05-20T18:35:12+05:30"),
    level: "info",
    subsystem: "health-monitor",
    source: "ctrl-01",
    message: "Checksum status VERIFIED for 48.7 TB across 3 vaults",
    traceId: "tr-9f49d2",
  },
  {
    id: "l-28",
    timestamp: at("2025-05-20T18:34:47+05:30"),
    level: "info",
    subsystem: "archive-writer",
    source: "arch-node-01",
    message: "Backpressure cleared — ingest queue drained to 0 pending blocks",
    traceId: "tr-9f49a6",
  },
  {
    id: "l-29",
    timestamp: at("2025-05-20T18:34:21+05:30"),
    level: "error",
    subsystem: "scheduler",
    source: "ctrl-02",
    message: "Task CMP-4471 aborted after 3 attempts: worker arch-node-03 unreachable",
    traceId: "tr-9f4982",
  },
  {
    id: "l-30",
    timestamp: at("2025-05-20T18:33:55+05:30"),
    level: "debug",
    subsystem: "storage-tier",
    source: "arch-node-01",
    message: "Cold-tier prefetch hit ratio 0.87 over last 1,000 reads",
    traceId: "tr-9f4960",
  },
];

/**
 * Twelve hourly buckets ending at the current demo hour — total entries per
 * hour, with the 03:00 bulk-archive window and the evening ingest peak visible.
 */
const VOLUME = [
  4_120, 3_880, 4_460, 6_210, 5_740, 4_980, 5_120, 6_640, 7_180, 6_020, 5_460,
  4_910,
];

const IST_OFFSET_MS = 5.5 * 3_600_000;
const topOfHour =
  Math.floor((T0 + IST_OFFSET_MS) / 3_600_000) * 3_600_000 - IST_OFFSET_MS;

export const SEED_LOG_VOLUME: SeriesPoint[] = VOLUME.map((value, i) => ({
  t: topOfHour - (VOLUME.length - 1 - i) * 3_600_000,
  value,
}));

/** Error counts by emitter over the last 24 hours — the rail's ranked list. */
export const SEED_LOG_TOP_SOURCES: NamedCount[] = [
  { label: "rf-frontend / tile-07", count: 118, color: "da-danger", detail: "Thermal + link margin" },
  { label: "storage-tier / arch-node-03", count: 94, color: "da-warn", detail: "Write retries on cold vault" },
  { label: "scheduler / ctrl-02", count: 71, color: "da-c3", detail: "Worker unreachable" },
  { label: "api-gateway / ctrl-02", count: 62, color: "da-c1", detail: "Upstream timeouts" },
  { label: "calibration / tx-array", count: 45, color: "da-c6", detail: "Phase tolerance" },
  { label: "beamformer / tx-array", count: 38, color: "da-c5", detail: "Settle overruns" },
];
