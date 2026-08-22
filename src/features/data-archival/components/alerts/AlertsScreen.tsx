"use client";

import {
  BellRing,
  CheckCircle2,
  CircleCheck,
  Info,
  ShieldAlert,
  Timer,
  TriangleAlert,
} from "lucide-react";
import {
  SEED_ALERTS_BY_SOURCE,
  SEED_ALERT_FEED,
  SEED_ALERT_STATS,
  SEED_ALERT_TREND,
} from "../../data/alerts";
import { formatClock, formatDuration, formatHour, formatNumber } from "../../lib/format";
import type { AlertRecord, AlertStateId, SeverityId } from "../../types";
import { AlertFilterPanel } from "./AlertFilterPanel";
import { BarChart } from "../charts/BarChart";
import { TableCard } from "../table/TableCard";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Dot, MeterRow, StatusPill, Tally } from "../ui/StatusBits";
import { StatStrip } from "../ui/StatStrip";

const SEVERITY_COLOR: Record<SeverityId, string> = {
  critical: "da-danger",
  warning: "da-warn",
  info: "da-info",
};

const STATE_META: Record<AlertStateId, { color: string; label: string }> = {
  active: { color: "da-danger", label: "Active" },
  acknowledged: { color: "da-warn", label: "Acknowledged" },
  resolved: { color: "da-success", label: "Resolved" },
};

