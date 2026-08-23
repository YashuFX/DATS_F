/**
 * Turning settings into paint.
 *
 * Everything an operator picks on the Appearance tab lands here and comes out
 * as CSS custom properties written onto `<html>`. Nothing below styles a
 * component: each entry reassigns a token `globals.css` already defines, which
 * is why one colour picker can retint the entire application — buttons, badges,
 * focus rings, chart strokes — without a single component knowing it happened.
 *
 * Two maps are always computed, one per theme, because half the derived values
 * depend on which ground the colour is landing on: a hover shade darkens on a
 * light board and lightens on a dark one. The resolved theme selects which map
 * is applied; both are cached so the pre-paint script can restore the right one
 * on the next load without waiting for React.
 */

import { CHART_PALETTES, type AppSettings } from "../types";

export const VARS_CACHE_KEY = "dats-settings-vars";

export type VarMap = Record<string, string>;

/* ── colour maths ─────────────────────────────────────────────────────── */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;

/** Blend `hex` toward white (`amount > 0`) or black (`amount < 0`). */
function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(rgb.map((c) => c + (target - c) * t));
}

/** WCAG relative luminance — decides whether ink on this fill is white or near-black. */
function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A translucent tint of the colour.
 *
 * `color-mix` against `transparent` rather than a solid tint, matching what the
 * dark theme already does for `--color-da-brand-soft`: the same value has to sit
 * on the card, the page and the header rail, and a solid would band against all
 * three.
 */
const soft = (hex: string, pct: number) =>
  `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

const isColor = (value: string) => value !== "auto" && parseHex(value) !== null;

/* ── the map ──────────────────────────────────────────────────────────── */

const RADIUS: Record<AppSettings["radius"], [string, string]> = {
  square: ["0.125rem", "0.0625rem"],
  default: ["0.375rem", "0.25rem"],
  round: ["0.625rem", "0.4375rem"],
};

/** Every CSS variable this settings object overrides, for one theme. */
export function buildVars(settings: AppSettings, dark: boolean): VarMap {
  const vars: VarMap = {};

  if (isColor(settings.colorBrand)) {
    const brand = settings.colorBrand;
    vars["--color-da-brand"] = brand;
    // Hover moves away from the ground it sits on, not always darker.
    vars["--color-da-brand-hover"] = shade(brand, dark ? 0.22 : -0.16);
    vars["--color-da-brand-soft"] = soft(brand, dark ? 14 : 10);
    vars["--color-da-gauge"] = dark ? shade(brand, 0.12) : brand;
    // Ink for anything on a filled brand surface. Chosen by luminance so a
    // pale accent gets dark type instead of white-on-yellow.
    vars["--color-da-on-brand"] =
      luminance(brand) > 0.55 ? "#0b141d" : "#ffffff";
    vars["--shadow-da-brand"] = `0 1px 2px ${soft(brand, dark ? 18 : 24)}`;
    vars["--shadow-da-brand-lg"] = `0 2px ${dark ? "10px" : "6px"} ${soft(brand, dark ? 16 : 30)}`;
  }

  if (isColor(settings.colorSuccess)) {
    vars["--color-da-success"] = settings.colorSuccess;
    vars["--color-da-success-soft"] = soft(settings.colorSuccess, dark ? 13 : 12);
  }

  if (isColor(settings.colorWarn)) {
    const warn = settings.colorWarn;
    vars["--color-da-warn"] = warn;
    vars["--color-da-warn-soft"] = soft(warn, dark ? 13 : 12);
    // Amber-family hues fail contrast as label text on their own soft fill, so
    // light mode reads a darkened variant — the same trick the base theme uses.
    vars["--color-da-warn-text"] = dark ? warn : shade(warn, -0.35);
  }

  if (isColor(settings.colorDanger)) {
    vars["--color-da-danger"] = settings.colorDanger;
    vars["--color-da-danger-soft"] = soft(settings.colorDanger, dark ? 13 : 12);
  }

  if (isColor(settings.colorInfo)) {
    vars["--color-da-info"] = settings.colorInfo;
    vars["--color-da-info-soft"] = soft(settings.colorInfo, dark ? 13 : 12);
  }

  const palette = CHART_PALETTES[settings.chartPalette];
  if (palette) {
    palette.forEach((color, i) => {
      vars[`--color-da-c${i + 1}`] = color;
    });
  }

  if (settings.uiScale !== 1) {
    vars["--da-ui-scale"] = String(settings.uiScale);
  }

  if (settings.radius !== "default") {
    const [r, rs] = RADIUS[settings.radius];
    vars["--radius-da"] = r;
    vars["--radius-da-sm"] = rs;
  }

  if (settings.fontSans !== "auto") vars["--font-sans"] = settings.fontSans;
  if (settings.fontMono !== "auto") vars["--font-mono"] = settings.fontMono;

  return vars;
}

/* ── writing it to the document ───────────────────────────────────────── */

/** Properties written on the last pass, so a removed override is cleared. */
let lastKeys: string[] = [];

/**
 * Paint the settings, and cache both theme variants for the next cold load.
 *
 * Safe to call on every change: it diffs against the keys it wrote last time
 * and removes the ones that are no longer overridden, so switching a preset
 * back to "Theme default" actually hands the token back to the stylesheet.
 */
export function applySettings(settings: AppSettings) {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark";

  const light = buildVars(settings, false);
  const night = buildVars(settings, true);
  const active = dark ? night : light;

  for (const key of lastKeys) {
    if (!(key in active)) root.style.removeProperty(key);
  }
  for (const [key, value] of Object.entries(active)) {
    root.style.setProperty(key, value);
  }
  lastKeys = Object.keys(active);

  root.dataset.motion = settings.motion;

  try {
    localStorage.setItem(
      VARS_CACHE_KEY,
      JSON.stringify({ light, dark: night, motion: settings.motion }),
    );
  } catch {
    // Private mode or quota — this load is still painted correctly.
  }
}

/**
 * Restores the cached variables before the browser paints, so a custom accent
 * does not flash the stock cobalt on every reload.
 *
 * It reads the map `applySettings` cached rather than the settings object, which
 * keeps this script trivial and — more usefully — keeps it from drifting out of
 * step with the derivation above. Runs after the theme script, so `data-theme`
 * is already set and the right variant can be chosen.
 */
export const SETTINGS_INIT_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(
  VARS_CACHE_KEY,
)})||"null");if(!c)return;var e=document.documentElement;var v=e.dataset.theme==="dark"?c.dark:c.light;for(var k in v)e.style.setProperty(k,v[k]);if(c.motion)e.dataset.motion=c.motion}catch(err){}})()`;
