import { SEED_DISTRIBUTION } from "../../data/seed";
import { Card, CardHeader } from "../ui/Card";
import { DonutChart } from "./DonutChart";

export function DistributionCard() {
  return (
    <Card className="min-w-0">
      <CardHeader title="Data Distribution (by type)" />
      <div className="flex min-h-0 flex-1 items-center gap-[0.625rem] px-[0.75rem] py-[0.625rem]">
        <DonutChart slices={SEED_DISTRIBUTION} className="size-[5.375rem] shrink-0" />
        <ul className="flex min-w-0 flex-1 flex-col justify-center gap-[0.1875rem]">
          {SEED_DISTRIBUTION.map((slice) => (
            <li key={slice.id} className="flex items-center gap-[0.375rem]">
              <span
                className="size-[0.4375rem] shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-${slice.color})` }}
              />
              <span className="min-w-0 flex-1 truncate text-3xs font-medium text-da-text">
                {slice.label}
              </span>
              {/* Fixed to one decimal on both figures — the design reads
                  "2.9 TB (2.0%)", which a bare number would render as "1 TB (2%)". */}
              <span className="da-nums shrink-0 text-3xs font-semibold text-da-muted">
                {slice.sizeTB.toFixed(1)} TB ({slice.percent.toFixed(1)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
