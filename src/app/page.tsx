import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthGuard, SignOutButton } from "@/features/auth";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";

/**
 * Home. Deliberately plain, and staying that way for now: screens are built on
 * their own routes so each can be lifted into a host application, and this page
 * is only the way through to them.
 */
const SCREENS = [
  {
    href: "/data-archival",
    name: "Data Archival",
    detail: "Archive browser — logs, tasks, alerts, reports and exports",
    status: "Built",
  },
  {
    href: "/monitor/array",
    name: "Array Monitor",
    detail: "Subarray tiles — element health, calibration and beam loading",
    status: "Built",
  },
  {
    href: "/tracking",
    name: "Satellite Tracking",
    detail: "Ground-control console — map, rotor, radio, passes and events",
    status: "Built",
  },
];

export default function Home() {
  return (
    <AuthGuard>
      <main className="dats-archival flex min-h-[100dvh] w-full flex-col items-center justify-center bg-da-bg px-[1.5rem] py-[3rem] text-da-text">
        <div className="flex w-full max-w-[40rem] flex-col gap-[1.5rem]">
          <header className="da-rise flex items-start justify-between gap-[1rem]">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-da-text">
                DATS Frontend Components
              </h1>
              <p className="mt-[0.375rem] text-base text-da-muted">
                Screens are developed on their own routes for integration into host
                applications.
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-[0.5rem]">
              <ThemeToggle />
              <SignOutButton />
            </span>
          </header>

          <ul className="flex flex-col gap-[0.5rem]">
            {SCREENS.map((screen, i) => (
              <li
                key={screen.href}
                className="da-rise"
                style={{ animationDelay: `${0.05 * (i + 1)}s` }}
              >
                <Link
                  href={screen.href}
                  className="da-card group flex items-center justify-between gap-[1rem] px-[1rem] py-[0.875rem] transition-colors hover:border-da-brand/40 hover:bg-da-subtle"
                >
                  <span className="flex flex-col">
                    <span className="text-base font-semibold text-da-text">{screen.name}</span>
                    <span className="mt-[0.1875rem] text-sm text-da-muted">{screen.detail}</span>
                    <code className="mt-[0.375rem] text-xs text-da-brand">{screen.href}</code>
                  </span>
                  <span className="flex shrink-0 items-center gap-[0.625rem]">
                    <span className="rounded-[0.1875rem] bg-da-success-soft px-[0.5rem] py-[0.125rem] text-xs font-semibold text-da-success">
                      {screen.status}
                    </span>
                    <ArrowRight
                      className="size-[1rem] text-da-label transition-transform group-hover:translate-x-[0.125rem] group-hover:text-da-brand"
                      strokeWidth={2}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </AuthGuard>
  );
}
