import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface Column<T> {
  key: string;
  label: string;
  /** rem width, or "auto" for the single flexible column. */
  width: string;
  align?: "left" | "right";
  /** Truncating cell — the flexible column always wants this. */
  truncate?: boolean;
  render: (row: T) => ReactNode;
}

/**
 * The board's table, generalised.
 *
 * Row height, header treatment, hairlines and the 0.75rem cell gutter are
 * lifted verbatim from RECENT ARCHIVED DATA so every tab's table reads as the
 * same object. Widths stay in rem: the eight-column rhythm that holds at 1440
 * holds unchanged on a 4K board.
 *
 * The caller owns scrolling — drop this inside a `min-h-0 flex-1 overflow-auto`
 * wrapper and the header scrolls away with the rows, matching the main screen.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
}) {
  return (
    <table className={cn("w-full table-fixed border-collapse", className)}>
      <colgroup>
        {columns.map((c) => (
          <col key={c.key} style={c.width === "auto" ? undefined : { width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr className="h-[1.875rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60">
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={cn(
                "px-[0.75rem] text-3xs font-semibold uppercase tracking-[0.07em] text-da-label",
                c.align === "right" ? "text-right" : "text-left",
              )}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className="h-[2.125rem] border-b-[max(1px,0.0625rem)] border-da-border/70 transition-colors last:border-b-0 hover:bg-da-subtle"
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className={cn(
                  "px-[0.75rem] text-2xs",
                  c.align === "right" && "text-right",
                  // max-w-0 is what lets a table-fixed cell actually truncate.
                  c.truncate && "max-w-0",
                )}
              >
                {c.truncate ? (
                  <span className="block truncate">{c.render(row)}</span>
                ) : (
                  c.render(row)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
