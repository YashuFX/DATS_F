"use client";

import { SEED_TASKS } from "../../data/seed";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { TASK_ICON } from "../../lib/icons";
import type { ActiveTask } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";

function TaskRow({ task }: { task: ActiveTask }) {
  const Icon = TASK_ICON[task.icon] ?? TASK_ICON.database;

  return (
    <li className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
      <span
        className="mt-[0.0625rem] flex size-[1.375rem] shrink-0 items-center justify-center rounded-[0.25rem]"
        style={{
          backgroundColor: `color-mix(in srgb, var(--color-${task.accent}) 14%, transparent)`,
          color: `var(--color-${task.accent})`,
        }}
      >
        <Icon className="size-[0.75rem]" strokeWidth={2.2} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-[0.25rem]">
        <div className="flex items-start justify-between gap-[0.375rem]">
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-2xs font-semibold text-da-text">{task.title}</span>
            <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
              {task.subtitle}
            </span>
          </div>
          <span className="da-nums shrink-0 text-2xs font-bold text-da-text">
            {Math.round(task.progress)}%
          </span>
        </div>

        <ProgressBar value={task.progress} color={task.accent} label={task.title} />

        <span className="da-nums text-[0.5rem] font-medium text-da-label">
          ETA {formatDuration(task.etaSeconds)}
        </span>
      </div>
    </li>
  );
}

export function ActiveTasksCard({
  tasks = SEED_TASKS,
  className,
}: {
  tasks?: ActiveTask[];
  className?: string;
}) {
  return (
    <Card className={cn("min-h-0", className)}>
      <CardHeader
        title="Active Tasks"
        action={<Button variant="link">View All</Button>}
      />
      <ul className="divide-y-[max(1px,0.0625rem)] divide-da-border/70">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
    </Card>
  );
}
