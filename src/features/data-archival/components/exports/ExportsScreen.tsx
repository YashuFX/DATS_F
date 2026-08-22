"use client";

import {
  CircleCheck,
  CircleDashed,
  CircleX,
  CloudUpload,
  Gauge,
  HardDriveDownload,
  Loader,
  Plus,
  ShieldCheck,
  Timer,
} from "lucide-react";
import {
  SEED_EXPORT_DESTINATIONS,
  SEED_EXPORT_JOBS,
  SEED_EXPORT_STATS,
  SEED_EXPORT_THROUGHPUT,
} from "../../data/exports";
import { formatBytes, formatDateTime, formatHour, formatNumber } from "../../lib/format";
import type { ExportJob, ExportStatusId } from "../../types";
import { AreaChart } from "../charts/AreaChart";
import { TableCard } from "../table/TableCard";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { Dot, MeterRow, StatusPill } from "../ui/StatusBits";
import { StatStrip } from "../ui/StatStrip";

const STATUS_META: Record<
  ExportStatusId,
  { color: string; label: string; icon: typeof CircleCheck }
> = {
  transferring: { color: "da-brand", label: "Transferring", icon: Loader },
  verifying: { color: "da-warn", label: "Verifying", icon: ShieldCheck },
  queued: { color: "da-label", label: "Queued", icon: CircleDashed },
  completed: { color: "da-success", label: "Completed", icon: CircleCheck },
  failed: { color: "da-danger", label: "Failed", icon: CircleX },
};

const DESTINATION_STATE_COLOR = {
  online: "da-success",
  degraded: "da-warn",
  offline: "da-danger",
} as const;

const Y_TICKS = ["800 GB", "600 GB", "400 GB", "200 GB", "0"];

