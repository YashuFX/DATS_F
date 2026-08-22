"use client";

import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  Download,
  FileStack,
  Loader,
  Play,
  Plus,
  Timer,
} from "lucide-react";
import {
  SEED_REPORTS,
  SEED_REPORT_FORMAT_MIX,
  SEED_REPORT_HISTORY,
  SEED_REPORT_STATS,
  SEED_REPORT_TEMPLATES,
  SEED_SCHEDULED_REPORTS,
} from "../../data/reports";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatHour,
  formatNumber,
} from "../../lib/format";
import { TASK_ICON } from "../../lib/icons";
import type { ReportItem, ReportStatusId } from "../../types";
import { BarChart } from "../charts/BarChart";
import { DonutChart } from "../charts/DonutChart";
import { TableCard } from "../table/TableCard";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Dot, StatusPill } from "../ui/StatusBits";
import { StatStrip } from "../ui/StatStrip";

const STATUS_META: Record<
  ReportStatusId,
  { color: string; label: string; icon: typeof Clock }
> = {
  ready: { color: "da-success", label: "Ready", icon: CircleCheck },
  generating: { color: "da-brand", label: "Generating", icon: Loader },
  scheduled: { color: "da-label", label: "Scheduled", icon: Clock },
  failed: { color: "da-danger", label: "Failed", icon: CircleX },
};

const FORMAT_COLOR: Record<ReportItem["format"], string> = {
  PDF: "da-c1",
  XLSX: "da-c5",
  CSV: "da-c2",
  JSON: "da-c3",
};

