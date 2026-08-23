"use client";

import { CalendarClock, History, Radio, Satellite } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { CONFLICTS, SCHEDULE_STATS } from "../data/schedule";

/**
 * Chrome for the scheduler section.
 *
 * Same geometry as the monitor shell — 4rem header, 13.75rem module rail,
 * 2.75rem footer, all rem — so the two sections feel like one application and
 * both inherit the root font-size clamp without a breakpoint anywhere.
 */

const MODULES = [
  { code: "01", label: "Scheduler", href: "/scheduler", icon: CalendarClock },
  { code: "02", label: "Task History", href: "/task-history", icon: History },
];

function SidePanel() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[13.75rem] shrink-0 flex-col justify-between border-r-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.625rem] py-[0.75rem]">
      <div className="flex flex-col gap-[0.25rem]">
        <span className="px-[0.5rem] pb-[0.5rem] text-3xs font-bold uppercase tracking-[0.16em] text-da-label">
          Scheduler Modules
        </span>

        {MODULES.map((m) => {
          const Icon = m.icon;
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <Link
              key={m.href}
              href={m.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.5rem] transition-colors",
                active
                  ? "border-da-brand/40 bg-da-brand-soft text-da-brand"
                  : "border-transparent text-da-muted hover:bg-da-subtle hover:text-da-text",
              )}
            >
              <span className={cn("da-nums text-3xs font-bold", active ? "text-da-brand" : "text-da-label")}>
                {m.code}
              </span>
              <Icon className="size-[0.875rem] shrink-0" strokeWidth={2} />
              <span className="truncate text-2xs font-bold uppercase tracking-[0.06em]">
                {m.label}
              </span>
              {active && (
                <span className="absolute right-[0.5rem] size-[0.3125rem] rounded-full bg-da-brand" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col gap-[0.375rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.625rem]">
        {[
          ["Predictor", "SGP4 · GPU", "text-da-text"],
          ["TLE age", "4 h 12 m", "text-da-text"],
          ["Resolution", `${SCHEDULE_STATS.resolutionMs} ms`, "text-da-success"],
        ].map(([label, value, tone]) => (
          <span key={label} className="flex items-center justify-between px-[0.5rem]">
            <span className="text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
              {label}
            </span>
            <span className={cn("da-nums text-3xs font-bold", tone)}>{value}</span>
          </span>
        ))}
      </div>
    </aside>
  );
}

export function SchedulerShell({ children }: { children: ReactNode }) {
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
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <SidePanel />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <footer className="flex h-[2.75rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <span className="flex items-center gap-[1.5rem]">
          {[
            ["Catalogue", `${SCHEDULE_STATS.satelliteCapacity} satellites`],
            ["Booked", `${SCHEDULE_STATS.satellitesScheduled} in window`],
            ["Window", `${SCHEDULE_STATS.windowHours.toFixed(1)} h`],
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
