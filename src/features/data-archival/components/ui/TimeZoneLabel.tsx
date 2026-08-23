"use client";

import { useRuntimeConfig } from "@/lib/runtimeConfig";

/**
 * "Time (IST)" — with the zone the board is actually formatting in.
 *
 * A component rather than a string because the column definitions it appears in
 * are module-level constants: a string would be computed once at import and go
 * stale the moment an operator changed the zone, while an element re-renders
 * with the table.
 */
export function TimeZoneLabel({ prefix = "Time" }: { prefix?: string }) {
  return (
    <>
      {prefix} ({useRuntimeConfig().timeZoneLabel})
    </>
  );
}
