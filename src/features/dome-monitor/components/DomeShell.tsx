"use client";

import { Hexagon, Radar, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { SettingsButton } from "@/features/shell/SettingsButton";
import { useDomeStore } from "../store/domeStore";

/**
 * Chrome wrapper for the /dashboard route.
 *
 * Mirrors MonitorShell — 4rem header, 2.75rem footer, everything in rem — but
 * skips the side panel to give the 3D canvas maximum area.
 */
export function DomeShell({ children }: { children: ReactNode }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const totals = telemetry.totals;
  const degradedFaces = totals.facesTotal - totals.facesHealthy;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      {/* Header */}
      <header className="flex h-[4rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.5rem]">
          <span className="flex size-[2rem] items-center justify-center rounded-[0.375rem] bg-da-brand text-da-on-brand shadow-da-brand-lg">
            <Hexagon className="size-[1.0625rem]" strokeWidth={2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              DOME ARRAY
            </span>
            <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
              MUST-01 · Geodesic Phased Array
            </span>
          </span>
        </div>

        <div className="flex items-center gap-[0.875rem]">
          {/* Availability badge */}
          <span
            className={cn(
              "flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.25rem]",
              degradedFaces === 0
                ? "border-da-success/35 bg-da-success-soft"
                : "border-da-warn/40 bg-da-warn-soft",
            )}
          >
            <span className="relative flex size-[0.375rem]">
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-70",
                  degradedFaces === 0 ? "bg-da-success" : "bg-da-warn",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex size-full rounded-full",
                  degradedFaces === 0 ? "bg-da-success" : "bg-da-warn",
                )}
              />
            </span>
            <span
              className={cn(
                "da-nums text-3xs font-bold uppercase tracking-[0.08em]",
                degradedFaces === 0 ? "text-da-success" : "text-da-warn-text",
              )}
            >
              {totals.availabilityPercent.toFixed(1)}% Available
            </span>
          </span>

          {/* Alarms */}
          <Link
            href="/dashboard"
            className="flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] py-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle"
          >
            <TriangleAlert className="size-[0.8125rem]" strokeWidth={2.2} />
            <span className="da-nums text-3xs font-bold uppercase tracking-[0.08em]">
              {degradedFaces} {degradedFaces === 1 ? "face" : "faces"} flagged
            </span>
          </Link>

          {/* Demo data marker */}
          <span className="rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-info/30 bg-da-info-soft px-[0.375rem] py-[0.125rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-info">
            Demo Data
          </span>

          <SettingsButton />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content area — no side panel, maximum canvas space */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* Footer */}
      <footer className="flex h-[2.75rem] shrink-0 items-center justify-between border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <span className="flex items-center gap-[1.5rem]">
          {[
            ["Elements", `${totals.elementsOnline} / ${totals.elementsTotal}`],
            ["Faces", `${totals.facesHealthy} / ${totals.facesTotal} nominal`],
            ["Worst Cluster", `${totals.worstClusterSize} el @ F${totals.worstClusterFace}`],
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
          Truncated icosahedron · 26 faces · R = 3.000 m
        </span>
      </footer>
    </div>
  );
}
