import { SEED_ACTIVITY } from "../../data/seed";
import { formatHour } from "../../lib/format";
import { Card, CardHeader } from "../ui/Card";
import { AreaChart } from "./AreaChart";

const Y_TICKS = ["1 TB", "800 GB", "600 GB", "400 GB", "200 GB", "0"];

export function ActivityCard() {
  // Six x-axis labels every four hours, matching the design's 4-hour cadence.
  const xTicks = SEED_ACTIVITY.filter((_, i) => i % 4 === 0);

  return (
    <Card className="min-w-0">
      <CardHeader title="Archive Activity (last 24 hours)" />

      <div className="flex min-h-0 flex-1 gap-[0.375rem] px-[0.75rem] pt-[0.625rem]">
        {/* Fixed axis gutter so the x-labels below can be indented to match. */}
        <ul className="flex w-[2.125rem] shrink-0 flex-col justify-between py-[0.0625rem] text-right">
          {Y_TICKS.map((t) => (
            <li key={t} className="da-nums text-[0.5rem] font-medium leading-none text-da-label">
              {t}
            </li>
          ))}
        </ul>
        <AreaChart points={SEED_ACTIVITY} className="min-w-0 flex-1" />
      </div>

      <div className="flex items-center justify-between pl-[3.25rem] pr-[0.75rem] pt-[0.25rem]">
        {xTicks.map((p) => (
          <span key={p.t} className="da-nums text-[0.5rem] font-medium text-da-label">
            {formatHour(p.t)}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-center gap-[0.3125rem] py-[0.375rem]">
        <span className="size-[0.4375rem] rounded-[0.125rem] bg-da-c1" />
        <span className="text-3xs font-medium text-da-muted">Archived Data</span>
      </div>
    </Card>
  );
}