const COLUMNS = [
  {
    key: "id",
    label: "Report ID",
    width: "4.75rem",
    render: (row: ReportItem) => (
      <span className="da-nums font-semibold text-da-text">{row.id}</span>
    ),
  },
  {
    key: "name",
    label: "Report",
    width: "auto",
    truncate: true,
    render: (row: ReportItem) => <span className="font-medium text-da-text">{row.name}</span>,
  },
  {
    key: "category",
    label: "Category",
    width: "6rem",
    render: (row: ReportItem) => (
      <span className="font-medium text-da-muted">{row.category}</span>
    ),
  },
  {
    key: "period",
    label: "Period",
    width: "8rem",
    render: (row: ReportItem) => (
      <span className="da-nums font-medium text-da-muted">{row.period}</span>
    ),
  },
  {
    key: "generated",
    label: "Generated",
    width: "8.5rem",
    render: (row: ReportItem) => (
      <span className="da-nums font-medium text-da-muted">
        {formatDateTime(row.generatedAt)}
      </span>
    ),
  },
  {
    key: "size",
    label: "Size",
    width: "4.5rem",
    render: (row: ReportItem) => (
      <span className="da-nums font-semibold text-da-text">{formatBytes(row.sizeBytes)}</span>
    ),
  },
  {
    key: "format",
    label: "Format",
    width: "4rem",
    render: (row: ReportItem) => (
      <span
        className="inline-flex w-[2.75rem] items-center justify-center rounded-[0.1875rem] py-[0.0625rem] text-3xs font-bold leading-[1.15rem] tracking-[0.04em]"
        style={{
          backgroundColor: `color-mix(in srgb, var(--color-${FORMAT_COLOR[row.format]}) 14%, transparent)`,
          color: `var(--color-${FORMAT_COLOR[row.format]})`,
        }}
      >
        {row.format}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "6rem",
    render: (row: ReportItem) => {
      const meta = STATUS_META[row.status];
      const Icon = meta.icon;
      return (
        <StatusPill
          color={meta.color}
          icon={
            <Icon
              className={`size-[0.75rem] ${row.status === "generating" ? "animate-spin [animation-duration:2.4s]" : ""}`}
              strokeWidth={2.2}
            />
          }
        >
          {meta.label}
        </StatusPill>
      );
    },
  },
  {
    key: "action",
    label: "",
    width: "5.5rem",
    align: "right" as const,
    render: (row: ReportItem) =>
      row.status === "ready" ? (
        <Button
          size="sm"
          variant="outline"
          icon={<Download className="size-[0.625rem]" strokeWidth={2.4} />}
        >
          Get
        </Button>
      ) : (
        <span className="text-3xs font-medium text-da-label">—</span>
      ),
  },
];

/**
 * REPORTS — the generated-document library, its templates and its schedule.
 *
 * Two columns: flexible centre, 18.5rem rail. The bottom strip keeps the main
 * screen's chart-row proportion so every tab stacks to the same rhythm.
 */
export function ReportsScreen() {
  const xTicks = SEED_REPORT_HISTORY.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid h-full min-h-[33rem] grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)_12rem] gap-[0.75rem]">
        <StatStrip
          items={[
            {
              label: "Generated This Month",
              value: formatNumber(SEED_REPORT_STATS.generatedThisMonth),
              sub: (
                <span className="text-da-muted">
                  {SEED_REPORT_STATS.totalSizeGB} GB of output
                </span>
              ),
              icon: <FileStack className="size-[1rem]" strokeWidth={2} />,
            },
            {
              label: "Scheduled",
              value: String(SEED_REPORT_STATS.scheduled),
              valueTone: "text-da-brand",
              sub: <span className="text-da-muted">next run 23:00 IST</span>,
              icon: <CalendarClock className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-brand-soft text-da-brand",
            },
            {
              label: "Generating Now",
              value: String(SEED_REPORT_STATS.generating),
              sub: <span className="text-da-danger">{SEED_REPORT_STATS.failed} failed run</span>,
              icon: <Loader className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-warn-soft text-da-warn",
            },
            {
              label: "Avg Generation",
              value: `${SEED_REPORT_STATS.avgGenerationSeconds} s`,
              valueTone: "text-da-success",
              sub: <span className="text-da-success">within 60 s target</span>,
              icon: <Timer className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-success-soft text-da-success",
            },
          ]}
        />

        <TableCard
          title="Report Library"
          action={
            <div className="flex items-center gap-[0.5rem]">
              <Button size="sm" variant="ghost">
                Manage Schedule
              </Button>
              <Button size="sm" icon={<Plus className="size-[0.6875rem]" strokeWidth={2.4} />}>
                Generate Report
              </Button>
            </div>
          }
          columns={COLUMNS}
          rows={SEED_REPORTS}
          rowKey={(row) => row.id}
          footer={
            <>
              <span className="da-nums text-3xs font-medium text-da-label">
                {SEED_REPORTS.length} reports · retained 365 days
              </span>
              <span className="flex items-center gap-[0.75rem]">
                {(Object.keys(STATUS_META) as ReportStatusId[]).map((s) => (
                  <span key={s} className="flex items-center gap-[0.25rem]">
                    <Dot color={STATUS_META[s].color} />
                    <span className="text-3xs font-semibold text-da-muted">
                      {STATUS_META[s].label}
                    </span>
                  </span>
                ))}
              </span>
            </>
          }
        />

        <div className="grid min-h-0 grid-cols-3 gap-[0.75rem]">
          <Card className="col-span-2 min-w-0">
            <CardHeader
              title="Report Templates"
              action={<Button variant="link">New Template</Button>}
            />
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[0.5rem] px-[0.75rem] py-[0.625rem]">
              {SEED_REPORT_TEMPLATES.map((tpl) => {
                const Icon = TASK_ICON[tpl.icon] ?? TASK_ICON.database;
                return (
                  <div
                    key={tpl.id}
                    className="flex min-w-0 items-center gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] py-[0.4375rem] transition-colors hover:bg-da-subtle"
                  >
                    <span
                      className="flex size-[1.625rem] shrink-0 items-center justify-center rounded-[0.25rem]"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--color-${tpl.accent}) 14%, transparent)`,
                        color: `var(--color-${tpl.accent})`,
                      }}
                    >
                      <Icon className="size-[0.875rem]" strokeWidth={2.2} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-none">
                      <span className="truncate text-2xs font-semibold text-da-text">
                        {tpl.name}
                      </span>
                      <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                        {tpl.description}
                      </span>
                      <span className="da-nums mt-[0.1875rem] text-3xs font-medium text-da-label">
                        {formatNumber(tpl.runCount)} runs
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      icon={<Play className="size-[0.5625rem]" strokeWidth={2.4} />}
                    >
                      Run
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="min-w-0">
            <CardHeader title="Generated (last 12 days)" />
            <div className="flex min-h-0 flex-1 flex-col gap-[0.25rem] px-[0.75rem] pb-[0.625rem] pt-[0.875rem]">
              <BarChart
                points={SEED_REPORT_HISTORY}
                color="da-c1"
                accentAbove={9}
                accentColor="da-c3"
                unit="reports"
                className="min-h-0 flex-1"
              />
              <div className="flex items-center justify-between">
                {xTicks.map((p) => (
                  <span key={p.t} className="da-nums text-[0.5rem] font-medium text-da-label">
                    {formatDate(p.t).slice(0, 6)}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Card className="min-h-0 flex-1">
          <CardHeader title="Scheduled Reports" action={<Button variant="link">Edit</Button>} />
          <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
            {SEED_SCHEDULED_REPORTS.map((s) => (
              <li key={s.id} className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
                <span
                  className="mt-[0.0625rem] flex size-[1.375rem] shrink-0 items-center justify-center rounded-[0.25rem]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-${s.accent}) 14%, transparent)`,
                    color: `var(--color-${s.accent})`,
                  }}
                >
                  <CalendarClock className="size-[0.75rem]" strokeWidth={2.2} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col leading-none">
                  <div className="flex items-start justify-between gap-[0.375rem]">
                    <span className="truncate text-2xs font-semibold text-da-text">{s.name}</span>
                    <span className="shrink-0 text-3xs font-bold text-da-label">{s.format}</span>
                  </div>
                  <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                    {s.cadence}
                  </span>
                  <span className="da-nums mt-[0.25rem] text-[0.5rem] font-medium text-da-brand">
                    Next {formatDate(s.nextRunAt)} · {formatHour(s.nextRunAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="shrink-0">
          <CardHeader title="Output Formats (30 days)" />
          <div className="flex items-center gap-[0.625rem] px-[0.75rem] py-[0.625rem]">
            <DonutChart
              slices={SEED_REPORT_FORMAT_MIX}
              label="Report output formats"
              className="size-[5.375rem] shrink-0"
            />
            <ul className="flex min-w-0 flex-1 flex-col justify-center gap-[0.25rem]">
              {SEED_REPORT_FORMAT_MIX.map((slice) => (
                <li key={slice.id} className="flex items-center gap-[0.375rem]">
                  <Dot color={slice.color} className="size-[0.4375rem]" />
                  <span className="min-w-0 flex-1 truncate text-3xs font-medium text-da-text">
                    {slice.id}
                  </span>
                  <span className="da-nums shrink-0 text-3xs font-semibold text-da-muted">
                    {slice.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
