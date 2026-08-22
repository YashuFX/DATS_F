"use client";

import { CheckCircle2, CircleX, ListChecks, Plus, Timer } from "lucide-react";
import {
  SEED_TASK_QUEUE,
  SEED_TASK_STATS,
  SEED_TASK_THROUGHPUT,
  SEED_WORKERS,
} from "../../data/tasks";
import { formatDuration, formatHour, formatNumber, formatRelative } from "../../lib/format";
import { useDemoClock } from "../../hooks/useDemoClock";
import type { QueuedTask } from "../../types";
import { BarChart } from "../charts/BarChart";
import { DonutChart } from "../charts/DonutChart";
import { ActiveTasksCard } from "../rail/ActiveTasksCard";
import { TableCard } from "../table/TableCard";
import { PriorityBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { StatStrip } from "../ui/StatStrip";
import { Dot, MeterRow } from "../ui/StatusBits";
import { TASK_STATE_COLOR, TaskStatePill } from "./taskState";

/** Queue mix by stage — the ring beside the throughput chart. */
const CATEGORY_MIX = [
  { id: "Archival", percent: 31, color: "da-c1" },
  { id: "Compression", percent: 24, color: "da-c3" },
  { id: "Validation", percent: 17, color: "da-c5" },
  { id: "Replication", percent: 13, color: "da-c4" },
  { id: "Retention", percent: 9, color: "da-c2" },
  { id: "Indexing", percent: 6, color: "da-c6" },
];

const WORKER_STATE_COLOR = {
  online: "da-success",
  draining: "da-warn",
  offline: "da-danger",
} as const;

const COLUMNS = [
  {
    key: "id",
    label: "Task ID",
    width: "5.5rem",
    render: (row: QueuedTask) => (
      <span className="da-nums font-semibold text-da-text">{row.id}</span>
    ),
  },
  {
    key: "name",
    label: "Task",
    width: "auto",
    truncate: true,
    render: (row: QueuedTask) => (
      <span className="font-medium text-da-text">{row.name}</span>
    ),
  },
  {
    key: "category",
    label: "Stage",
    width: "6.5rem",
    render: (row: QueuedTask) => (
      <span className="font-medium text-da-muted">{row.category}</span>
    ),
  },
  {
    key: "target",
    label: "Target",
    width: "6.5rem",
    render: (row: QueuedTask) => (
      <span className="font-medium text-da-muted">{row.target}</span>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    width: "4.5rem",
    render: (row: QueuedTask) => <PriorityBadge priority={row.priority} />,
  },
  {
    key: "progress",
    label: "Progress",
    width: "7rem",
    render: (row: QueuedTask) => (
      <span className="flex items-center gap-[0.375rem]">
        <ProgressBar
          value={row.progress}
          color={TASK_STATE_COLOR(row.state)}
          className="flex-1"
          label={`${row.name} progress`}
        />
        <span className="da-nums w-[1.75rem] shrink-0 text-right text-3xs font-bold text-da-text">
          {row.progress}%
        </span>
      </span>
    ),
  },
  {
    key: "eta",
    label: "ETA",
    width: "4.5rem",
    render: (row: QueuedTask) => (
      <span className="da-nums font-medium text-da-muted">
        {row.state === "running" ? formatDuration(row.etaSeconds) : "—"}
      </span>
    ),
  },
  {
    key: "state",
    label: "State",
    width: "6rem",
    render: (row: QueuedTask) => <TaskStatePill state={row.state} />,
  },
];

/**
 * TASKS — the full queue behind the rail on the Archive Browser.
 *
 * Two columns: a flexible centre and the same 18.5rem status rail, which keeps
 * the live ACTIVE TASKS card exactly where it sits on the main screen so the
 * eye does not have to re-find it after a tab switch.
 */
export function TasksScreen() {
  const now = useDemoClock();
  const completed = SEED_TASK_QUEUE.filter((t) => t.state === "completed");
  const xTicks = SEED_TASK_THROUGHPUT.filter((_, i) => i % 3 === 0);

  return (
    <div className="grid h-full min-h-[33rem] grid-cols-[minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)_12rem] gap-[0.75rem]">
        <StatStrip
          items={[
            {
              label: "Running",
              value: String(SEED_TASK_STATS.running),
              valueTone: "text-da-brand",
              sub: <span className="text-da-muted">across 4 workers</span>,
              icon: <ListChecks className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-brand-soft text-da-brand",
            },
            {
              label: "Queued",
              value: String(SEED_TASK_STATS.queued),
              sub: <span className="text-da-muted">next start in 00:42</span>,
              icon: <Timer className="size-[1rem]" strokeWidth={2} />,
            },
            {
              label: "Completed Today",
              value: formatNumber(SEED_TASK_STATS.completedToday),
              valueTone: "text-da-success",
              sub: (
                <span className="text-da-success">
                  {SEED_TASK_STATS.successRatePercent}% success rate
                </span>
              ),
              icon: <CheckCircle2 className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-success-soft text-da-success",
            },
            {
              label: "Failed Today",
              value: String(SEED_TASK_STATS.failedToday),
              valueTone: "text-da-danger",
              sub: <span className="text-da-danger">1 awaiting retry</span>,
              icon: <CircleX className="size-[1rem]" strokeWidth={2} />,
              iconTone: "bg-da-danger-soft text-da-danger",
            },
          ]}
        />

        <TableCard
          title="Task Queue"
          action={
            <div className="flex items-center gap-[0.5rem]">
              <Button size="sm" variant="ghost">
                Retry Failed
              </Button>
              <Button size="sm" icon={<Plus className="size-[0.6875rem]" strokeWidth={2.4} />}>
                New Task
              </Button>
            </div>
          }
          columns={COLUMNS}
          rows={SEED_TASK_QUEUE}
          rowKey={(row) => row.id}
          paginated
          footer={
            <span className="flex min-w-0 items-center gap-[0.75rem] overflow-hidden">
                {(["running", "queued", "paused", "failed"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-[0.25rem]">
                    <Dot color={TASK_STATE_COLOR(s)} />
                    <span className="text-3xs font-semibold capitalize text-da-muted">{s}</span>
                  </span>
                ))}
            </span>
          }
        />

        <div className="grid min-h-0 grid-cols-3 gap-[0.75rem]">
          <Card className="min-w-0">
            <CardHeader title="Task Throughput (last 12 hours)" />
            <div className="flex min-h-0 flex-1 flex-col gap-[0.25rem] px-[0.75rem] pb-[0.625rem] pt-[0.875rem]">
              <BarChart
                points={SEED_TASK_THROUGHPUT}
                color="da-c5"
                accentAbove={28}
                accentColor="da-c1"
                unit="tasks"
                className="min-h-0 flex-1"
              />
              <div className="flex items-center justify-between">
                {xTicks.map((p) => (
                  <span key={p.t} className="da-nums text-[0.5rem] font-medium text-da-label">
                    {formatHour(p.t)}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="min-w-0">
            <CardHeader title="Queue Mix (by stage)" />
            <div className="flex min-h-0 flex-1 items-center gap-[0.625rem] px-[0.75rem] py-[0.625rem]">
              <DonutChart
                slices={CATEGORY_MIX}
                label="Task queue by stage"
                className="size-[5.375rem] shrink-0"
              />
              <ul className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1875rem]">
                {CATEGORY_MIX.map((slice) => (
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

          <Card className="min-w-0">
            <CardHeader title="Worker Pool" action={<Button variant="link">Manage</Button>} />
            <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
              {SEED_WORKERS.map((w) => (
                <MeterRow
                  key={w.id}
                  label={w.label}
                  value={`${w.utilization}%`}
                  detail={`${w.activeTasks} active · ${w.state}`}
                  percent={w.utilization}
                  color={WORKER_STATE_COLOR[w.state]}
                  leading={<Dot color={WORKER_STATE_COLOR[w.state]} />}
                />
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <ActiveTasksCard className="shrink-0" />

        <Card className="min-h-0 flex-1">
          <CardHeader
            title="Recently Completed"
            action={<Button variant="link">View All</Button>}
          />
          <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
            {completed.map((task) => (
              <li key={task.id} className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
                <CheckCircle2
                  className="mt-[0.0625rem] size-[0.8125rem] shrink-0 text-da-success"
                  strokeWidth={2.2}
                />
                <div className="flex min-w-0 flex-1 items-start justify-between gap-[0.375rem]">
                  <div className="flex min-w-0 flex-col leading-none">
                    <span className="truncate text-2xs font-semibold text-da-text">
                      {task.name}
                    </span>
                    <span className="da-nums mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
                      {task.id} | {task.target}
                    </span>
                  </div>
                  <span className="da-nums shrink-0 text-[0.5rem] font-medium text-da-label">
                    {formatRelative(task.startedAt, now)}
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
