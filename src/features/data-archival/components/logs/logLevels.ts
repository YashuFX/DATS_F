import type { LogLevelId } from "../../types";

/** One colour per severity, reused by the badge, the facet list and the chart. */
export const LOG_LEVEL_COLOR: Record<LogLevelId, string> = {
  error: "da-danger",
  warn: "da-warn",
  info: "da-info",
  debug: "da-c3",
  trace: "da-label",
};

export const LOG_LEVEL_LABEL: Record<LogLevelId, string> = {
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
  debug: "DEBUG",
  trace: "TRACE",
};
