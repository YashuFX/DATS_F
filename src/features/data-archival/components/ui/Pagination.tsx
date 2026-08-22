"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Compact page stepper for the tables that page instead of scrolling.
 *
 * Sized to sit inside the 1.875rem table footer: 1.25rem targets, 3xs type, and
 * the same brand fill the primary button uses to mark the current page.
 */
export function Pagination({
  page,
  pageCount,
  onChange,
  className,
}: {
  /** Zero-based. */
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  // At most five numbers, windowed around the current page, so the footer never
  // grows a second row on a table with a hundred pages.
  const windowSize = Math.min(5, pageCount);
  const start = Math.max(
    0,
    Math.min(page - Math.floor(windowSize / 2), pageCount - windowSize),
  );
  const pages = Array.from({ length: windowSize }, (_, i) => start + i);

  return (
    <nav className={cn("flex items-center gap-[0.1875rem]", className)} aria-label="Pagination">
      <Step
        label="Previous page"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        icon={<ChevronLeft className="size-[0.6875rem]" strokeWidth={2.4} />}
      />

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          onClick={() => onChange(p)}
          className={cn(
            "da-nums flex h-[1.25rem] min-w-[1.25rem] cursor-pointer items-center justify-center rounded-[0.1875rem] px-[0.25rem] text-3xs font-bold transition-colors",
            p === page
              ? "bg-da-brand text-da-on-brand"
              : "text-da-muted hover:bg-da-subtle hover:text-da-text",
          )}
        >
          {p + 1}
        </button>
      ))}

      <Step
        label="Next page"
        disabled={page >= pageCount - 1}
        onClick={() => onChange(page + 1)}
        icon={<ChevronRight className="size-[0.6875rem]" strokeWidth={2.4} />}
      />
    </nav>
  );
}

function Step({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-[1.25rem] items-center justify-center rounded-[0.1875rem] border-[max(1px,0.0625rem)] border-da-border transition-colors",
        disabled
          ? "cursor-not-allowed text-da-label opacity-45"
          : "cursor-pointer text-da-muted hover:bg-da-subtle hover:text-da-text",
      )}
    >
      {icon}
    </button>
  );
}
