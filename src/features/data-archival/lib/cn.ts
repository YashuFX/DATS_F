/** Minimal class-name joiner — no dependency needed for the handful of cases here. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
