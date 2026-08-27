"use client";

import { Hexagon, Bell, Clock, CircleHelp, CircleCheck, CircleAlert, CircleX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { SettingsButton } from "@/features/shell/SettingsButton";
import { useDomeStore } from "../store/domeStore";
import { computeReadiness, STALE_THRESHOLD_MS, type ReadinessVerdict } from "../lib/readiness";
import { useNow } from "../hooks/useNow";

const VERDICT_META: Record<ReadinessVerdict, { label: string; token: string; icon: typeof CircleCheck }> = {
  GO:       { label: "Go",       token: "da-success", icon: CircleCheck },
  DEGRADED: { label: "Degraded", token: "da-warn",    icon: CircleAlert },
  NO_GO:    { label: "No-Go",    token: "da-danger",  icon: CircleX },
  UNKNOWN:  { label: "Unknown",  token: "da-offline", icon: CircleHelp },
};

/**
 * Readiness verdict against THRESHOLDS (DEMO placeholders — real EIRP/G-T/SLL
 * floor is blocker B3). Ticks every second purely to re-evaluate staleness —
 * telemetry itself only changes on the mock feed's own 4 s cadence.
 */
function ReadinessBadge() {
  const telemetry = useDomeStore((s) => s.telemetry);
  const now = useNow();

  const { verdict, reason } = computeReadiness(telemetry, now);
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;

  return (
    <span
      title={reason}
      className="flex items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.25rem]"
      style={{
        borderColor: `color-mix(in srgb, var(--color-${meta.token}) 35%, transparent)`,
        backgroundColor: `color-mix(in srgb, var(--color-${meta.token}) 12%, transparent)`,
      }}
    >
      <Icon className="size-[0.8125rem]" strokeWidth={2.2} style={{ color: `var(--color-${meta.token})` }} />
      <span className="da-nums text-3xs font-bold uppercase tracking-[0.08em]" style={{ color: `var(--color-${meta.token})` }}>
        {meta.label}
      </span>
    </span>
  );
}

/** Label-over-value header stat — the header's own version of a KPI tile. */
function HeaderStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-da-label">{label}</span>
      <span className={cn("da-nums mt-[0.1875rem] text-xs font-bold", tone ?? "text-da-text")}>{value}</span>
    </span>
  );
}

/** Global data-age indicator — always visible, per PHASEPLAN §Phase 4's one
 *  safety-critical rule: an operator must never read stale data as healthy.
 *  Shows absolute time (matches the header's other stats); colour is what
 *  carries the staleness signal, not the format. */
function LastUpdateStat() {
  const timestamp = useDomeStore((s) => s.telemetry.timestamp);
  const now = useNow();

  const stale = now - timestamp > STALE_THRESHOLD_MS;

  return (
    <span className="flex flex-col leading-none" title={stale ? "Telemetry stale" : undefined}>
      <span className="flex items-center gap-[0.1875rem] text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-da-label">
        <Clock className="size-[0.5625rem]" strokeWidth={2.4} />
        Last Update
      </span>
      <span className={cn("da-nums mt-[0.1875rem] text-xs font-bold", stale ? "text-da-warn-text" : "text-da-text")}>
        {new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })} UTC
      </span>
    </span>
  );
}

/**
 * Chrome wrapper for the /dashboard route.
 *
 * The dome is the hero: a translucent glass header floats over the board
 * (reads as an overlay on the 3D object, not a solid bar splitting it off)
 * and there is no footer — its old content (element/face/cluster counts)
 * was redundant with the KPI strip, and the dome's identity caption now
 * lives as a small corner badge inside the viewport itself
 * (DomeScreen.tsx), next to the camera-preset indicator. Removing the
 * footer row gives the viewport a full extra row of height, in service of
 * "the dome should appear LARGE, centered, and visually impressive".
 */
export function DomeShell({ children }: { children: ReactNode }) {
  const setAlarmsOpen = useDomeStore((s) => s.setAlarmsOpen);
  const telemetry = useDomeStore((s) => s.telemetry);
  const totals = telemetry.totals;
  const degradedFaces = totals.facesTotal - totals.facesHealthy;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      {/* One header — everything the old KPI strip showed now lives here as
          a stat group, so the board has a single top bar, not two. */}
      <header className="relative z-30 flex h-[4rem] shrink-0 items-center justify-between gap-[1rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.875rem] backdrop-blur-[0.625rem]">
        <div className="flex shrink-0 items-center gap-[0.5rem]">
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

        <div className="flex min-w-0 flex-1 items-center justify-center gap-[1.5rem]">
          <HeaderStat label="Elements Online" value={`${totals.elementsOnline.toLocaleString()} / ${totals.elementsTotal.toLocaleString()}`} />
          <HeaderStat label="Faces Active" value={`${totals.facesHealthy} / ${totals.facesTotal}`} />
          <HeaderStat
            label="Worst Cluster"
            value={`${totals.worstClusterSize} el @ F${totals.worstClusterFace}`}
            tone={totals.worstClusterSize > 10 ? "text-da-warn-text" : undefined}
          />
          <HeaderStat
            label="Alarms"
            value={`${degradedFaces}`}
            tone={degradedFaces > 0 ? "text-da-warn-text" : undefined}
          />
          <LastUpdateStat />
        </div>

        <div className="flex shrink-0 items-center gap-[0.625rem]">
          <ReadinessBadge />

          {/* Demo data marker */}
          <span className="rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-info/30 bg-da-info-soft px-[0.375rem] py-[0.125rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-info">
            Demo Data
          </span>

          <SettingsButton />
          <ThemeToggle />

          {/* Alarms bell — opens the same sliding panel the face selection uses. */}
          <button
            type="button"
            onClick={() => setAlarmsOpen(true)}
            aria-label={`${degradedFaces} faces flagged — open alarms`}
            className="relative flex size-[1.875rem] cursor-pointer items-center justify-center rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
          >
            <Bell className="size-[0.9375rem]" strokeWidth={2.2} />
            {degradedFaces > 0 && (
              <span className="absolute top-[0.25rem] right-[0.25rem] flex size-[0.4375rem] rounded-full bg-da-danger ring-[0.125rem] ring-da-chrome" />
            )}
          </button>
        </div>
      </header>

      {/* Main content area — full remaining height, dome fills it. */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
