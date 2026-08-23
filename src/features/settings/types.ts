/**
 * SETTINGS — the shape of everything an operator can change.
 *
 * One flat object, persisted whole. It is flat on purpose: the export/import
 * pair on the System tab writes this straight out as JSON and reads it straight
 * back, and a nested shape would need a migration story the moment a section
 * moves.
 *
 * `theme` is deliberately absent. It lives in `@/lib/theme` because it has to
 * be applied before first paint by a script in `<head>`, and two sources of
 * truth for the same attribute is how a board ends up flashing white on reload.
 */

/** `"auto"` means "leave the theme's own token alone" — not a colour. */
export type ColorSetting = "auto" | string;

export type RadiusSetting = "square" | "default" | "round";
export type MotionSetting = "full" | "reduced";
export type ChartPalette = "default" | "colorblind" | "monochrome";
export type NotifyStyle = "toast" | "banner" | "dialog";
export type NotifyPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "top-center";
export type Severity = "info" | "success" | "warning" | "error";
export type TableRows = "auto" | number;

export interface AppSettings {
  /* ── Appearance ─────────────────────────────────────────────────────── */
  accentPreset: string;
  colorBrand: ColorSetting;
  colorSuccess: ColorSetting;
  colorWarn: ColorSetting;
  colorDanger: ColorSetting;
  colorInfo: ColorSetting;
  chartPalette: ChartPalette;
  /** Multiplies the root font-size clamp — the whole board scales with it. */
  uiScale: number;
  radius: RadiusSetting;
  fontSans: string;
  fontMono: string;
  motion: MotionSetting;

  /* ── Notifications ──────────────────────────────────────────────────── */
  notificationsEnabled: boolean;
  notifyStyle: NotifyStyle;
  notifyPosition: NotifyPosition;
  notifyDurationSec: number;
  notifySeverities: Record<Severity, boolean>;
  notifyStack: number;

  /* ── Console ────────────────────────────────────────────────────────── */
  timeZone: string;
  timeZoneLabel: string;
  clock24h: boolean;
  /** `"auto"` measures the card; a number pins the page size. */
  tableRows: TableRows;
  clockTickMs: number;
  showSectionNav: boolean;
  homeHref: string;

  /* ── Data & storage ─────────────────────────────────────────────────── */
  defaultDataType: string;
  defaultPriority: string;
  defaultRetention: string;
  defaultStoragePath: string;
  exportFormat: string;
  exportCompression: string;
  exportChecksum: boolean;
  archiveCap: number;

  /* ── Network ────────────────────────────────────────────────────────── */
  apiBaseUrl: string;
  wsUrl: string;
  requestTimeoutMs: number;
  retryAttempts: number;
  pollIntervalSec: number;

  /* ── Ground segment ─────────────────────────────────────────────────── */
  stationName: string;
  stationCallSign: string;
  stationLatDeg: number;
  stationLonDeg: number;
  stationAltM: number;

  /* ── System ─────────────────────────────────────────────────────────── */
  operatorEmail: string;
  sessionTimeoutMin: number;
  confirmDestructive: boolean;
  auditLogging: boolean;
  auditLogCap: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  accentPreset: "Theme default",
  colorBrand: "auto",
  colorSuccess: "auto",
  colorWarn: "auto",
  colorDanger: "auto",
  colorInfo: "auto",
  chartPalette: "default",
  uiScale: 1,
  radius: "default",
  fontSans: "auto",
  fontMono: "auto",
  motion: "full",

  notificationsEnabled: true,
  notifyStyle: "toast",
  notifyPosition: "bottom-right",
  notifyDurationSec: 4,
  notifySeverities: { info: true, success: true, warning: true, error: true },
  notifyStack: 3,

  timeZone: "Asia/Kolkata",
  timeZoneLabel: "IST",
  clock24h: true,
  tableRows: "auto",
  clockTickMs: 1000,
  showSectionNav: true,
  homeHref: "/monitor/array",

  defaultDataType: "telemetry",
  defaultPriority: "medium",
  defaultRetention: "Standard — 365 days",
  defaultStoragePath: "/archive/primary",
  exportFormat: "CSV",
  exportCompression: "gzip",
  exportChecksum: true,
  archiveCap: 500,

  apiBaseUrl: "http://localhost:8080/api",
  wsUrl: "ws://localhost:8080/stream",
  requestTimeoutMs: 5000,
  retryAttempts: 2,
  pollIntervalSec: 10,

  stationName: "Bengaluru (ISTRAC)",
  stationCallSign: "BLR-1",
  stationLatDeg: 13.0389,
  stationLonDeg: 77.5124,
  stationAltM: 914,

  operatorEmail: "",
  sessionTimeoutMin: 60,
  confirmDestructive: true,
  auditLogging: true,
  auditLogCap: 300,
};

/* ────────────────────────────────────────────────────────────────────────────
   Option lists. Every one of these is read by a control on the settings
   screen; nothing here is decorative.
   ──────────────────────────────────────────────────────────────────────── */

