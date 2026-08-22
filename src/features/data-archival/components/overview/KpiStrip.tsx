"use client";

import { Clock, Database, FileText, ShieldCheck, TrendingUp } from "lucide-react";
import {
  SEED_RECORDS_DELTA_PERCENT,
  SEED_STORAGE,
  SEED_TOTAL_RECORDS,
  SEED_TOTAL_SIZE_TB,
  SEED_HEALTH,
} from "../../data/seed";
import { useDemoClock } from "../../hooks/useDemoClock";
import { formatDateTime, formatNumber, formatRelative } from "../../lib/format";
import { StatStrip } from "../ui/StatStrip";

/**
 * The Archive Browser's four headline figures.
 *
 * Only the data lives here — the cell geometry is `ui/StatStrip`, shared with
 * the five other tabs, so the strip is the same object on every screen and the
 * 3.15rem vertical budget documented there is honoured everywhere at once.
 */
export function KpiStrip() {
  const now = useDemoClock();

  return (
    <StatStrip
      items={[
        {
          label: "Total Records",
          value: formatNumber(SEED_TOTAL_RECORDS),
          sub: (
            <span className="inline-flex items-center gap-[0.1875rem] text-da-success">
              <TrendingUp className="size-[0.625rem]" strokeWidth={2.4} />
              {SEED_RECORDS_DELTA_PERCENT}% vs yesterday
            </span>
          ),
          icon: <FileText className="size-[1rem]" strokeWidth={2} />,
        },
        {
          label: "Total Size",
          value: `${SEED_TOTAL_SIZE_TB} TB`,
          sub: <span className="text-da-muted">of {SEED_STORAGE.totalTB} TB capacity</span>,
          icon: <Database className="size-[1rem]" strokeWidth={2} />,
        },
        {
          label: "Latest Record",
          value: formatDateTime(SEED_HEALTH.lastArchiveAt),
          // The only value that is a sentence rather than a figure: at the
          // display size it would crowd the divider, so it steps down one stop.
          valueSize: "text-sm",
          sub: (
            <span className="text-da-brand">
              {formatRelative(SEED_HEALTH.lastArchiveAt, now)}
            </span>
          ),
          icon: <Clock className="size-[1rem]" strokeWidth={2} />,
        },
        {
          label: "Retention Status",
          value: "HEALTHY",
          valueTone: "text-da-success",
          sub: (
            <span className="text-da-muted">{SEED_STORAGE.retentionDays} days remaining</span>
          ),
          icon: <ShieldCheck className="size-[1rem]" strokeWidth={2} />,
          iconTone: "bg-da-success-soft text-da-success",
        },
      ]}
    />
  );
}
