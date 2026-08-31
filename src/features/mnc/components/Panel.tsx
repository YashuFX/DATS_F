"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * Shared chrome for every M&C panel: a title rail, optional right-hand
 * controls, and an expand affordance that NAVIGATES rather than opening a
 * modal.
 *
 * Navigating is the point of the whole screen. Each panel is a preview of a
 * section that already exists in full elsewhere, so "expand" means "take me to
 * the real instrument" — a modal would be a second, smaller copy of a screen
 * we already ship, and the operator would lose the browser history that lets
 * them get back.
 *
 * `expandHref` is a real <Link>, not an onClick router push, so the target
 * prefetches on hover and middle-click/⌘-click open it in a new tab the way an
 * operator expects.
 */
export function Panel({
  title,
  expandHref,
  expandLabel,
  controls,
  footer,
  bodyClassName,
  className,
  children,
}: {
  title: string;
  /** Where the expand control goes. Omitted = no expand affordance. */
  expandHref?: string;
  expandLabel?: string;
  /** Rendered at the right of the title rail, before the expand control. */
  controls?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("da-card flex min-h-0 min-w-0 flex-col overflow-hidden", className)}>
      <header className="flex h-[2.25rem] shrink-0 items-center justify-between gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <h2 className="truncate text-2xs font-bold uppercase tracking-[0.09em] text-da-text">{title}</h2>
        <div className="flex shrink-0 items-center gap-[0.375rem]">
          {controls}
          {expandHref && (
            <Link
              href={expandHref}
              aria-label={expandLabel ?? `Open ${title}`}
              title={expandLabel ?? `Open ${title}`}
              className="flex size-[1.375rem] items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
            >
              <Maximize2 className="size-[0.8125rem]" strokeWidth={2.2} />
            </Link>
          )}
        </div>
      </header>

      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>

      {footer && (
        <div className="shrink-0 border-t-[max(1px,0.0625rem)] border-da-border px-[0.75rem] py-[0.5rem]">
          {footer}
        </div>
      )}
    </section>
  );
}
