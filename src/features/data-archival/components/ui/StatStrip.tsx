import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { FieldLabel } from "./Card";

export interface StatItem {
  label: string;
  value: string;
  /** Defaults to the near-black body colour. */
  valueTone?: string;
  /** Long strings (a full timestamp) step down to `text-sm`. */
  valueSize?: string;
  sub: ReactNode;
  icon: ReactNode;
  iconTone?: string;
}

/**
 * The KPI rail that opens every screen, including the Archive Browser — see
 * `overview/KpiStrip`, which is this component plus the board's four figures.
 * One implementation on purpose: the strip is the first thing on every tab, so
 * a geometry tweak on one screen must not leave the other five behind.
 *
 * ── VERTICAL BUDGET ────────────────────────────────────────────────────────
 * The row is 3.75rem (60px at the design canvas) and it does not scroll, so
 * the stack has to be sized to it rather than trimmed by `overflow-hidden`.
 * Every screen that renders this component must give it that row height:
 *
 *   0.375rem padding     6.0
 *   label   (text-3xs)   9.0
 *   gap                  4.0
 *   value   (text-lg)   16.0
 *   gap                  4.0
 *   sub     (text-3xs)  10.0   ← 10, not 9: the trend arrow sets the line box
 *   0.375rem padding     6.0
 *                       ────
 *                       55.0 of 60.0, leaving 5px of air
 *
 * Two failure modes this is sized against, both seen on the board before:
 * at the old 3.15rem row the same stack needed 49px of a 50.4px card and the
 * three lines read as one clotted block; and a `text-xl` value overflows any
 * of these rows outright while lifting the value-to-label ratio to 2.2x, which
 * reads as oversized against the small caps. Keep the value at `text-lg`, and
 * if the stack ever needs a fourth line, grow the row — do not close the gaps.
 * ──────────────────────────────────────────────────────────────────────────
 */
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="da-card flex h-full min-h-0 shrink-0 flex-row items-center overflow-hidden">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-[0.5rem] overflow-hidden px-[0.875rem] py-[0.375rem]",
            i < items.length - 1 && "border-r-[max(1px,0.0625rem)] border-da-border",
          )}
        >
          <div className="flex min-w-0 flex-col justify-center leading-none">
            <FieldLabel>{item.label}</FieldLabel>
            <span
              className={cn(
                "da-nums mt-[0.25rem] truncate font-bold tracking-[-0.02em]",
                item.valueSize ?? "text-lg",
                item.valueTone ?? "text-da-text",
              )}
            >
              {item.value}
            </span>
            <span className="mt-[0.25rem] truncate text-3xs font-medium">{item.sub}</span>
          </div>
          <span
            className={cn(
              "flex size-[1.875rem] shrink-0 items-center justify-center rounded-[0.375rem]",
              item.iconTone ?? "bg-da-subtle text-da-muted",
            )}
          >
            {item.icon}
          </span>
        </div>
      ))}
    </div>
  );
}
