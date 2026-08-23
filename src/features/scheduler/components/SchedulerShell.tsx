"use client";

import { ArrowLeft, History, Radio, Satellite } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { CONFLICTS, SCHEDULE_STATS } from "../data/schedule";

/**
 * Chrome for the scheduler section.
 *
 * Same geometry as the monitor shell — 4rem header, 2.75rem footer, all rem —
 * so the two sections feel like one application and both inherit the root
 * font-size clamp without a breakpoint anywhere.
 *
 * There is no module rail. The section is only two screens, so the switch
 * between them lives in the header and the timeline keeps the width.
 */

export function SchedulerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onHistory = pathname.startsWith("/task-history");

  // One button rather than a rail: with only two screens, a 13.75rem column
  // spent on a two-item list is width the timeline can use. The button always
  // points at the screen you are not on — History to go forward into the log,
  // a back arrow to return.
  const target = onHistory
    ? { href: "/scheduler", label: "Scheduler", Icon: ArrowLeft }
    : { href: "/task-history", label: "Task History", Icon: History };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      <header className="flex h-[4rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.5rem]">
          <span className="flex size-[2rem] items-center justify-center rounded-[0.375rem] bg-da-brand text-da-on-brand shadow-da-brand-lg">
            <Satellite className="size-[1.0625rem]" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              MULTI-SATELLITE SCHEDULER
            </span>
            <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
              Telemetry &amp; tracking · pass prediction from TLE
            </span>
          </span>
        </div>

        <div className="flex items-center gap-[0.875rem]">
          <span className="flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-success/35 bg-da-success-soft px-[0.5rem] py-[0.25rem]">
            <span className="relative flex size-[0.375rem]">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-da-success opacity-70" />
              <span className="relative inline-flex size-full rounded-full bg-da-success" />
            </span>
            <span className="text-3xs font-bold uppercase tracking-[0.08em] text-da-success">
              Scheduling live
            </span>
          </span>

          <span
            className={cn(
              "flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.25rem]",
              CONFLICTS.length
                ? "border-da-danger/40 bg-da-danger-soft text-da-danger"
                : "border-da-border text-da-muted",
            )}
          >
            <Radio className="size-[0.8125rem]" strokeWidth={2.2} />
            <span className="da-nums text-3xs font-bold uppercase tracking-[0.08em]">
              {CONFLICTS.length} {CONFLICTS.length === 1 ? "conflict" : "conflicts"}
            </span>
          </span>

          <Link
            href={target.href}
            className="inline-flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-brand/35 bg-da-brand-soft px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-brand transition-colors hover:bg-da-brand hover:text-da-on-brand"
          >
            <target.Icon className="size-[0.6875rem]" strokeWidth={2.4} />
            {target.label}
          </Link>

          <ThemeToggle />
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>

      <footer className="flex h-[2.75rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <span className="flex items-center gap-[1.5rem]">
          {[
            ["Catalogue", `${SCHEDULE_STATS.satelliteCapacity} satellites`],
            ["Booked", `${SCHEDULE_STATS.satellitesScheduled} in window`],
            ["Window", `${SCHEDULE_STATS.windowHours.toFixed(1)} h`],
            ["Predictor", "SGP4 · GPU"],
            ["TLE age", "4 h 12 m"],
          ].map(([label, value]) => (
            <span key={label} className="flex flex-col leading-none">
              <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
                {label}
              </span>
              <span className="da-nums mt-[0.1875rem] text-2xs font-semibold text-da-text">
                {value}
              </span>
            </span>
          ))}
        </span>
        <span className="text-3xs font-medium uppercase tracking-[0.1em] text-da-label">
          Schedule files emitted at {SCHEDULE_STATS.resolutionMs} ms resolution
        </span>
      </footer>
    </div>
  );
}