function SeverityCell({ severity }: { severity: SeverityId }) {
  const color = SEVERITY_COLOR[severity];
  const Icon = severity === "info" ? Info : TriangleAlert;

  return (
    <span
      className="inline-flex w-[4.25rem] items-center gap-[0.25rem] rounded-[0.1875rem] px-[0.375rem] py-[0.0625rem] text-3xs font-bold uppercase leading-[1.15rem] tracking-[0.04em]"
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 14%, transparent)`,
        color: `var(--color-${color})`,
      }}
    >
      <Icon className="size-[0.625rem]" strokeWidth={2.4} />
      {severity}
    </span>
  );
}

const COLUMNS = [
  {
    key: "time",
    label: "Time (IST)",
    width: "5.25rem",
    render: (row: AlertRecord) => (
      <span className="da-nums font-medium text-da-muted">{formatClock(row.timestamp)}</span>
    ),
  },
  {
    key: "id",
    label: "Alert ID",
    width: "5rem",
    render: (row: AlertRecord) => (
      <span className="da-nums font-semibold text-da-text">{row.id}</span>
    ),
  },
  {
    key: "severity",
    label: "Severity",
    width: "5.5rem",
    render: (row: AlertRecord) => <SeverityCell severity={row.severity} />,
  },
  {
    key: "title",
    label: "Alert",
    width: "auto",
    truncate: true,
    render: (row: AlertRecord) => (
      <span className="font-semibold text-da-text">{row.title}</span>
    ),
  },
  {
    key: "source",
    label: "Source",
    width: "7.5rem",
    render: (row: AlertRecord) => (
      <span className="font-medium text-da-muted">{row.source}</span>
    ),
  },
  {
    key: "category",
    label: "Category",
    width: "5.5rem",
    render: (row: AlertRecord) => (
      <span className="font-medium text-da-muted">{row.category}</span>
    ),
  },
  {
    key: "metric",
    label: "Metric",
    width: "8rem",
    render: (row: AlertRecord) => (
      <span className="da-nums flex flex-col leading-none">
        <span className="font-semibold text-da-text">
          {row.metricLabel}: {row.metricValue}
        </span>
        <span className="mt-[0.1875rem] text-3xs font-medium text-da-label">
          Threshold {row.threshold}
        </span>
      </span>
    ),
  },
  {
    key: "state",
    label: "State",
    width: "6.5rem",
    render: (row: AlertRecord) => {
      const meta = STATE_META[row.state];
      return (
        <span className="flex flex-col leading-none">
          <StatusPill color={meta.color}>
            <Dot color={meta.color} />
            {meta.label}
          </StatusPill>
          {row.acknowledgedBy && (
            <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-label">
              {row.acknowledgedBy}
            </span>
          )}
        </span>
      );
    },
  },
  {
    key: "action",
    label: "",
    width: "4.5rem",
    align: "right" as const,
    render: (row: AlertRecord) =>
      row.state === "active" ? (
        <Button size="sm" variant="outline">
          Ack
        </Button>
      ) : (
        <span className="text-3xs font-medium text-da-label">—</span>
      ),
  },
];

/**
 * ALERTS — the console behind the Archive Browser's RECENT ALERTS card.
 *
 * Three columns like the main screen; the severity tally that closes the rail
 * card there closes the table here, so the same counts stay in the same place.
 */
export function AlertsScreen() {
  const counts = SEED_ALERT_FEED.reduce(
    (acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }),
    { critical: 0, warning: 0, info: 0 } as Record<SeverityId, number>,
  );
  const xTicks = SEED_ALERT_TREND.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid h-full min-h-[22rem] grid-cols-[13.75rem_minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <AlertFilterPanel />

      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)] gap-[0.75rem]">
        <StatStrip
          items={[
            {
              label: "Active Alerts",
              value: String(SEED_ALERT_STATS.active),
              valueTone: "text-da-danger",
              sub: <span className="text-da-muted">7 unacknowledged</span>,
              icon: <BellRing className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-danger-soft text-da-danger",
            },
            {
              label: "Critical",
              value: String(SEED_ALERT_STATS.critical),
              valueTone: "text-da-danger",
              sub: <span className="text-da-danger">2 breaching SLA</span>,
              icon: <ShieldAlert className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-danger-soft text-da-danger",
            },
            {
              label: "Acknowledged",
              value: String(SEED_ALERT_STATS.acknowledged),
              valueTone: "text-da-warn-text",
              sub: <span className="text-da-muted">3 operators engaged</span>,
              icon: <CheckCircle2 className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-warn-soft text-da-warn",
            },
            {
              label: "Mean Time to Ack",
              value: formatDuration(SEED_ALERT_STATS.meanTimeToAckSeconds),
              sub: (
                <span className="text-da-success">
                  {SEED_ALERT_STATS.resolved24h} resolved in 24 h
                </span>
              ),
              icon: <Timer className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-success-soft text-da-success",
            },
          ]}
        />

        <TableCard
          title="Alert Console"
          action={
            <div className="flex items-center gap-[0.5rem]">
              <Button size="sm" variant="ghost">
                Silence 1h
              </Button>
              <Button
                size="sm"
                icon={<CircleCheck className="size-[0.6875rem]" strokeWidth={2.4} />}
              >
                Acknowledge All
              </Button>
            </div>
          }
          columns={COLUMNS}
          rows={SEED_ALERT_FEED}
          rowKey={(row) => row.id}
          paginated
          footer={
            <span className="flex min-w-0 items-center gap-[0.875rem] overflow-hidden">
                <Tally color="da-danger" count={counts.critical} label="Critical" />
                <Tally color="da-warn" count={counts.warning} label="Warning" />
                <Tally color="da-info" count={counts.info} label="Info" />
            </span>
          }
        />
      </div>

      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <Card className="shrink-0">
          <CardHeader title="Alert Trend (last 12 hours)" />
          <div className="flex flex-col gap-[0.25rem] px-[0.75rem] pb-[0.5rem] pt-[0.875rem]">
            <BarChart
              points={SEED_ALERT_TREND}
              color="da-warn"
              accentAbove={8}
              accentColor="da-danger"
              unit="alerts"
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
            <Tally color="da-warn" count="Normal" label="hour" />
            <Tally color="da-danger" count="8+" label="alerts / hr" />
          </div>
        </Card>

        <Card className="min-h-0 flex-1">
          <CardHeader
            title="Alerts by Source (24h)"
            action={<Button variant="link">View All</Button>}
          />
          <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
            {SEED_ALERTS_BY_SOURCE.map((s) => (
              <MeterRow
                key={s.label}
                label={s.label}
                value={formatNumber(s.count)}
                detail={s.detail}
                percent={(s.count / SEED_ALERTS_BY_SOURCE[0].count) * 100}
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
