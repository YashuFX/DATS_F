"use client";

import { useEffect, useState, type RefObject } from "react";
import { useRuntimeConfig } from "@/lib/runtimeConfig";

/**
 * How many table rows fit in the element the ref points at, right now.
 *
 * The board is fully rem-based and scales with the root font-size, so a fixed
 * "12 rows per page" would be right at one viewport and clip or leave a hole at
 * every other. Measuring instead means one page is always exactly what the card
 * can show — no table scrollbar at any size, from a 1366 laptop where the 13px
 * legibility floor squeezes the board to a 4K wall that fits twice the rows.
 *
 * Server and first client render both return `fallback`, so hydration matches;
 * the measured count lands on the effect immediately after mount.
 */
export function useAutoPageSize(
  ref: RefObject<HTMLElement | null>,
  {
    enabled = true,
    /** Table row height in rem — `DataTable` rows are 2.125rem. */
    rowRem = 2.125,
    /** Header height inside the measured body, in rem. */
    headRem = 1.875,
    fallback = 10,
  }: { enabled?: boolean; rowRem?: number; headRem?: number; fallback?: number } = {},
): number {
  const [size, setSize] = useState(fallback);

  // An operator who has pinned a row count in Settings → Console gets that
  // count, measured or not. Measuring is the better default, not a mandate.
  const pinned = useRuntimeConfig().tableRows;

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || pinned !== "auto") return;

    const measure = () => {
      const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const usable = el.clientHeight - headRem * root;
      setSize(Math.max(1, Math.floor(usable / (rowRem * root))));
    };

    measure();
    // Fires on viewport resize and on the root font-size change that follows it.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, rowRem, headRem, pinned]);

  return pinned === "auto" ? size : Math.max(1, pinned);
}
