"use client";

import { useRef, useState, type ReactNode } from "react";
import { useAutoPageSize } from "../../hooks/useAutoPageSize";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import { Card, CardHeader } from "../ui/Card";
import { DataTable, type Column } from "../ui/DataTable";
import { Pagination } from "../ui/Pagination";

/**
 * Card + header + table body — the RECENT ARCHIVED DATA composition, packaged
 * so each tab's main table is one declaration.
 *
 * Two body modes:
 *
 *   default     the body scrolls, exactly like the Archive Browser's table.
 *   `paginated` the body never scrolls. It measures itself, fits a whole
 *               number of rows, and the footer gets a `‹ 1 2 ›` stepper.
 *
 * Paging is the right mode for a console table read at a glance across a room:
 * a scroll position is invisible from three metres away, a page number is not.
 * Because the page size is measured rather than hard-coded, a page is always
 * exactly as many rows as the card can show at the current board scale.
 */
export function TableCard<T>({
  title,
  action,
  columns,
  rows,
  rowKey,
  footer,
  paginated = false,
  className,
}: {
  title: string;
  action?: ReactNode;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Legend or summary for the footer's middle slot. */
  footer?: ReactNode;
  /** Page instead of scroll. */
  paginated?: boolean;
  className?: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const pageSize = useAutoPageSize(bodyRef, { enabled: paginated });
  const [page, setPage] = useState(0);

  const pageCount = paginated ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  // Clamped rather than corrected in an effect: when the viewport shrinks and
  // the page count drops, the last page must still render something this pass.
  const current = Math.min(page, pageCount - 1);
  const from = current * pageSize;
  const visible = paginated ? rows.slice(from, from + pageSize) : rows;

  return (
    <Card className={cn("min-h-0", className)}>
      <CardHeader title={title} action={action} />

      <div
        ref={bodyRef}
        className={cn("min-h-0 flex-1", paginated ? "overflow-hidden" : "overflow-auto")}
      >
        <DataTable columns={columns} rows={visible} rowKey={rowKey} />
      </div>

      {(footer || paginated) && (
        <div className="flex h-[1.875rem] shrink-0 items-center justify-between gap-[0.75rem] border-t-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
          {paginated ? (
            <span className="da-nums shrink-0 text-3xs font-medium text-da-label">
              {rows.length === 0
                ? "No rows"
                : `${formatNumber(from + 1)}–${formatNumber(from + visible.length)} of ${formatNumber(rows.length)}`}
            </span>
          ) : null}

          {footer}

          {paginated && (
            <Pagination
              page={current}
              pageCount={pageCount}
              onChange={setPage}
              className="shrink-0"
            />
          )}
        </div>
      )}
    </Card>
  );
}
