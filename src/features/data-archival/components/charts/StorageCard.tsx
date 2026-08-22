import { ChevronRight } from "lucide-react";
import { SEED_STORAGE } from "../../data/seed";
import { Card, CardHeader } from "../ui/Card";
import { RadialGauge } from "./RadialGauge";

/** Stat in the right-hand column: caption above, value below. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col leading-none">
      <span className="text-3xs font-medium text-da-muted">{label}</span>
      <span className="da-nums mt-[0.25rem] text-2xs font-bold text-da-text">{value}</span>
    </li>
  );
}

export function StorageCard() {
  const { usedTB, totalTB, archiveRateGBPerHour, retentionDays } = SEED_STORAGE;
  const usedPercent = (usedTB / totalTB) * 100;
  const availableTB = totalTB - usedTB;

  return (
    <Card className="min-w-0">
      <CardHeader title="Storage Utilization" />

      <div className="flex min-h-0 flex-1 items-center px-[0.75rem] py-[0.5rem]">
        {/* Gauge column — capacity total sits beneath the ring, not in a footer. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-[0.5rem]">
          {/* 7.75rem box renders the ring at the design's 107px outer diameter. */}
          <div className="relative flex size-[7.75rem] items-center justify-center">
            <RadialGauge value={usedPercent} className="absolute inset-0 size-full" />
            <div className="flex flex-col items-center leading-none">
              <span className="da-nums text-xl font-bold tracking-[-0.02em] text-da-text">
                {usedTB}
              </span>
              <span className="mt-[0.25rem] text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
                TB Used
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center leading-none">
            <span className="da-nums text-md font-bold tracking-[-0.01em] text-da-text">
              {totalTB} TB
            </span>
            <span className="mt-[0.25rem] text-3xs font-medium uppercase tracking-[0.06em] text-da-label">
              Total Capacity
            </span>
          </div>
        </div>

        <span className="h-[5.5rem] w-[max(1px,0.0625rem)] shrink-0 bg-da-border" />

        <ul className="flex flex-1 flex-col justify-center gap-[0.625rem] pl-[0.875rem]">
          <Stat label="Used" value={`${usedTB} TB (${usedPercent.toFixed(1)}%)`} />
          <Stat
            label="Available"
            value={`${availableTB.toFixed(1)} TB (${(100 - usedPercent).toFixed(1)}%)`}
          />
          <Stat label="Archive Rate" value={`${archiveRateGBPerHour} GB / hr`} />
          <Stat label="Data Retention" value={`${retentionDays} Days`} />
        </ul>
      </div>

      <div className="flex shrink-0 items-center justify-center pb-[0.625rem]">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-[0.1875rem] text-3xs font-bold uppercase tracking-[0.06em] text-da-brand hover:underline"
        >
          Storage Details
          <ChevronRight className="size-[0.6875rem]" strokeWidth={2.4} />
        </button>
      </div>
    </Card>
  );
}
