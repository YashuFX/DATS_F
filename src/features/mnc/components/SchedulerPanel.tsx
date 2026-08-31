"use client";

import Link from "next/link";
import { Panel } from "./Panel";
import { cn } from "@/features/data-archival/lib/cn";
import { MC_TASKS } from "../data/mnc.mock";
import type { McTaskStatus } from "../types";

const STATUS_TOKEN: Record<McTaskStatus, string> = {
  RUNNING: "da-warn-text",
  SCHEDULED: "da-info",
  COMPLETED: "da-success",
  FAILED: "da-danger",
};

/** Thin progress rail. Only a running task has anything to show. */
function Progress({ percent, status }: { percent: number; status: McTaskStatus }) {
  return (
    <span className="flex items-center gap-[0.5rem]">
      <span className="h-[0.3125rem] w-[4rem] shrink-0 overflow-hidden rounded-full bg-da-border">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            backgroundColor: `var(--color-${status === "RUNNING" ? "da-success" : "da-border-strong"})`,
          }}
        />
      </span>
      <span className="da-nums w-[2rem] shrink-0 text-3xs font-semibold text-da-muted">{percent}%</span>
    </span>
  );
}

export function SchedulerPanel({ className }: { className?: string }) {
  return (
    <Panel
      className={className}
      title="Scheduler — Upcoming & Recent Tasks"
      expandHref="/scheduler"
      expandLabel="Open Scheduler"
      footer={
        <div className="flex items-center justify-between gap-[0.75rem]">
          <span className="text-3xs font-medium text-da-muted">
            Showing 1 to {MC_TASKS.length} of {MC_TASKS.length} tasks
          </span>
          <Link
            href="/scheduler"
            className="rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.625rem] py-[0.3125rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-text transition-colors hover:bg-da-border/40 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
          >
            View All Tasks
          </Link>
        </div>
      }
    >
      {/* The table scrolls inside its own container — eight columns of pass
          detail will not compress to the left column's width at 1366 px, and
          the page body must never scroll sideways. */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b-[max(1px,0.0625rem)] border-da-border">
              {["ID", "Task Name", "Type", "Satellite / Group", "Start Time (IST)", "End Time (IST)", "Status", "Progress"].map((h) => (
                <th key={h} className="whitespace-nowrap px-[0.75rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.07em] text-da-label">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MC_TASKS.map((task) => (
              <tr key={task.id} className="border-b-[max(1px,0.0625rem)] border-da-border/50 last:border-b-0 hover:bg-da-subtle/60">
                <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs font-semibold text-da-text">{task.id}</td>
                <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-text">{task.name}</td>
                <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{task.type}</td>
                <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{task.target}</td>
                <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{task.startIst}</td>
                <td className="da-nums whitespace-nowrap px-[0.75rem] py-[0.5rem] text-2xs text-da-muted">{task.endIst}</td>
                <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem]">
                  <span className={cn("text-3xs font-bold uppercase tracking-[0.06em]")} style={{ color: `var(--color-${STATUS_TOKEN[task.status]})` }}>
                    {task.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-[0.75rem] py-[0.5rem]">
                  <Progress percent={task.progress} status={task.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
