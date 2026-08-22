import { archivalConfig } from "../config";

/**
 * All formatters pin an explicit time zone and locale. That is what makes the
 * server render and the client hydration produce byte-identical strings — the
 * usual source of hydration mismatches in a dashboard full of timestamps.
 */
const TZ = archivalConfig.timeZone;
const LOCALE = "en-GB";

const clockFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const hourFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const numberFmt = new Intl.NumberFormat("en-US");

/** "18:42:31" */
export const formatClock = (ts: number) => clockFmt.format(ts);

/** "20 May 2025" */
export const formatDate = (ts: number) => dateFmt.format(ts).replace(/,/g, "");

/** "18:00" — activity chart axis. */
export const formatHour = (ts: number) => hourFmt.format(ts);

/** "20 May 2025 18:40:12" */
export const formatDateTime = (ts: number) => `${formatDate(ts)} ${formatClock(ts)}`;

/** "132,458" */
export const formatNumber = (n: number) => numberFmt.format(Math.round(n));

/** "2 min ago" — matches the design's phrasing exactly. */
export function formatRelative(ts: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** "2.45 GB" / "14.2 MB" / "312 MB" — 3 significant figures, like the design. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unit]}`;
}

/** "48.7 TB" */
export const formatTB = (tb: number, decimals = 1) => `${tb.toFixed(decimals)} TB`;

/** "00:14:32" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** "02:17" — the footer's next-archive countdown. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** "18/05/2025 00:00" — the date-range field. */
export function formatRangeStamp(ts: number): string {
  const d = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(ts);
  return `${d} ${hourFmt.format(ts)}`;
}

export const formatPercent = (n: number, decimals = 1) => `${n.toFixed(decimals)}%`;
