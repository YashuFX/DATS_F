"use client";

import { Clock, Database, HardDrive, ListChecks, Settings, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useDemoClock } from "../../hooks/useDemoClock";
import { cn } from "../../lib/cn";
import { formatClock, formatDate, formatRelative, formatTB } from "../../lib/format";
import { SEED_HEALTH, SEED_STORAGE } from "../../data/seed";
import { BrandMark } from "@/features/shell/BrandMark";
import { OperatorChip } from "@/features/shell/OperatorChip";

/**
 * A single status readout in the header rail: icon tile, caption, value, and an
 * optional state chip. Six of these sit between the wordmark and the operator
 * block in the design.
 */
function HeaderStat({
  icon,
  iconTone,
  label,
  value,
  valueTone = "text-da-text",
  chip,
  className,
}: {
  icon: ReactNode;
  iconTone: string;
  label: string;
  value: ReactNode;
  valueTone?: string;
  chip?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[2.25rem] items-center gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.5rem]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-[1.25rem] shrink-0 items-center justify-center rounded-[0.1875rem]",
          iconTone,
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col justify-center leading-none">
        <span className="text-3xs font-medium uppercase tracking-[0.07em] text-da-label">
          {label}
        </span>
        <span className="mt-[0.1875rem] flex items-center gap-[0.25rem]">
          <span className={cn("da-nums text-2xs font-bold tracking-[0.01em]", valueTone)}>
            {value}
          </span>
          {chip}
        </span>
      </span>
    </div>
  );
}

function StateChip({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-[0.125rem] px-[0.25rem] py-[0.0625rem] text-[0.5rem] font-bold uppercase leading-[0.75rem] tracking-[0.06em]",
        tone,
      )}
    >
      {children}
    </span>
  );
}

export function AppHeader() {
  const now = useDemoClock();

  return (
    <header className="flex h-[4rem] shrink-0 items-center gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
      <BrandMark section="Archival" className="pr-[0.375rem]" />

      {/* Status rail */}
      <div className="flex min-w-0 flex-1 items-center gap-[0.4375rem]">
        <HeaderStat
          icon={<Settings className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-success-soft text-da-success"
          label="System Status"
          value="OPERATIONAL"
          valueTone="text-da-success"
        />
        <HeaderStat
          icon={<Database className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-brand-soft text-da-brand"
          label="Data Store"
          value="OnLiNe"
          chip={<StateChip tone="bg-da-success-soft text-da-success">Online</StateChip>}
        />
        <HeaderStat
          icon={<Clock className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-subtle text-da-muted"
          label="Last Archive"
          value={formatRelative(SEED_HEALTH.lastArchiveAt, now)}
        />
        <HeaderStat
          icon={<HardDrive className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-subtle text-da-muted"
          label="Total Storage"
          value={`${formatTB(SEED_STORAGE.usedTB)} / ${SEED_STORAGE.totalTB} TB`}
        />
        <HeaderStat
          icon={<ListChecks className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-brand-soft text-da-brand"
          label="Active Tasks"
          value={SEED_HEALTH.activeTaskCount}
        />
        <HeaderStat
          icon={<TriangleAlert className="size-[0.75rem]" strokeWidth={2.2} />}
          iconTone="bg-da-danger-soft text-da-danger"
          label="Critical Alerts"
          value={SEED_HEALTH.criticalAlertCount}
          valueTone="text-da-danger"
        />
      </div>

      {/* Operator block */}
      <div className="flex shrink-0 items-center gap-[0.625rem]">
        <OperatorChip />
        <div className="flex flex-col items-end leading-none">
          <span className="da-nums text-md font-bold tracking-[-0.01em] text-da-text">
            {formatClock(now)}
          </span>
          <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
            {formatDate(now)}
          </span>
        </div>

      </div>
    </header>
  );
}
