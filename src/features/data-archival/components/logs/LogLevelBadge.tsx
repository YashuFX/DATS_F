import type { LogLevelId } from "../../types";
import { LOG_LEVEL_COLOR, LOG_LEVEL_LABEL } from "./logLevels";

/**
 * Fixed-width so the five level names form a clean column instead of a ragged
 * edge — the same trick `PriorityBadge` uses on the archive table.
 */
export function LogLevelBadge({ level }: { level: LogLevelId }) {
  const color = LOG_LEVEL_COLOR[level];

  return (
    <span
      className="inline-flex w-[3rem] items-center justify-center rounded-[0.1875rem] py-[0.0625rem] text-3xs font-bold uppercase leading-[1.15rem] tracking-[0.04em]"
      style={{
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 14%, transparent)`,
        color: `var(--color-${color})`,
      }}
    >
      {LOG_LEVEL_LABEL[level]}
    </span>
  );
}
