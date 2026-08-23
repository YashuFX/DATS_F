"use client";

import { AlertOctagon, Download, Gauge, ScrollText, TriangleAlert } from "lucide-react";
import {
  SEED_LOG_ENTRIES,
  SEED_LOG_INGEST_PER_MIN,
  SEED_LOG_LEVEL_FACETS,
  SEED_LOG_RETENTION_DAYS,
  SEED_LOG_TOP_SOURCES,
  SEED_LOG_TOTAL,
  SEED_LOG_VOLUME,
} from "../../data/logs";
import { formatClock, formatHour, formatNumber } from "../../lib/format";
import type { LogEntry } from "../../types";
import { BarChart } from "../charts/BarChart";
import { TableCard } from "../table/TableCard";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Dot, MeterRow } from "../ui/StatusBits";
import { StatStrip } from "../ui/StatStrip";
import { LOG_LEVEL_COLOR, LOG_LEVEL_LABEL } from "./logLevels";
import { LogFilterPanel } from "./LogFilterPanel";
import { LogLevelBadge } from "./LogLevelBadge";
import { TimeZoneLabel } from "../ui/TimeZoneLabel";

const facet = (id: string) =>
  SEED_LOG_LEVEL_FACETS.find((f) => f.id === id)?.count ?? 0;

const COLUMNS = [
  {
    key: "time",
    label: <TimeZoneLabel />,
    width: "5.25rem",
    render: (row: LogEntry) => (
      <span className="da-nums font-medium text-da-muted">{formatClock(row.timestamp)}</span>
    ),
  },
  {
    key: "level",
    label: "Level",
    width: "4.5rem",
    render: (row: LogEntry) => <LogLevelBadge level={row.level} />,
  },
  {
    key: "subsystem",
    label: "Subsystem",
    width: "7.5rem",
    render: (row: LogEntry) => (
      <span className="font-semibold text-da-text">{row.subsystem}</span>
    ),
  },
  {
    key: "source",
    label: "Host / Node",
    width: "6.25rem",
    render: (row: LogEntry) => <span className="font-medium text-da-muted">{row.source}</span>,
  },
  {
    key: "message",
    label: "Message",
    width: "auto",
    truncate: true,
    render: (row: LogEntry) => (
      <span className="font-medium text-da-text">{row.message}</span>
    ),
  },
  {
    key: "trace",
    label: "Trace ID",
    width: "5.5rem",
    render: (row: LogEntry) => (
      <span className="da-nums font-medium text-da-label">{row.traceId}</span>
    ),
  },
];

/**
 * LOGS — the live stream console.
 *
 * Same three-column skeleton as the Archive Browser (13.75rem facets, flexible
 * centre, 18.5rem rail) and the same row rhythm, so switching tabs moves the
 * content without moving the furniture.
 */
export function LogsScreen() {
  const xTicks = SEED_LOG_VOLUME.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid h-full min-h-[22rem] grid-cols-[13.75rem_minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <LogFilterPanel />

      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)] gap-[0.75rem]">
        <StatStrip
          items={[
            {
              label: "Total Entries",
              value: formatNumber(SEED_LOG_TOTAL),
              sub: <span className="text-da-muted">last {SEED_LOG_RETENTION_DAYS} days retained</span>,
              icon: <ScrollText className="size-[1rem]" strokeWidth={2} />,
            },
            {
              label: "Errors (24h)",
              value: formatNumber(facet("error")),
              valueTone: "text-da-danger",
              sub: <span className="text-da-danger">0.03% of volume</span>,
              icon: <AlertOctagon className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-danger-soft text-da-danger",
            },
            {
              label: "Warnings (24h)",
              value: formatNumber(facet("warn")),
              valueTone: "text-da-warn-text",
              sub: <span className="text-da-muted">18 sources reporting</span>,
              icon: <TriangleAlert className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-warn-soft text-da-warn",
            },
            {
              label: "Ingest Rate",
              value: `${formatNumber(SEED_LOG_INGEST_PER_MIN)} / min`,
              sub: <span className="text-da-success">Pipeline healthy</span>,
              icon: <Gauge className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-success-soft text-da-success",
            },
          ]}
        />

        <TableCard
          title="Live Log Stream"
          action={
            <div className="flex items-center gap-[0.5rem]">
              <span className="flex items-center gap-[0.3125rem] rounded-[0.1875rem] bg-da-success-soft px-[0.375rem] py-[0.0625rem]">
                <span className="relative flex size-[0.375rem]">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-da-success opacity-70" />
                  <span className="relative inline-flex size-full rounded-full bg-da-success" />
                </span>
                <span className="text-3xs font-bold uppercase tracking-[0.06em] text-da-success">
                  Live
                </span>
              </span>
              <Button size="sm" variant="ghost" icon={<Download className="size-[0.6875rem]" strokeWidth={2.2} />}>
                Export
              </Button>
            </div>
          }
          columns={COLUMNS}
          rows={SEED_LOG_ENTRIES}
          rowKey={(row) => row.id}
          paginated
          footer={
            <span className="flex min-w-0 items-center gap-[0.75rem] overflow-hidden">
                {SEED_LOG_LEVEL_FACETS.map((f) => (
                  <span key={f.id} className="flex items-center gap-[0.25rem]">
                    <Dot color={LOG_LEVEL_COLOR[f.id]} />
                    <span className="text-3xs font-semibold text-da-muted">
                      {LOG_LEVEL_LABEL[f.id]}
                    </span>
                  </span>
                ))}
            </span>
          }
        />
      </div>

      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Card className="shrink-0">
          <CardHeader title="Log Volume (last 12 hours)" />
          <div className="flex flex-col gap-[0.25rem] px-[0.75rem] pb-[0.5rem] pt-[0.875rem]">
            <BarChart
              points={SEED_LOG_VOLUME}
              color="da-c1"
              accentAbove={6_500}
              accentColor="da-c3"
              unit="entries"
              className="h-[4.5rem]"
            />
            <div className="flex items-center justify-between">
              {xTicks.map((p) => (
                <span key={p.t} className="da-nums text-[0.5rem] font-medium text-da-label">
                  {formatHour(p.t)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-[0.875rem] border-t-[max(1px,0.0625rem)] border-da-border py-[0.375rem]">
            <span className="flex items-center gap-[0.25rem]">
              <Dot color="da-c1" />
              <span className="text-3xs font-semibold text-da-muted">Normal hour</span>
            </span>
            <span className="flex items-center gap-[0.25rem]">
              <Dot color="da-c3" />
              <span className="text-3xs font-semibold text-da-muted">Above 6.5k</span>
            </span>
          </div>
        </Card>

        <Card className="min-h-0 flex-1">
          <CardHeader
            title="Top Error Sources (24h)"
            action={<Button variant="link">View All</Button>}
          />
          <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
            {SEED_LOG_TOP_SOURCES.map((s) => (
              <MeterRow
                key={s.label}
                label={s.label}
                value={formatNumber(s.count)}
                detail={s.detail}
                percent={(s.count / SEED_LOG_TOP_SOURCES[0].count) * 100}
                color={s.color}
                leading={<Dot color={s.color ?? "da-brand"} />}
              />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
