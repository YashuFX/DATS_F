import type { ReactNode } from "react";
import { ThemeToggle } from "@/features/data-archival/components/shell/ThemeToggle";
import { BrandPanel } from "./BrandPanel";

/**
 * Chrome for every auth route.
 *
 * Two columns: the animated array display takes whatever width is left, and the
 * form sits in a fixed 30rem column. Both are rem, so the split holds its
 * proportion from a 1440 laptop to a 4K wall exactly like the board — there is
 * not a single pixel breakpoint in here.
 *
 * `min-h-[100dvh]` rather than `h-[100dvh]`: the register form is the tallest
 * screen in the flow, and on a short viewport it must scroll rather than clip,
 * which is the same lesson the board's bottom row taught.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="dats-archival flex min-h-[100dvh] w-full bg-da-bg text-da-text">
      <BrandPanel />

      <main className="relative flex w-[30rem] shrink-0 flex-col justify-center px-[3rem] py-[2.5rem]">
        <div className="absolute right-[1.5rem] top-[1.5rem]">
          <ThemeToggle />
        </div>

        {children}

        <footer className="mt-[2rem] flex items-center justify-between text-3xs font-medium uppercase tracking-[0.08em] text-da-label">
          <span>DATS Ground Segment</span>
          <span className="flex items-center gap-[0.3125rem]">
            <span className="size-[0.375rem] rounded-full bg-da-success" />
            Secure session
          </span>
        </footer>
      </main>
    </div>
  );
}

/** Card wrapper shared by the three forms. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="da-auth-card da-slide-in flex flex-col gap-[1.25rem] p-[1.75rem] dark:shadow-none">
      <header className="flex flex-col gap-[0.375rem]">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-da-text">{title}</h1>
        <p className="text-2xs font-medium leading-[1.5] text-da-muted">{subtitle}</p>
      </header>

      {children}

      {footer && (
        <footer className="border-t-[max(1px,0.0625rem)] border-da-border pt-[1rem] text-2xs font-medium text-da-muted">
          {footer}
        </footer>
      )}
    </section>
  );
}
