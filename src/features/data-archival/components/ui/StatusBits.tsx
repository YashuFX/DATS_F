import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Small shared readouts used across the five tabs: the coloured status cell
 * from the archive table, the legend dot from the alerts tally, and the
 * label/meter row that the rail lists are built from.
 */

export function StatusPill({
  color,
  icon,
  children,
  className,
}: {
  /** Theme token name without the `--color-` prefix. */
  color: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-[0.25rem] text-2xs font-semibold", className)}
      style={{ color: `var(--color-${color})` }}
    >
      {icon}
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-[0.375rem] shrink-0 rounded-full", className)}
      style={{ backgroundColor: `var(--color-${color})` }}
    />
  );
}

/** Legend entry: dot, count, label — the alerts tally footer. */
export function Tally({
  color,
  count,
  label,
}: {
  color: string;
  count: number | string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-[0.25rem]">
      <Dot color={color} />
      <span className="da-nums text-3xs font-semibold text-da-muted">
        {count} {label}
      </span>
    </span>
  );
}

/**
 * A ranked list row: name on the left, figure on the right, a proportional
 * meter underneath. Used by top error sources, the worker pool, and the export
 * destinations — one shape, three data sets.
 */
export function MeterRow({
  label,
  value,
  detail,
  /** 0..100 */
  percent,
  color = "da-brand",
  leading,
}: {
  label: string;
  value: string;
  detail?: string;
  percent: number;
  color?: string;
  leading?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-[0.3125rem] px-[0.75rem] py-[0.4375rem]">
      <div className="flex items-center gap-[0.375rem]">
        {leading}
        <span className="min-w-0 flex-1 truncate text-2xs font-semibold text-da-text">
          {label}
        </span>
        <span className="da-nums shrink-0 text-2xs font-bold text-da-text">{value}</span>
      </div>
      <div className="h-[0.1875rem] w-full overflow-hidden rounded-full bg-da-border">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: `var(--color-${color})`,
          }}
        />
      </div>
      {detail && (
        <span className="da-nums truncate text-3xs font-medium text-da-label">{detail}</span>
      )}
    </li>
  );
}
