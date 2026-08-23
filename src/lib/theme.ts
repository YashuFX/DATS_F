/**
 * Shared by every screen in this application: the archival board and the
 * tracking console both hang off the same `data-theme` attribute and the same
 * storage key, so switching on one carries to the other.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "dats-theme";

/**
 * Runs synchronously in `<head>`, before the browser paints, so an operator who
 * left the board in dark never sees a white flash on reload — see
 * `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.
 *
 * The server renders no `data-theme` at all, which is deliberate: without the
 * attribute the `prefers-color-scheme` block in `globals.css` still themes the
 * board, so a no-JS or blocked-script client is themed correctly rather than
 * pinned to light. This script only ever narrows that to an explicit choice.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=(s==="dark"||s==="light")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}})()`;

/**
 * Fired after a switch so `useSyncExternalStore` subscribers re-read. The
 * tracking console reads the theme this way; the archival board's toggle is
 * CSS-driven and does not need it, but both write through `applyTheme`.
 */
export const THEME_EVENT = "dats-theme-change";

/** The theme currently painted, read from the DOM rather than React state. */
export function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Paint a theme and remember it. Storage failures must not block the switch. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or a storage quota — the board still switches for this session.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * The three states the settings screen offers.
 *
 * "system" is the absence of a stored choice, not a third stored value — which
 * is exactly what `THEME_INIT_SCRIPT` above already falls back to, so choosing
 * it is a `removeItem` and nothing else has to learn a new case.
 */
export type ThemeMode = Theme | "system";

/** What the operator chose, as opposed to what is currently painted. */
export function readThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    return "system";
  }
}

/** Apply a mode. "system" clears the choice and follows the OS from now on. */
export function applyThemeMode(mode: ThemeMode) {
  if (mode !== "system") {
    applyTheme(mode);
    return;
  }
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Nothing to clear — the session default already follows the OS.
  }
  document.documentElement.dataset.theme = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Track the OS preference while — and only while — no explicit choice is stored.
 * Returns an unsubscribe. Without this, "follow system" would only follow it at
 * load, and a board left open across a scheduled dark-mode switch would not move.
 */
export function watchSystemTheme(): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readThemeMode() === "system") applyThemeMode("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
