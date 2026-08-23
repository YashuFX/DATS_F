"use client";

import {
  BarChart3,
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Type,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import {
  applyThemeMode,
  readThemeMode,
  THEME_EVENT,
  type ThemeMode,
} from "@/lib/theme";
import { notify } from "../../store/notifyStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  ACCENT_PRESETS,
  CHART_PALETTES,
  FONT_MONO_OPTIONS,
  FONT_SANS_OPTIONS,
  type ChartPalette,
  type RadiusSetting,
} from "../../types";
import {
  Badge,
  Btn,
  Chip,
  ColorRow,
  Field,
  Note,
  Panel,
  PanelGrid,
  Segmented,
  SelectInput,
  Slider,
  SwatchTile,
  TabHeader,
} from "../ui";

/** Swatches shown while a colour is on "auto" — the stock light-theme tokens. */
const TOKEN_FALLBACK = {
  brand: "#0065fd",
  success: "#16a34a",
  warn: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

/**
 * A miniature of the board itself — rail, header, two cards and an accent —
 * rather than three abstract grey bars. The point of a theme preview is to look
 * like the thing it is previewing.
 */
function ThemeSwatch({ variant }: { variant: ThemeMode }) {
  const light = { bg: "#f5f7fa", rail: "#ffffff", card: "#ffffff", line: "#e9edf3", accent: "#0065fd" };
  const dark = { bg: "#0b141d", rail: "#101a24", card: "#15202c", line: "#223140", accent: "#2dd4bf" };

  const board = (p: typeof light) => (
    <span className="flex size-full gap-[0.1875rem] p-[0.25rem]" style={{ background: p.bg }}>
      <span className="w-[0.4375rem] shrink-0 rounded-[0.09375rem]" style={{ background: p.rail }} />
      <span className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
        <span className="h-[0.375rem] rounded-[0.09375rem]" style={{ background: p.rail }} />
        <span className="flex min-h-0 flex-1 gap-[0.1875rem]">
          <span
            className="flex flex-1 items-end rounded-[0.09375rem] p-[0.125rem]"
            style={{ background: p.card, border: `1px solid ${p.line}` }}
          >
            <span className="h-[0.3125rem] w-full rounded-[0.0625rem]" style={{ background: p.accent }} />
          </span>
          <span
            className="flex-1 rounded-[0.09375rem]"
            style={{ background: p.card, border: `1px solid ${p.line}` }}
          />
        </span>
      </span>
    </span>
  );

  if (variant !== "system") {
    return (
      <span className="block h-[3.25rem] overflow-hidden rounded-[0.25rem]">
        {board(variant === "dark" ? dark : light)}
      </span>
    );
  }

  /* Both boards, split down the middle — the honest picture of "whichever this
     machine is set to". */
  return (
    <span className="relative block h-[3.25rem] overflow-hidden rounded-[0.25rem]">
      <span className="absolute inset-0">{board(light)}</span>
      <span
        className="absolute inset-0"
        style={{ clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)" }}
      >
        {board(dark)}
      </span>
    </span>
  );
}

export function AppearanceTab() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const applyPreset = useSettingsStore((s) => s.applyPreset);

  /**
   * The theme mode, read from storage rather than held in the settings store.
   * `null` until mounted: the painted theme comes from a pre-paint script and
   * localStorage, neither of which exists during SSR, so committing to a value
   * on the server would guarantee a hydration mismatch on half of all loads.
   */
  const [mode, setMode] = useState<ThemeMode | null>(null);
  useEffect(() => {
    const sync = () => setMode(readThemeMode());
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const palette = CHART_PALETTES[settings.chartPalette] ?? [
    "var(--color-da-c1)",
    "var(--color-da-c2)",
    "var(--color-da-c3)",
    "var(--color-da-c4)",
    "var(--color-da-c5)",
    "var(--color-da-c6)",
    "var(--color-da-c7)",
    "var(--color-da-c8)",
  ];

  const setColor = (key: keyof typeof TOKEN_FALLBACK, value: string) => {
    const field = (
      {
        brand: "colorBrand",
        success: "colorSuccess",
        warn: "colorWarn",
        danger: "colorDanger",
        info: "colorInfo",
      } as const
    )[key];
    // Any hand-picked colour breaks the preset it came from — saying so is more
    // honest than leaving a preset chip lit beside colours it no longer describes.
    update({ [field]: value, accentPreset: "Custom" });
  };

  return (
    <>
      <TabHeader
        title="Appearance"
        description="Theme, colour, scale and type. Applies to every console in this application and is remembered on this device."
      >
        <Btn
          icon={RotateCcw}
          onClick={() => {
            applyPreset("Theme default");
            update({
              chartPalette: "default",
              uiScale: 1,
              radius: "default",
              fontSans: "auto",
              fontMono: "auto",
              motion: "full",
            });
            notify("success", "Appearance returned to the theme defaults");
          }}
        >
          Reset appearance
        </Btn>
      </TabHeader>

      <PanelGrid>
        {/* ── Theme ── */}
        <Panel
          title="Theme"
          icon={Sun}
          description="Light, dark, or whatever this machine is set to."
        >
          <div className="grid grid-cols-3 gap-[0.5rem]">
            {(
              [
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
                ["system", "System", Monitor],
              ] as const
            ).map(([value, label, Icon]) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    applyThemeMode(value);
                    notify("success", `Theme set to ${label.toLowerCase()}`);
                  }}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-[0.4375rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] p-[0.375rem] text-left transition-colors",
                    active
                      ? "border-da-brand bg-da-brand-soft"
                      : "border-da-border hover:border-da-border-strong",
                  )}
                >
                  <ThemeSwatch variant={value} />
                  <span
                    className={cn(
                      "flex items-center gap-[0.3125rem] px-[0.125rem] text-3xs font-bold uppercase tracking-[0.08em]",
                      active ? "text-da-brand" : "text-da-muted",
                    )}
                  >
                    <Icon className="size-[0.75rem] shrink-0" strokeWidth={2.4} />
                    <span className="truncate">{label}</span>
                    {active && (
                      <Check className="ml-auto size-[0.75rem] shrink-0" strokeWidth={3} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <Note>
            {mode === "system"
              ? "Following this machine's preference — it will switch with the OS while the board is open."
              : "Pinned. This choice overrides the OS preference on this device."}
          </Note>
        </Panel>

        {/* ── Colour ── */}
        <Panel
          title="Colour"
          icon={Palette}
          description="One accent drives buttons, focus rings, active states and gauges."
          action={
            settings.accentPreset === "Custom" ? (
              <Badge tone="info">Custom</Badge>
            ) : undefined
          }
        >
          <Field label="Preset">
            <span className="flex flex-wrap gap-[0.3125rem]">
              {ACCENT_PRESETS.map((preset) => (
                <Chip
                  key={preset.name}
                  active={settings.accentPreset === preset.name}
                  swatch={preset.swatch}
                  onClick={() => applyPreset(preset.name)}
                >
                  {preset.name}
                </Chip>
              ))}
            </span>
          </Field>

          <span className="h-[max(1px,0.0625rem)] bg-da-border" />

          <ColorRow
            label="Accent"
            hint="Primary buttons, links, focus rings, the active section"
            value={settings.colorBrand}
            fallback={TOKEN_FALLBACK.brand}
            onValue={(v) => setColor("brand", v)}
            onReset={() => update({ colorBrand: "auto" })}
          />

          <Field
            label="Status colours"
            hint="Read as a set — the four are only useful in so far as they are distinguishable from each other."
          >
            <span className="grid grid-cols-2 gap-[0.375rem] sm:grid-cols-4">
              <SwatchTile
                label="Success"
                value={settings.colorSuccess}
                fallback={TOKEN_FALLBACK.success}
                onValue={(v) => setColor("success", v)}
                onReset={() => update({ colorSuccess: "auto" })}
              />
              <SwatchTile
                label="Warning"
                value={settings.colorWarn}
                fallback={TOKEN_FALLBACK.warn}
                onValue={(v) => setColor("warn", v)}
                onReset={() => update({ colorWarn: "auto" })}
              />
              <SwatchTile
                label="Danger"
                value={settings.colorDanger}
                fallback={TOKEN_FALLBACK.danger}
                onValue={(v) => setColor("danger", v)}
                onReset={() => update({ colorDanger: "auto" })}
              />
              <SwatchTile
                label="Info"
                value={settings.colorInfo}
                fallback={TOKEN_FALLBACK.info}
                onValue={(v) => setColor("info", v)}
                onReset={() => update({ colorInfo: "auto" })}
              />
            </span>
          </Field>

          <span className="flex flex-wrap items-center gap-[0.4375rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle px-[0.625rem] py-[0.5rem]">
            <span className="inline-flex h-[1.625rem] items-center rounded-[0.25rem] bg-da-brand px-[0.625rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-on-brand shadow-da-brand">
              Primary
            </span>
            <Badge tone="ok">Nominal</Badge>
            <Badge tone="warn">Degraded</Badge>
            <Badge tone="error">Fault</Badge>
            <Badge tone="info">Advisory</Badge>
          </span>
        </Panel>

        {/* ── Chart series ── */}
        <Panel
          title="Chart series"
          icon={BarChart3}
          description="The eight-colour ramp behind every graph on the archival board."
        >
          <Segmented<ChartPalette>
            value={settings.chartPalette}
            onValue={(v) => update({ chartPalette: v })}
            options={[
              { value: "default", label: "Theme" },
              { value: "colorblind", label: "Okabe–Ito" },
              { value: "monochrome", label: "Mono" },
            ]}
          />

          {/* Shown as a chart, not as a paint chip strip: what matters about a
              series ramp is whether eight bars stay apart, side by side. */}
          <span className="flex h-[4.25rem] items-end gap-[0.25rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle p-[0.5rem]">
            {[0.62, 1, 0.45, 0.78, 0.9, 0.55, 0.7, 0.35].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-[0.1875rem]"
                style={{ height: `${h * 100}%`, background: palette[i] }}
              />
            ))}
          </span>

          <Note>
            Okabe–Ito is the eight-colour qualitative set that stays separable
            under the three common forms of colour blindness.
          </Note>
        </Panel>

        {/* ── Layout ── */}
        <Panel
          title="Layout"
          icon={Zap}
          description="The board is drawn in rem and scales whole. These move all of it at once."
        >
          <Field
            label="Interface scale"
            hint="Multiplies the board's own viewport-derived scale. 1.00 is the design canvas."
          >
            <Slider
              value={settings.uiScale}
              onValue={(v) => update({ uiScale: v })}
              min={0.75}
              max={1.5}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
            />
          </Field>

          <Field label="Corner radius">
            <span className="grid grid-cols-3 gap-[0.375rem]">
              {(
                [
                  ["square", "Square", "0.125rem"],
                  ["default", "Default", "0.375rem"],
                  ["round", "Round", "0.625rem"],
                ] as const
              ).map(([value, label, radius]) => {
                const active = settings.radius === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ radius: value as RadiusSetting })}
                    className={cn(
                      "flex h-[2.75rem] cursor-pointer flex-col items-center justify-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] transition-colors",
                      active
                        ? "border-da-brand bg-da-brand-soft text-da-brand"
                        : "border-da-border text-da-muted hover:border-da-border-strong",
                    )}
                  >
                    {/* The choice, drawn at the size it will actually appear. */}
                    <span
                      className="size-[0.875rem] border-[max(1px,0.0625rem)] border-current"
                      style={{ borderRadius: radius }}
                    />
                    <span className="text-3xs font-bold uppercase tracking-[0.08em]">
                      {label}
                    </span>
                  </button>
                );
              })}
            </span>
          </Field>

          <Field
            label="Motion"
            hint="Reduced also switches off the sign-in screen's sweep and drift."
          >
            <Segmented
              value={settings.motion}
              onValue={(v) => update({ motion: v })}
              options={[
                { value: "full", label: "Full" },
                { value: "reduced", label: "Reduced" },
              ]}
            />
          </Field>
        </Panel>

        {/* ── Typography ── */}
        <Panel
          title="Typography"
          icon={Type}
          description="Two families: one for the interface, one for every figure and identifier."
        >
          <Field label="Interface family">
            <SelectInput
              value={settings.fontSans}
              onValue={(v) => update({ fontSans: v })}
              options={FONT_SANS_OPTIONS}
            />
          </Field>
          <Field
            label="Figures and identifiers"
            hint="Timestamps, sizes, IDs, coordinates — anything read as a measurement."
          >
            <SelectInput
              value={settings.fontMono}
              onValue={(v) => update({ fontMono: v })}
              options={FONT_MONO_OPTIONS}
            />
          </Field>

          <span className="flex flex-col gap-[0.375rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle p-[0.75rem]">
            <span className="text-3xs font-bold uppercase tracking-[0.1em] text-da-label">
              Preview
            </span>
            <span className="text-md font-bold tracking-[-0.01em] text-da-text">
              Recent archived data
            </span>
            <span className="text-2xs font-medium leading-[1.5] text-da-muted">
              Telemetry from the primary array, held at the station and mirrored
              to the remote vault every six hours.
            </span>
            <span className="da-nums font-mono text-2xs font-bold text-da-text">
              20 May 2025 18:42:31 · 2.45 GB · TRACK-284
            </span>
          </span>
        </Panel>
      </PanelGrid>
    </>
  );
}
