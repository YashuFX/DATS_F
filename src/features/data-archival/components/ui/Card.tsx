import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={cn("da-card flex flex-col", className)}>{children}</section>;
}

/**
 * The repeated card header: a small uppercase tracked label on the left and an
 * optional action on the right, separated from the body by a hairline.
 */
export function CardHeader({
  title,
  action,
  className,
  divider = true,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  divider?: boolean;
}) {
  return (
    <header
      className={cn(
        "flex h-[2.125rem] shrink-0 items-center justify-between px-[0.75rem]",
        divider && "border-b-[max(1px,0.0625rem)] border-da-border",
        className,
      )}
    >
      <CardTitle title={title} />
      {action}
    </header>
  );
}

/**
 * Card titles in the design are two-tone: the subject in near-black, any
 * parenthetical qualifier in lighter grey at the same size — "DATA
 * DISTRIBUTION (BY TYPE)", "ARCHIVE ACTIVITY (LAST 24 HOURS)". Splitting on the
 * first bracket keeps that automatic, so callers pass one plain string.
 */
function CardTitle({ title }: { title: string }) {
  const match = title.match(/^(.*?)\s*(\(.*\))\s*$/);

  return (
    <span className="flex items-baseline gap-[0.25rem] uppercase">
      <span className="text-2xs font-bold tracking-[0.06em] text-da-text">
        {match ? match[1] : title}
      </span>
      {match && (
        <span className="text-3xs font-medium tracking-[0.06em] text-da-label">
          {match[2]}
        </span>
      )}
    </span>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-2xs font-semibold uppercase tracking-[0.07em] text-da-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The faint uppercase caption above a value, e.g. "TOTAL STORAGE". */
export function FieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-3xs font-medium uppercase tracking-[0.08em] text-da-label",
        className,
      )}
    >
      {children}
    </span>
  );
}