export interface AccentPreset {
  name: string;
  /** `null` hands the colour back to the theme's own token. */
  brand: string | null;
  success: string | null;
  warn: string | null;
  danger: string | null;
  info: string | null;
  /** Swatch shown in the picker when the preset defers to the theme. */
  swatch: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    name: "Theme default",
    brand: null,
    success: null,
    warn: null,
    danger: null,
    info: null,
    swatch: "#0065fd",
  },
  {
    name: "ISRO Blue",
    brand: "#0065fd",
    success: "#16a34a",
    warn: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
    swatch: "#0065fd",
  },
  {
    name: "Deep Teal",
    brand: "#0d9488",
    success: "#16a34a",
    warn: "#ca8a04",
    danger: "#dc2626",
    info: "#0ea5e9",
    swatch: "#0d9488",
  },
  {
    name: "Signal Violet",
    brand: "#7c3aed",
    success: "#16a34a",
    warn: "#f59e0b",
    danger: "#e11d48",
    info: "#6366f1",
    swatch: "#7c3aed",
  },
  {
    name: "Phosphor",
    brand: "#10b981",
    success: "#22c55e",
    warn: "#eab308",
    danger: "#f43f5e",
    info: "#38bdf8",
    swatch: "#10b981",
  },
  {
    name: "Amber Rail",
    brand: "#f59e0b",
    success: "#22c55e",
    warn: "#fb923c",
    danger: "#ef4444",
    info: "#60a5fa",
    swatch: "#f59e0b",
  },
  {
    name: "Slate",
    brand: "#475569",
    success: "#059669",
    warn: "#d97706",
    danger: "#e11d48",
    info: "#0284c7",
    swatch: "#475569",
  },
];

/** `null` leaves the theme's own eight series colours in place. */
export const CHART_PALETTES: Record<ChartPalette, string[] | null> = {
  default: null,
  /** Okabe–Ito, reordered to the board's legend order. */
  colorblind: [
    "#0072b2",
    "#e69f00",
    "#cc79a7",
    "#56b4e9",
    "#009e73",
    "#d55e00",
    "#f0e442",
    "#999999",
  ],
  monochrome: [
    "#1e293b",
    "#334155",
    "#475569",
    "#64748b",
    "#94a3b8",
    "#a8b4c4",
    "#c3ccd8",
    "#dde3ec",
  ],
};

export const FONT_SANS_OPTIONS: { label: string; value: string }[] = [
  { label: "Inter (default)", value: "auto" },
  {
    label: "System UI",
    value: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    label: "Helvetica / Arial",
    value: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    label: "Humanist (Segoe / Noto)",
    value: '"Segoe UI", "Noto Sans", Roboto, sans-serif',
  },
  {
    label: "Transitional serif",
    value: 'Charter, "Bitstream Charter", Georgia, serif',
  },
];

export const FONT_MONO_OPTIONS: { label: string; value: string }[] = [
  { label: "System mono (default)", value: "auto" },
  {
    label: "SF Mono / Menlo",
    value: '"SF Mono", SFMono-Regular, Menlo, monospace',
  },
  { label: "Consolas", value: 'Consolas, "Liberation Mono", monospace' },
  {
    label: "Courier",
    value: '"Courier New", Courier, monospace',
  },
];

export const TIME_ZONES: { label: string; value: string; abbr: string }[] = [
  { label: "India Standard Time — Bengaluru", value: "Asia/Kolkata", abbr: "IST" },
  { label: "Coordinated Universal Time", value: "UTC", abbr: "UTC" },
  { label: "Greenwich — London", value: "Europe/London", abbr: "GMT" },
  { label: "Central Europe — Darmstadt", value: "Europe/Berlin", abbr: "CET" },
  { label: "Eastern — Washington", value: "America/New_York", abbr: "EST" },
  { label: "Pacific — Pasadena", value: "America/Los_Angeles", abbr: "PST" },
  { label: "Japan — Tsukuba", value: "Asia/Tokyo", abbr: "JST" },
  { label: "Australia — Canberra", value: "Australia/Sydney", abbr: "AEST" },
];

export const RETENTION_POLICIES = [
  "Short — 30 days",
  "Standard — 365 days",
  "Extended — 5 years",
  "Permanent",
];

export const EXPORT_FORMATS = ["CSV", "JSON", "Parquet", "SigMF", "PDF"];
export const COMPRESSION_MODES = ["none", "gzip", "zstd"];

export const SEVERITIES: { id: Severity; label: string; token: string }[] = [
  { id: "info", label: "Information", token: "da-info" },
  { id: "success", label: "Success", token: "da-success" },
  { id: "warning", label: "Warning", token: "da-warn" },
  { id: "error", label: "Error", token: "da-danger" },
];

export const NOTIFY_POSITIONS: { id: NotifyPosition; label: string }[] = [
  { id: "bottom-right", label: "Bottom right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "top-right", label: "Top right" },
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top centre" },
];

export const SETTINGS_STORAGE_KEY = "dats-settings";
