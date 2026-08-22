import { ActivityCard } from "./charts/ActivityCard";
import { DistributionCard } from "./charts/DistributionCard";
import { StorageCard } from "./charts/StorageCard";
import { FilterPanel } from "./filters/FilterPanel";
import { KpiStrip } from "./overview/KpiStrip";
import { ActiveTasksCard } from "./rail/ActiveTasksCard";
import { RecentAlertsCard } from "./rail/RecentAlertsCard";
import { RecentArchivedTable } from "./table/RecentArchivedTable";

/**
 * ARCHIVE BROWSER — the designed screen.
 *
 * Three columns at the design canvas: filters 13.75rem (220px), a flexible
 * centre, and a 18.5rem (296px) status rail. Because every dimension is in rem
 * and the root font-size is fluid, this same grid is the 1440 design at 1x and
 * a full-bleed 4K board at 2.46x.
 */
export function ArchiveBrowser() {
  return (
    <div className="grid h-full grid-cols-[13.75rem_minmax(0,1fr)_18.5rem] gap-[0.75rem] p-[0.875rem]">
      <FilterPanel />

      {/* KPI strip 3.75rem — the height `ui/StatStrip` is sized against, and
          the same row every other tab gives it. Chart row 16.19rem off the
          design; the table takes the remainder, so anything the strip gains
          comes out of the table rather than off the bottom of the board. */}
      <div className="grid min-w-0 grid-rows-[3.75rem_minmax(0,1fr)_16.19rem] gap-[0.75rem]">
        <KpiStrip />
        <RecentArchivedTable />
        <div className="grid min-h-0 grid-cols-3 gap-[0.75rem]">
          <DistributionCard />
          <StorageCard />
          <ActivityCard />
        </div>
      </div>

      {/* Tasks take their natural height so all six rows are always visible;
          alerts absorb whatever is left. A fixed grow ratio here would clip the
          sixth task as soon as the viewport aspect changed. */}
      <div className="flex min-h-0 flex-col gap-[0.75rem]">
        <ActiveTasksCard className="shrink-0" />
        <RecentAlertsCard className="min-h-0 flex-1" />
      </div>
    </div>
  );
}
