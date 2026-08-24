"use client";

import { ArrowLeft, Radar, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ARRAY_TOTALS } from "../data/tiles";
import { siteAlarms } from "../data/infrastructure";

/**
 * Chrome for every /monitor screen: wordmark rail on top, content in the full
 * available width, and a status line along the bottom.
 *
 * Sized to the same canvas as the archival board — 4rem header and 2.75rem
 * footer, everything in rem — so it inherits the root font-size clamp in
 * `globals.css` and scales to 4K without a single breakpoint.
 */
export function MonitorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const alarms = siteAlarms();
  const isArrayHome = pathname === "/monitor/array";

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
          {!isArrayHome && (
            <Link
              href="/monitor/array"
              title="Back to Array Monitor"
              className="flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] py-[0.25rem] text-da-muted transition-colors hover:border-da-brand hover:bg-da-brand-soft hover:text-da-brand"
            >
              <ArrowLeft className="size-[0.8125rem]" strokeWidth={2.2} />
              <span className="text-3xs font-bold uppercase tracking-[0.08em]">
                Back to Array
              </span>
            </Link>
          )}
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
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

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