const COLUMNS = [
  {
    key: "id",
    label: "Job ID",
    width: "5.25rem",
    render: (row: ExportJob) => (
      <span className="da-nums font-semibold text-da-text">{row.id}</span>
    ),
  },
  {
    key: "dataset",
    label: "Dataset",
    width: "auto",
    truncate: true,
    render: (row: ExportJob) => <span className="font-medium text-da-text">{row.dataset}</span>,
  },
  {
    key: "range",
    label: "Range",
    width: "8rem",
    render: (row: ExportJob) => (
      <span className="da-nums font-medium text-da-muted">{row.range}</span>
    ),
  },
  {
    key: "destination",
    label: "Destination",
    width: "9.5rem",
    render: (row: ExportJob) => (
      <span className="truncate font-medium text-da-muted">{row.destination}</span>
    ),
  },
  {
    key: "format",
    label: "Format",
    width: "5rem",
    render: (row: ExportJob) => (
      <span className="da-nums font-semibold text-da-text">{row.format}</span>
    ),
  },
  {
    key: "size",
    label: "Size",
    width: "5rem",
    render: (row: ExportJob) => (
      <span className="da-nums font-semibold text-da-text">{formatBytes(row.sizeBytes)}</span>
    ),
  },
  {
    key: "progress",
    label: "Progress",
    width: "7.5rem",
    render: (row: ExportJob) => (
      <span className="flex items-center gap-[0.375rem]">
        <ProgressBar
          value={row.progress}
          color={STATUS_META[row.status].color}
          className="flex-1"
          label={`${row.dataset} transfer`}
        />
        <span className="da-nums w-[2.75rem] shrink-0 text-right text-3xs font-bold text-da-text">
          {row.status === "transferring" ? `${row.throughputMBs} MB/s` : `${row.progress}%`}
        </span>
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "6.75rem",
    render: (row: ExportJob) => {
      const meta = STATUS_META[row.status];
      const Icon = meta.icon;
      return (
        <StatusPill
          color={meta.color}
          icon={
            <Icon
              className={`size-[0.75rem] ${row.status === "transferring" ? "animate-spin [animation-duration:2.4s]" : ""}`}
              strokeWidth={2.2}
            />
          }
        >
          {meta.label}
        </StatusPill>
      );
    },
  },
];

/**
 * EXPORTS — outbound jobs, where they are going and how fast.
 *
 * Egress is plotted with the Archive Browser's own area chart so ingest and
 * egress read as the same measurement seen from two ends of the vault.
 */
export function ExportsScreen() {
  const active = SEED_EXPORT_JOBS.filter((j) => j.status === "transferring");
  const xTicks = SEED_EXPORT_THROUGHPUT.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid h-full min-h-[33rem] grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)_12rem] gap-[0.75rem]">
        <StatStrip
          items={[
            {
              label: "Active Transfers",
              value: String(SEED_EXPORT_STATS.transferring),
              valueTone: "text-da-brand",
              sub: (
                <span className="text-da-muted">
                  {SEED_EXPORT_STATS.aggregateThroughputMBs} MB/s aggregate
                </span>
              ),
              icon: <CloudUpload className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-brand-soft text-da-brand",
            },
            {
              label: "Queued",
              value: String(SEED_EXPORT_STATS.queued),
              sub: <span className="text-da-muted">463 GB pending</span>,
              icon: <Timer className="size-[1rem]" strokeWidth={2} />,
            },
            {
              label: "Completed (24h)",
              value: formatNumber(SEED_EXPORT_STATS.completed24h),
              valueTone: "text-da-success",
              sub: (
                <span className="text-da-danger">
                  {SEED_EXPORT_STATS.failed24h} failed · 1 retrying
                </span>
              ),
              icon: <CircleCheck className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-success-soft text-da-success",
            },
            {
              label: "Data Egress (24h)",
              value: `${SEED_EXPORT_STATS.egressTB} TB`,
              sub: <span className="text-da-muted">of 5 TB daily quota</span>,
              icon: <Gauge className="size-[1rem]" strokeWidth={2} />,
            },
          ]}
        />

        <TableCard
          title="Export Jobs"
          action={
            <div className="flex items-center gap-[0.5rem]">
              <Button size="sm" variant="ghost">
                Retry Failed
              </Button>
              <Button size="sm" icon={<Plus className="size-[0.6875rem]" strokeWidth={2.4} />}>
                New Export
              </Button>
            </div>
          }
          columns={COLUMNS}
          rows={SEED_EXPORT_JOBS}
          rowKey={(row) => row.id}
          footer={
            <>
              <span className="da-nums text-3xs font-medium text-da-label">
                {SEED_EXPORT_JOBS.length} jobs in view · quota resets 00:00 IST
              </span>
              <span className="flex items-center gap-[0.75rem]">
                {(["transferring", "verifying", "queued", "failed"] as ExportStatusId[]).map(
                  (s) => (
                    <span key={s} className="flex items-center gap-[0.25rem]">
                      <Dot color={STATUS_META[s].color} />
                      <span className="text-3xs font-semibold text-da-muted">
                        {STATUS_META[s].label}
                      </span>
                    </span>
                  ),
                )}
              </span>
            </>
          }
        />

        <div className="grid min-h-0 grid-cols-3 gap-[0.75rem]">
          <Card className="col-span-2 min-w-0">
            <CardHeader title="Transfer Throughput (last 12 hours)" />
            <div className="flex min-h-0 flex-1 gap-[0.375rem] px-[0.75rem] pt-[0.625rem]">
              <ul className="flex w-[2.125rem] shrink-0 flex-col justify-between py-[0.0625rem] text-right">
                {Y_TICKS.map((t) => (
                  <li
                    key={t}
                    className="da-nums text-[0.5rem] font-medium leading-none text-da-label"
                  >
                    {t}
                  </li>
                ))}
              </ul>
              <AreaChart points={SEED_EXPORT_THROUGHPUT} yMax={800} className="min-w-0 flex-1" />
            </div>
            <div className="flex items-center justify-between pl-[3.25rem] pr-[0.75rem] pt-[0.25rem]">
              {xTicks.map((p) => (
                <span key={p.t} className="da-nums text-[0.5rem] font-medium text-da-label">
                  {formatHour(p.t)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-[0.3125rem] py-[0.375rem]">
              <span className="size-[0.4375rem] rounded-[0.125rem] bg-da-info" />
              <span className="text-3xs font-medium text-da-muted">Egress Volume</span>
            </div>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Destinations"
              action={<Button variant="link">Manage</Button>}
            />
            <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
              {SEED_EXPORT_DESTINATIONS.map((d) => (
                <MeterRow
                  key={d.id}
                  label={d.label}
                  value={`${d.usedPercent}%`}
                  detail={`${d.kind} · ${d.latencyMs} ms`}
                  percent={d.usedPercent}
                  color={DESTINATION_STATE_COLOR[d.state]}
                  leading={<Dot color={DESTINATION_STATE_COLOR[d.state]} />}
                />
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Card className="shrink-0">
          <CardHeader
            title="Active Transfers"
            action={<Button variant="link">View All</Button>}
          />
          <ul className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
            {active.map((job) => (
              <li key={job.id} className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
                <span className="mt-[0.0625rem] flex size-[1.375rem] shrink-0 items-center justify-center rounded-[0.25rem] bg-da-brand-soft text-da-brand">
                  <CloudUpload className="size-[0.75rem]" strokeWidth={2.2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
                  <div className="flex items-start justify-between gap-[0.375rem]">
                    <div className="flex min-w-0 flex-col leading-none">
                      <span className="truncate text-2xs font-semibold text-da-text">
                        {job.dataset}
                      </span>
                      <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                        {job.destination}
                      </span>
                    </div>
                    <span className="da-nums shrink-0 text-2xs font-bold text-da-text">
                      {job.progress}%
                    </span>
                  </div>
                  <ProgressBar value={job.progress} label={job.dataset} />
                  <span className="da-nums text-[0.5rem] font-medium text-da-label">
                    {job.throughputMBs} MB/s · {formatBytes(job.sizeBytes)} total
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-h-0 flex-1">
          <CardHeader
            title="Recent Deliveries"
            action={<Button variant="link">View All</Button>}
          />
          <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
            {SEED_EXPORT_JOBS.filter((j) => j.status === "completed").map((job) => (
              <li key={job.id} className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
                <HardDriveDownload
                  className="mt-[0.0625rem] size-[0.8125rem] shrink-0 text-da-success"
                  strokeWidth={2.2}
                />
                <div className="flex min-w-0 flex-1 flex-col leading-none">
                  <div className="flex items-start justify-between gap-[0.375rem]">
                    <span className="truncate text-2xs font-semibold text-da-text">
                      {job.dataset}
                    </span>
                    <span className="da-nums shrink-0 text-3xs font-semibold text-da-muted">
                      {formatBytes(job.sizeBytes)}
                    </span>
                  </div>
                  <span className="da-nums mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                    {job.id} | {job.requestedBy}
                  </span>
                  <span className="da-nums mt-[0.25rem] text-[0.5rem] font-medium text-da-label">
                    {formatDateTime(job.requestedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
