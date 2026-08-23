"use client";

import Link from "next/link";
import { Info, TriangleAlert } from "lucide-react";
import { SEED_ALERTS } from "../../data/seed";
import { cn } from "../../lib/cn";
import { formatClock } from "../../lib/format";
import type { AlertItem, SeverityId } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";

const SEVERITY_COLOR: Record<SeverityId, string> = {
  critical: "da-danger",
  warning: "da-warn",
  info: "da-info",
};

function AlertRow({ alert }: { alert: AlertItem }) {
  const color = SEVERITY_COLOR[alert.severity];
  const Icon = alert.severity === "info" ? Info : TriangleAlert;

  return (
    <li className="flex gap-[0.4375rem] px-[0.75rem] py-[0.4375rem]">
      <Icon
        className="mt-[0.0625rem] size-[0.8125rem] shrink-0"
        strokeWidth={2.2}
        style={{ color: `var(--color-${color})` }}
      />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-[0.375rem]">
        <div className="flex min-w-0 flex-col leading-none">
          <span
            className="truncate text-2xs font-semibold"
            style={{ color: `var(--color-${color})` }}
          >
            {alert.title}
          </span>
          <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
            {alert.source} | {alert.metricLabel}: {alert.metricValue}
          </span>
        </div>
        <span className="da-nums shrink-0 text-[0.5rem] font-medium text-da-label">
          {formatClock(alert.timestamp)}
        </span>
      </div>
    </li>
  );
}

export function RecentAlertsCard({
  alerts = SEED_ALERTS,
  className,
}: {
  alerts?: AlertItem[];
  className?: string;
}) {
  const counts = alerts.reduce(
    (acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }),
    { critical: 0, warning: 0, info: 0 } as Record<SeverityId, number>,
  );

  return (
    <Card className={cn("min-h-0", className)}>
      <CardHeader
        title="Recent Alerts"
        action={
          <Link href="/data-archival/alerts">
            <Button variant="link">View All</Button>
          </Link>
        }
      />

      <ul className="min-h-0 flex-1 divide-y-[max(1px,0.0625rem)] divide-da-border/70 overflow-y-auto">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </ul>

      <div className="flex shrink-0 items-center justify-center gap-[0.875rem] border-t-[max(1px,0.0625rem)] border-da-border py-[0.375rem]">
        <Tally color="da-danger" count={counts.critical} label="Critical" />
        <Tally color="da-warn" count={counts.warning} label="Warning" />
        <Tally color="da-info" count={counts.info} label="Info" />
      </div>
    </Card>
  );
}

function Tally({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className="flex items-center gap-[0.25rem]">
      <span
        className="size-[0.375rem] rounded-full"
        style={{ backgroundColor: `var(--color-${color})` }}
      />
      <span className="da-nums text-3xs font-semibold text-da-muted">
        {count} {label}
      </span>
    </span>
  );
}
