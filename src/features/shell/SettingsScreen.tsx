"use client";

import {
  ArrowLeft,
  Bell,
  Check,
  Database,
  FileText,
  type LucideIcon,
  Monitor,
  Moon,
  Network,
  Palette,
  Server,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { AppearanceTab } from "@/features/settings/components/tabs/AppearanceTab";
import { ConsoleTab } from "@/features/settings/components/tabs/ConsoleTab";
import { DataTab } from "@/features/settings/components/tabs/DataTab";
import { EventLogTab } from "@/features/settings/components/tabs/EventLogTab";
import { NetworkTab } from "@/features/settings/components/tabs/NetworkTab";
import { NotificationsTab } from "@/features/settings/components/tabs/NotificationsTab";
import { SystemTab } from "@/features/settings/components/tabs/SystemTab";
import { useSettingsStore } from "@/features/settings/store/settingsStore";
import { applyThemeMode, readTheme, THEME_EVENT, type Theme } from "@/lib/theme";

/**
 * SETTINGS.
 *
 * Everything on this page does something. There are no placeholder switches: a
 * settings screen that shows controls which are not wired is worse than one
 * that shows three that are, because it teaches the operator that the controls
 * here cannot be trusted. Where a value is a fact about the deployment rather
 * than a preference — the planner's schedule resolution, the catalogue
 * capacity — it is presented as a readout, not as a field you can type into and
 * have quietly ignored.
 *
 * There is no Save button, for the same reason. Every control applies on
 * change and persists on the same beat, so a Save button would either be a lie
 * or a second, redundant state to keep in step with the first.
 *
 * The layout is the reference console's: header rail, a section list down the
 * left, the section itself on the right, status along the bottom. It is
 * authored entirely in rem like the rest of the application, so it scales with
 * the board rather than sitting inside it at a fixed size — and the rail folds
 * into a scrolling strip below `lg`, where a 14rem column would cost more than
 * it returns.
 */

interface Tab {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
  blurb: string;
  render: () => React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: "appearance",
    label: "Appearance",
    short: "Look",
    icon: Palette,
    blurb: "Theme, colour, scale, type",
    render: () => <AppearanceTab />,
  },
  {
    id: "notifications",
    label: "Notifications",
    short: "Alerts",
    icon: Bell,
    blurb: "Style, position, severities",
    render: () => <NotificationsTab />,
  },
  {
    id: "console",
    label: "Console",
    short: "Console",
    icon: Monitor,
    blurb: "Time, tables, navigation",
    render: () => <ConsoleTab />,
  },
  {
    id: "data",
    label: "Data & storage",
    short: "Data",
    icon: Database,
    blurb: "Archive and export defaults",
    render: () => <DataTab />,
  },
  {
    id: "network",
    label: "Network",
    short: "Network",
    icon: Network,
    blurb: "Endpoints, timeouts, retries",
    render: () => <NetworkTab />,
  },
  {
    id: "system",
    label: "System",
    short: "System",
    icon: Server,
    blurb: "Station, session, config file",
    render: () => <SystemTab />,
  },
  {
    id: "log",
    label: "Event log",
    short: "Log",
    icon: FileText,
    blurb: "Everything this console did",
    render: () => <EventLogTab />,
  },
];

export function SettingsScreen() {
  const params = useSearchParams();
  const from = params.get("from");
  const homeHref = useSettingsStore((s) => s.settings.homeHref);
  const stationName = useSettingsStore((s) => s.settings.stationName);
  const hydrated = useSettingsStore((s) => s.hydrated);

  // Same-origin paths only — `from=https://elsewhere` would make the back link
  // an open redirect.
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : homeHref;

  const initial = params.get("tab");
  const [active, setActive] = useState(
    TABS.some((t) => t.id === initial) ? (initial as string) : "appearance",
  );

  /* The open section is kept in the URL so a shift handover can be sent as a
     link, but through `replaceState` rather than a route push: this is one
     screen changing panes, not seven entries in the operator's back history. */
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", active);
    window.history.replaceState(null, "", url);
  }, [active]);

  /**
   * The painted theme, read from the DOM rather than held here.
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

  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      {/* ── header ── */}
      <header className="flex h-[4rem] shrink-0 items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <div className="flex min-w-0 items-center gap-[0.625rem]">
          <Link
            href={backHref}
            className="flex size-[2rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:border-da-brand hover:text-da-brand"
            title="Back to the console"
          >
            <ArrowLeft className="size-[0.9375rem]" strokeWidth={2.2} />
          </Link>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              SETTINGS
            </span>
            <span className="mt-[0.1875rem] truncate text-3xs font-medium text-da-muted">
              {current.blurb}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-[0.5rem]">
          <span className="hidden items-center gap-[0.375rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-muted md:flex">
            <Check className="size-[0.75rem] text-da-success" strokeWidth={3} />
            {hydrated ? "Saved on this device" : "Loading…"}
          </span>
          <button
            type="button"
            onClick={() => applyThemeMode(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            aria-label="Toggle theme"
            className="flex size-[2rem] cursor-pointer items-center justify-center rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:border-da-brand hover:text-da-brand"
          >
            {theme === "dark" ? (
              <Sun className="size-[0.875rem]" strokeWidth={2.2} />
            ) : (
              <Moon className="size-[0.875rem]" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ── section rail — a scrolling strip below lg ── */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-[0.25rem] overflow-x-auto border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.5rem] py-[0.375rem] lg:w-[13rem] lg:flex-col lg:gap-0 lg:overflow-y-auto lg:border-b-0 lg:border-r-[max(1px,0.0625rem)] lg:px-0 lg:py-[0.75rem]"
        >
          <span className="hidden px-[0.875rem] pb-[0.375rem] text-3xs font-bold uppercase tracking-[0.12em] text-da-label lg:block">
            Configuration
          </span>
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-[0.4375rem] whitespace-nowrap rounded-[0.25rem] px-[0.625rem] py-[0.4375rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors lg:rounded-none lg:border-l-[0.1875rem] lg:px-[0.75rem] lg:py-[0.5rem]",
                  isActive
                    ? "bg-da-brand-soft text-da-brand lg:border-l-da-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text lg:border-l-transparent",
                )}
              >
                <tab.icon className="size-[0.8125rem] shrink-0" strokeWidth={2.2} />
                <span className="lg:hidden">{tab.short}</span>
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── section ── */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-[0.875rem] pb-[4.5rem]">
          <div className="mx-auto w-full max-w-[66rem]">{current.render()}</div>
        </main>
      </div>

      {/* ── status ── */}
      <footer className="flex h-[1.75rem] shrink-0 items-center justify-between gap-[0.75rem] border-t-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem] text-3xs font-medium text-da-label">
        <span className="truncate">DATS · {stationName}</span>
        <span className="hidden truncate sm:block">
          Changes apply immediately and are stored in this browser
        </span>
      </footer>
    </div>
  );
}
