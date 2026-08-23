"use client";

import { CircleCheck, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { SEED_HEALTH } from "../../data/seed";
import { useDemoClock } from "../../hooks/useDemoClock";
import { cn } from "../../lib/cn";
import { formatCountdown, formatDateTime } from "../../lib/format";
import { useArchivalStore } from "../../store/useArchivalStore";
import { Button } from "../ui/Button";

function FooterItem({
  icon,
  label,
  value,
  valueTone = "text-da-text",
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  valueTone?: string;
}) {
  return (
    <div className="flex items-center gap-[0.375rem]">
      {icon}
      <span className="flex flex-col leading-none">
        <span className="text-3xs font-medium uppercase tracking-[0.07em] text-da-label">
          {label}
        </span>
        <span className={cn("da-nums mt-[0.1875rem] text-2xs font-semibold", valueTone)}>
          {value}
        </span>
      </span>
    </div>
  );
}

export function StatusFooterBar() {
  const now = useDemoClock();
  const setManualDialogOpen = useArchivalStore((s) => s.setManualDialogOpen);

  // Countdown loops so the board always has a live next-archive timer.
  const elapsed = Math.floor((now - SEED_HEALTH.lastArchiveAt) / 1000);
  const period = SEED_HEALTH.nextArchiveInSeconds + 120;
  const remaining = SEED_HEALTH.nextArchiveInSeconds - (elapsed % period);
  const nextArchive = remaining > 0 ? remaining : remaining + period;

  return (
    <footer className="flex h-[2.75rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-surface px-[0.875rem]">
      <div className="flex items-center gap-[1.75rem]">
        <FooterItem
          icon={<CircleCheck className="size-[0.9375rem] text-da-success" strokeWidth={2.2} />}
          label="Data Integrity"
          value="All systems nominal"
          valueTone="text-da-success"
        />
        <FooterItem
          label="Last Integrity Check"
          value={formatDateTime(SEED_HEALTH.lastIntegrityCheckAt)}
        />
        <FooterItem label="Checksum Status" value="Verified" />
      </div>

      <div className="flex items-center gap-[1.75rem]">
        <FooterItem
          icon={<CircleCheck className="size-[0.9375rem] text-da-success" strokeWidth={2.2} />}
          label="Auto Archive"
          value="Enabled"
          valueTone="text-da-success"
        />
        <FooterItem label="Next Archive" value={`In ${formatCountdown(nextArchive)}`} />
        <Button
          onClick={() => setManualDialogOpen(true)}
          icon={<Upload className="size-[0.75rem]" strokeWidth={2.4} />}
        >
          Manual Archive Now
        </Button>
      </div>
    </footer>
  );
}
