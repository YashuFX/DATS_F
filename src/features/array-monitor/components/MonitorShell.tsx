"use client";

import { Activity, Cpu, Network, Radar, Sliders, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { ARRAY_TOTALS } from "../data/tiles";
import { siteAlarms } from "../data/infrastructure";

/**
 * Chrome for every /monitor screen: wordmark rail on top, console modules down
 * the left, status line along the bottom.
 *
 * Sized to the same canvas as the archival board — 4rem header, 13.75rem rail,
 * 2.75rem footer, everything in rem — so it inherits the root font-size clamp
 * in `globals.css` and scales to 4K without a single breakpoint.
 */

// No "Overview" entry: the side rail, the footer and this header already carry
// the site rollup, so a landing page would only restate them. Alarms surface in
// the header instead, where they are visible from every screen rather than from
// one an operator has to navigate to.
const MODULES = [
  { code: "01", label: "Array Grid", href: "/monitor/array", icon: Activity },
  { code: "02", label: "LRU Chassis", href: "/monitor/lru", icon: Cpu },
  { code: "03", label: "RFSoC Monitor", href: "/monitor/rfsoc", icon: Sliders },
  { code: "04", label: "Infrastructure", href: "/monitor/infrastructure", icon: Network },
];

function SidePanel() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[13.75rem] shrink-0 flex-col justify-between border-r-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.625rem] py-[0.75rem]">
      <div className="flex flex-col gap-[0.25rem]">
        <span className="px-[0.5rem] pb-[0.5rem] text-3xs font-bold uppercase tracking-[0.16em] text-da-label">
          Console Modules
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
                "group relative flex items-center gap-[0.5rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.5rem] transition-colors",
                active
                  ? "border-da-brand/40 bg-da-brand-soft text-da-brand"
                  : "border-transparent text-da-muted hover:bg-da-subtle hover:text-da-text",
              )}
            >
              <span
                className={cn(
                  "da-nums text-3xs font-bold",
                  active ? "text-da-brand" : "text-da-label",
                )}
              >
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
          ["Station", "Online", "text-da-success"],
          ["BITE Test", "Passed", "text-da-success"],
          ["Availability", `${ARRAY_TOTALS.availabilityPercent.toFixed(1)}%`, "text-da-text"],
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

export function MonitorShell({ children }: { children: ReactNode }) {
  const alarms = siteAlarms();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      {/* Wordmark rail */}
      <header className="flex h-[4rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.5rem]">
          <span className="flex size-[2rem] items-center justify-center rounded-[0.375rem] bg-da-brand text-da-on-brand shadow-da-brand-lg">
            <Radar className="size-[1.0625rem]" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              ARRAY MONITOR
            </span>
            <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
              DATS-09 · 24×24 S-Band Aperture
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
              Transmitting
            </span>
          </span>
          <Link
            href="/monitor/infrastructure"
            title="Site alarms"
            className={cn(
              "flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.25rem] transition-colors",
              alarms.length
                ? "border-da-warn/40 bg-da-warn-soft text-da-warn-text hover:border-da-warn"
                : "border-da-border text-da-muted hover:bg-da-subtle",
            )}
          >
            <TriangleAlert className="size-[0.8125rem]" strokeWidth={2.2} />
            <span className="da-nums text-3xs font-bold uppercase tracking-[0.08em]">
              {alarms.length} {alarms.length === 1 ? "alarm" : "alarms"}
            </span>
          </Link>
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
            ["Aperture", `${ARRAY_TOTALS.elementsOnline} / ${ARRAY_TOTALS.elementsTotal} elements`],
            ["Beams", `${ARRAY_TOTALS.beamsActive} / ${ARRAY_TOTALS.beamsTotal} loaded`],
            ["Mean Phase Error", `${ARRAY_TOTALS.meanPhaseErrorDeg.toFixed(2)}°`],
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
          Dual-polarised S-band feed · coherent
        </span>
      </footer>
    </div>
  );
}
