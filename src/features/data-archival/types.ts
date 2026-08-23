/**
 * Domain types for the Data Archival module.
 *
 * These are the contract between the UI and whatever feeds it. The demo store
 * in `data/store.ts` satisfies them today; a REST/WebSocket adapter can satisfy
 * them tomorrow without touching a single component.
 */

export type DataTypeId =
  | "telemetry"
  | "waveform"
  | "scheduler"
  | "system"
  | "configuration"
  | "calibration"
  | "reports";

export type DataType = DataTypeId;

export type PriorityId = "critical" | "high" | "medium" | "low";

export type ArchiveStatusId = "archived" | "archiving" | "queued" | "failed";

export type SeverityId = "critical" | "warning" | "info";

export interface DataTypeMeta {
  id: DataTypeId;
  label: string;
  /** Token name without the `--color-` prefix, e.g. `da-c1`. */
  color: string;
}

export interface ArchiveRecord {
  id: string;
  /** Epoch ms. Formatted for display in IST at the edge. */
  timestamp: number;
  dataType: DataTypeId;
  source: string;
  mission: string;
  fileName: string;
  sizeBytes: number;
  priority: PriorityId;
  status: ArchiveStatusId;
}

export interface ActiveTask {
  id: string;
  title: string;
  subtitle: string;
  /** Lucide icon key resolved by `components/rail/taskIcon.ts`. */
  icon: string;
  /** 0..100 */
  progress: number;
  etaSeconds: number;
  /** Progress points added per tick — drives the demo simulation. */
  rate: number;
  accent: string;
}

export interface AlertItem {
  id: string;
  severity: SeverityId;
  title: string;
  source: string;
  metricLabel: string;
  metricValue: string;
  timestamp: number;
}

export interface StorageStats {
  usedTB: number;
  totalTB: number;
  archiveRateGBPerHour: number;
  retentionDays: number;
}

export interface DistributionSlice {
  id: DataTypeId | "other";
  label: string;
  sizeTB: number;
  percent: number;
  color: string;
}

export interface ActivityPoint {
  /** Epoch ms at the top of the bucket. */
  t: number;
  /** Gigabytes archived in this bucket. */
  gb: number;
}

export interface TypeFacet {
  id: DataTypeId;
  label: string;
  count: number;
}

export interface PriorityFacet {
  id: PriorityId;
  label: string;
  count: number;
}

export interface SystemHealth {
  systemStatus: "operational" | "degraded" | "offline";
  dataStore: "online" | "syncing" | "offline";
  lastArchiveAt: number;
  activeTaskCount: number;
  criticalAlertCount: number;
  dataIntegrity: "nominal" | "degraded";
  lastIntegrityCheckAt: number;
  checksumStatus: "verified" | "pending" | "failed";
  autoArchive: boolean;
  nextArchiveInSeconds: number;
}

export interface FilterState {
  dateFrom: number;
  dateTo: number;
  /** Empty array === "All Types". */
  types: DataTypeId[];
  source: string;
  mission: string;
  /** Empty array === all priorities. */
  priorities: PriorityId[];
  location: string;
  query: string;
}

/** The complete board snapshot a consumer renders from. */
export interface ArchivalSnapshot {
  now: number;
  health: SystemHealth;
  totalRecords: number;
  totalSizeTB: number;
  recordsDeltaPercent: number;
  records: ArchiveRecord[];
  tasks: ActiveTask[];
  alerts: AlertItem[];
  storage: StorageStats;
  distribution: DistributionSlice[];
  activity: ActivityPoint[];
  typeFacets: TypeFacet[];
  priorityFacets: PriorityFacet[];
}

/* ==========================================================================
   LOGS / TASKS / ALERTS / REPORTS / EXPORTS
   The five secondary tabs. Same contract discipline as the board above: these
   describe what a backend must return, and the demo fixtures in `data/` are
   only one implementation of them.
   ========================================================================== */

export type LogLevelId = "error" | "warn" | "info" | "debug" | "trace";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevelId;
  subsystem: string;
  source: string;
  message: string;
  /** Correlation id shared by every entry of one operation. */
  traceId: string;
}

export interface LogLevelFacet {
  id: LogLevelId;
  label: string;
  count: number;
}

/** A single bar in one of the small trend charts. */
export interface SeriesPoint {
  /** Epoch ms at the top of the bucket. */
  t: number;
  value: number;
}

export interface NamedCount {
  label: string;
  count: number;
  /** Token name without the `--color-` prefix. */
  color?: string;
  /** Optional secondary figure, e.g. "12.4 GB" or "+3 vs yesterday". */
  detail?: string;
}

export type TaskStateId = "running" | "queued" | "paused" | "completed" | "failed";

export interface QueuedTask {
  id: string;
  name: string;
  /** Archival stage — Compression, Validation, Transfer… */
  category: string;
  target: string;
  priority: PriorityId;
  /** 0..100. Queued tasks sit at 0. */
  progress: number;
  /** Seconds remaining; 0 once the task leaves the running state. */
  etaSeconds: number;
  state: TaskStateId;
  startedAt: number;
  owner: string;
}

export interface WorkerNode {
  id: string;
  label: string;
  /** 0..100 */
  utilization: number;
  activeTasks: number;
  state: "online" | "draining" | "offline";
}

export type AlertStateId = "active" | "acknowledged" | "resolved";

export interface AlertRecord {
  id: string;
  severity: SeverityId;
  title: string;
  source: string;
  category: string;
  metricLabel: string;
  metricValue: string;
  threshold: string;
  state: AlertStateId;
  timestamp: number;
  /** Present once someone has taken the alert. */
  acknowledgedBy?: string;
}

export type ReportStatusId = "ready" | "generating" | "scheduled" | "failed";

export interface ReportItem {
  id: string;
  name: string;
  category: string;
  period: string;
  generatedAt: number;
  sizeBytes: number;
  format: "PDF" | "CSV" | "XLSX" | "JSON";
  status: ReportStatusId;
  owner: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  cadence: string;
  nextRunAt: number;
  format: string;
  accent: string;
}

export type ExportStatusId = "transferring" | "queued" | "verifying" | "completed" | "failed";

export interface ExportJob {
  id: string;
  dataset: string;
  range: string;
  destination: string;
  format: "HDF5" | "CSV" | "TAR.GZ" | "PARQUET" | "ZIP";
  sizeBytes: number;
  /** 0..100 */
  progress: number;
  status: ExportStatusId;
  requestedBy: string;
  requestedAt: number;
  /** Megabytes per second on the wire; 0 unless transferring. */
  throughputMBs: number;
}

export interface ExportDestination {
  id: string;
  label: string;
  kind: string;
  /** 0..100 capacity used. */
  usedPercent: number;
  state: "online" | "degraded" | "offline";
  latencyMs: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  /** Lucide icon key resolved by the Reports screen. */
  icon: string;
  accent: string;
  runCount: number;
}
