"use client";

import {
  ArrowLeft,
  Check,
  Database,
  Monitor,
  Moon,
  Radio,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/features/auth";
import { useSession } from "@/features/auth/hooks/useSession";
import { cn } from "@/features/data-archival/lib/cn";
import { SCHEDULE_STATS, STATION } from "@/features/scheduler/data/schedule";
import { useArchiveRehydration } from "@/features/scheduler/hooks/usePassArchive";
import { usePassHistoryStore } from "@/features/scheduler/store/passHistoryStore";
import { applyTheme, readTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { SECTIONS } from "./sections";

/**
 * SETTINGS.
 *
 * Everything on this page does something. There are no placeholder switches:
 * a settings screen that shows controls which are not wired is worse than one
 * that shows three that are, because it teaches the operator that the controls
 * here cannot be trusted.
 *
 * Which is also why the environment block is explicitly read-only. Station,
 * resolution and catalogue capacity are facts about the deployment rather than
 * preferences, so they are presented as readouts and not as fields you can type
 * into and have quietly ignored.
 */

function Panel({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: typeof Sun;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="da-card flex flex-col">
      <header className="flex shrink-0 items-start gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.875rem] py-[0.625rem]">
        <span className="flex size-[1.75rem] shrink-0 items-center justify-center rounded-[0.25rem] bg-da-subtle text-da-muted">
          <Icon className="size-[0.875rem]" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-2xs font-bold uppercase tracking-[0.1em] text-da-text">
            {title}
          </span>
          <span className="mt-[0.3125rem] text-2xs font-medium leading-[1.4] text-da-muted">
            {description}
          </span>
        </span>
      </header>
      <div className="flex flex-col gap-[0.75rem] px-[0.875rem] py-[0.75rem]">
        {children}
      </div>
    </section>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.4375rem] last:border-b-0 last:pb-0">
      <span className="text-2xs font-medium text-da-muted">{label}</span>
      <span className="da-nums shrink-0 text-2xs font-bold text-da-text">
        {value}
      </span>
    </span>
  );
}

export function SettingsScreen() {
  const params = useSearchParams();
  const from = params.get("from");
  // Same-origin paths only — `from=https://elsewhere` would make the back link
  // an open redirect.
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/monitor/array";

  const session = useSession();
  const records = usePassHistoryStore((s) => s.records);
  const clearHistory = usePassHistoryStore((s) => s.clearHistory);
  useArchiveRehydration();

  /**
   * The theme, read from the DOM rather than held here.
   *
   * `null` until mounted: the painted theme comes from a pre-paint script and
   * localStorage, neither of which exists during SSR, so committing to a value
   * on the server would guarantee a hydration mismatch on half of all loads.
   */
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const [cleared, setCleared] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      <header className="flex h-[4rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex items-center gap-[0.625rem]">
          <Link
            href={backHref}
            className="flex size-[2rem] cursor-pointer items-center justify-center rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:border-da-brand hover:text-da-brand"
            title="Back to the console"
          >
            <ArrowLeft className="size-[0.9375rem]" strokeWidth={2.2} />
          </Link>
          <span className="flex flex-col leading-none">
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              SETTINGS
            </span>
            <span className="mt-[0.1875rem] text-3xs font-medium text-da-muted">
              Appearance, session and stored data
            </span>
          </span>
        </div>

        <SignOutButton />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-[0.875rem] pb-[4rem]">
        <div className="mx-auto grid w-full max-w-[64rem] grid-cols-2 items-start gap-[0.875rem]">
          {/* Appearance */}
          <Panel
            title="Appearance"
            icon={Sun}
            description="Applies to every console. Remembered on this device."
          >
            <div className="grid grid-cols-2 gap-[0.5rem]">
              {(
                [
                  ["light", "Light", Sun],
                  ["dark", "Dark", Moon],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyTheme(value)}
                  className={cn(
                    "flex h-[2.25rem] cursor-pointer items-center justify-center gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] text-2xs font-bold uppercase tracking-[0.08em] transition-colors",
                    theme === value
                      ? "border-da-brand bg-da-brand-soft text-da-brand"
                      : "border-da-border text-da-muted hover:border-da-brand hover:text-da-text",
                  )}
                >
                  <Icon className="size-[0.8125rem]" strokeWidth={2.2} />
                  {label}
                  {theme === value && (
                    <Check className="size-[0.75rem]" strokeWidth={2.8} />
                  )}
                </button>
              ))}
            </div>
          </Panel>

          {/* Session */}
          <Panel
            title="Session"
            icon={UserRound}
            description="Who is signed in on this device."
          >
            {session.status === "authenticated" ? (
              <>
                <Readout label="Signed in as" value={session.session.email} />
                <Readout
                  label="Session started"
                  value={new Date(session.session.startedAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19)}
                />
              </>
            ) : (
              <span className="text-2xs font-medium text-da-muted">
                {session.status === "checking"
                  ? "Reading session…"
                  : "No active session."}
              </span>
            )}
          </Panel>

          {/* Stored data */}
          <Panel
            title="Stored data"
            icon={Database}
            description="The pass archive is held in this browser and survives reloads."
          >
            <Readout label="Archived passes" value={`${records.length}`} />
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setCleared(true);
              }}
              disabled={records.length === 0}
              className="inline-flex h-[2rem] items-center justify-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.75rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted transition-colors enabled:cursor-pointer enabled:hover:border-da-danger enabled:hover:text-da-danger disabled:opacity-40"
            >
              <Trash2 className="size-[0.6875rem]" strokeWidth={2.4} />
              {cleared && records.length === 0
                ? "Archive cleared"
                : "Clear pass archive"}
            </button>
            <span className="text-3xs font-medium leading-[1.5] text-da-label">
              Clearing empties Task History. It refills as scheduled tasks
              complete.
            </span>
          </Panel>

          {/* Environment */}
          <Panel
            title="Ground segment"
            icon={Radio}
            description="Facts about this deployment. Read-only."
          >
            <Readout label="Station" value={STATION.name} />
            <Readout
              label="Coordinates"
              value={`${STATION.latDeg.toFixed(4)}°N, ${STATION.lonDeg.toFixed(4)}°E`}
            />
            <Readout
              label="Catalogue capacity"
              value={`${SCHEDULE_STATS.satelliteCapacity} satellites`}
            />
            <Readout
              label="Schedule resolution"
              value={`${SCHEDULE_STATS.resolutionMs} ms`}
            />
            <Readout
              label="Planning window"
              value={`${SCHEDULE_STATS.windowHours.toFixed(1)} h`}
            />
          </Panel>

          {/* Sections — full width: it is a directory, not a preference. */}
          <div className="col-span-2">
            <Panel
              title="Sections"
              icon={Monitor}
              description="Everything the compass at the bottom of the screen reaches."
            >
              <div className="grid grid-cols-4 gap-[0.5rem]">
                {SECTIONS.map((section) => (
                  <Link
                    key={section.id}
                    href={section.href}
                    className="flex items-start gap-[0.4375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border p-[0.5rem] transition-colors hover:border-da-brand"
                  >
                    <span className="flex size-[1.5rem] shrink-0 items-center justify-center rounded-[0.1875rem] bg-da-subtle text-da-brand">
                      <section.icon
                        className="size-[0.75rem]"
                        strokeWidth={2.2}
                      />
                    </span>
                    <span className="flex min-w-0 flex-col leading-none">
                      <span className="text-2xs font-bold text-da-text">
                        {section.label}
                      </span>
                      <span className="mt-[0.25rem] text-3xs font-medium leading-[1.4] text-da-muted">
                        {section.blurb}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}
