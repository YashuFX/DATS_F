"use client";

import { RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * The settings screen's vocabulary.
 *
 * Every control here is drawn from the board's existing tokens and the same
 * rem-based sizing as the consoles, so the settings screen scales with the rest
 * of the application instead of being a fixed-pixel island inside a board that
 * grows to 4K. Nothing declares a colour literal.
 */

/* ── page header ──────────────────────────────────────────────────────── */

export function TabHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-[1rem] flex flex-wrap items-start justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border pb-[0.75rem]">
      <div className="min-w-0">
        <h2 className="text-md font-bold tracking-[-0.01em] text-da-text">
          {title}
        </h2>
        <p className="mt-[0.25rem] text-2xs font-medium leading-[1.5] text-da-muted">
          {description}
        </p>
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-[0.375rem]">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── layout ───────────────────────────────────────────────────────────── */

/**
 * The panel container.
 *
 * A CSS multi-column flow rather than a grid, and that is the whole point: a
 * two-column *grid* aligns rows, so a 3rem panel beside a 30rem one leaves 27rem
 * of empty board — which is exactly what this screen used to do. Columns pack
 * instead, and the browser balances the two heights for us, so every panel sits
 * directly under the one above it whatever its neighbour is doing.
 *
 * `break-inside-avoid` keeps a panel whole; without it a column boundary would
 * cut one in half.
 */
export function PanelGrid({ children }: { children: ReactNode }) {
  return (
    <div className="columns-1 gap-[0.875rem] xl:columns-2 [&>*]:mb-[0.875rem] [&>*]:break-inside-avoid">
      {children}
    </div>
  );
}

/* ── panel ────────────────────────────────────────────────────────────── */

export function Panel({
  title,
  icon: Icon,
  description,
  className,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  description: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn("da-card flex flex-col", className)}>
      <header className="flex shrink-0 items-start gap-[0.5rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.875rem] py-[0.625rem]">
        <span className="flex size-[1.75rem] shrink-0 items-center justify-center rounded-[0.25rem] bg-da-subtle text-da-muted">
          <Icon className="size-[0.875rem]" strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="text-2xs font-bold uppercase tracking-[0.1em] text-da-text">
            {title}
          </span>
          <span className="mt-[0.3125rem] text-2xs font-medium leading-[1.4] text-da-muted">
            {description}
          </span>
        </span>
        {action && <span className="shrink-0">{action}</span>}
      </header>
      <div className="flex flex-col gap-[0.75rem] px-[0.875rem] py-[0.75rem]">
        {children}
      </div>
    </section>
  );
}

/* ── field + rows ─────────────────────────────────────────────────────── */

/**
 * The id a `Field` minted, offered to whichever control it wraps.
 *
 * The label is associated by `htmlFor` rather than by wrapping the control,
 * because several fields on this screen hold things that are themselves labels
 * — a row of colour swatches, a radio group of buttons — and a label nested
 * inside a label is invalid markup that browsers resolve by guessing.
 */
const FieldIdContext = createContext<string | undefined>(undefined);

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-[0.3125rem]", className)}>
      <label
        htmlFor={id}
        className="text-2xs font-bold uppercase tracking-[0.08em] text-da-muted"
      >
        {label}
      </label>
      <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>
      {hint && (
        <span className="text-3xs font-medium leading-[1.5] text-da-label">
          {hint}
        </span>
      )}
    </div>
  );
}

export function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.4375rem] last:border-b-0 last:pb-0">
      <span className="text-2xs font-medium text-da-muted">{label}</span>
      <span className="da-nums shrink-0 text-2xs font-bold text-da-text">
        {value}
      </span>
    </span>
  );
}

/* ── inputs ───────────────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] py-[0.375rem] text-2xs font-medium text-da-text outline-none transition-colors placeholder:text-da-label focus:border-da-brand";

export function TextInput({
  mono,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  const fieldId = useContext(FieldIdContext);
  return (
    <input
      id={props.id ?? fieldId}
      {...props}
      className={cn(fieldBase, mono && "da-nums font-mono", className)}
    />
  );
}

export function NumberInput({
  value,
  onValue,
  min,
  max,
  step = 1,
  suffix,
  className,
}: {
  value: number;
  onValue: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  const fieldId = useContext(FieldIdContext);
  return (
    <span className={cn("relative flex items-center", className)}>
      <input
        id={fieldId}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isNaN(next)) return;
          const clamped = Math.min(
            max ?? Number.POSITIVE_INFINITY,
            Math.max(min ?? Number.NEGATIVE_INFINITY, next),
          );
          onValue(clamped);
        }}
        className={cn(fieldBase, "da-nums font-mono", suffix && "pr-[2.5rem]")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-[0.5rem] text-3xs font-bold uppercase tracking-[0.08em] text-da-label">
          {suffix}
        </span>
      )}
    </span>
  );
}

export function SelectInput({
  value,
  onValue,
  options,
  className,
}: {
  value: string;
  onValue: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}) {
  const fieldId = useContext(FieldIdContext);
  return (
    <select
      id={fieldId}
      value={value}
      onChange={(e) => onValue(e.target.value)}
      className={cn(fieldBase, "cursor-pointer appearance-none pr-[1.5rem]", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239aa4b2'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.5rem center",
        backgroundSize: "0.5rem 0.3125rem",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── switch ───────────────────────────────────────────────────────────── */

/**
 * The switch, on its own.
 *
 * Its wrapper is the track's own box — sized, and the only positioning context.
 * The checkbox is taken out of flow rather than shrunk to zero: left in flow it
 * pushes the knob onto a line of its own, above the track it is supposed to be
 * sitting in.
 */
export function Switch({
  id,
  checked,
  disabled,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  /** Only needed where no visible label points at this control. */
  label?: string;
}) {
  return (
    <span
      className={cn(
        "relative block h-[1.125rem] w-[2rem] shrink-0",
        disabled && "opacity-45",
      )}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
      />
      <span className="pointer-events-none absolute inset-0 rounded-full border-[max(1px,0.0625rem)] border-da-border bg-da-subtle transition-colors peer-checked:border-da-brand peer-checked:bg-da-brand peer-focus-visible:ring-[0.125rem] peer-focus-visible:ring-da-brand/40" />
      <span className="pointer-events-none absolute left-[0.1875rem] top-[0.1875rem] size-[0.75rem] rounded-full bg-da-border-strong shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[transform,background-color] peer-checked:translate-x-[0.875rem] peer-checked:bg-da-on-brand" />
    </span>
  );
}

/* ── toggle ───────────────────────────────────────────────────────────── */

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-[0.75rem] border-b-[max(1px,0.0625rem)] border-da-border/60 pb-[0.5rem] last:border-b-0 last:pb-0",
        disabled && "opacity-45",
      )}
    >
      <label htmlFor={id} className="flex min-w-0 cursor-pointer flex-col">
        <span className="text-2xs font-bold text-da-text">{label}</span>
        {hint && (
          <span className="mt-[0.1875rem] text-3xs font-medium leading-[1.4] text-da-muted">
            {hint}
          </span>
        )}
      </label>
      <Switch id={id} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/* ── chips + segmented ────────────────────────────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.5rem] py-[0.3125rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors",
        active
          ? "border-da-brand bg-da-brand-soft text-da-brand"
          : "border-da-border text-da-muted hover:border-da-brand hover:text-da-text",
      )}
    >
      {swatch && (
        <span
          className="size-[0.625rem] shrink-0 rounded-full border-[max(1px,0.0625rem)] border-da-border"
          style={{ background: swatch }}
        />
      )}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onValue,
  options,
  className,
}: {
  value: T;
  onValue: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn("grid gap-[0.375rem]", className)}
      /* Column count follows the option count, which Tailwind cannot know at
         build time — so it is set here rather than as a `grid-cols-*` class. */
      style={
        className
          ? undefined
          : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onValue(o.value)}
          className={cn(
            "flex h-[2rem] cursor-pointer items-center justify-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.375rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors",
            value === o.value
              ? "border-da-brand bg-da-brand-soft text-da-brand"
              : "border-da-border text-da-muted hover:border-da-brand hover:text-da-text",
          )}
        >
          {o.icon && <o.icon className="size-[0.8125rem]" strokeWidth={2.2} />}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── slider ───────────────────────────────────────────────────────────── */

export function Slider({
  value,
  onValue,
  min,
  max,
  step,
  format,
}: {
  value: number;
  onValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
}) {
  return (
    <span className="flex flex-col gap-[0.25rem]">
      <span className="flex items-center gap-[0.625rem]">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValue(Number(e.target.value))}
          className="h-[0.25rem] min-w-0 flex-1 cursor-pointer accent-da-brand"
        />
        <span className="da-nums w-[3.25rem] shrink-0 text-right text-2xs font-bold text-da-brand">
          {format(value)}
        </span>
      </span>
      {/* The travel is worth naming: a slider with no end labels asks the
          operator to drag it to both extremes to find out what it does. */}
      <span className="da-nums flex justify-between pr-[3.875rem] font-mono text-3xs text-da-label">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </span>
    </span>
  );
}

/* ── colour ───────────────────────────────────────────────────────────── */

/**
 * A colour the operator can take over from the theme.
 *
 * Three states in one control rather than four separate widgets: the swatch is
 * the picker, the hex is the readout *and* the typed entry, and the reset only
 * exists once there is something to reset. The earlier version showed a field
 * reading "auto" beside a button reading "AUTO", which is two controls arguing
 * about which one is the answer.
 */
export function ColorRow({
  label,
  hint,
  value,
  fallback,
  onValue,
  onReset,
}: {
  label: string;
  hint: string;
  /** `"auto"` means the theme's own token is in charge. */
  value: string;
  /** Swatch shown while the value is `"auto"`. */
  fallback: string;
  onValue: (hex: string) => void;
  onReset: () => void;
}) {
  const isAuto = value === "auto";
  const shown = isAuto ? fallback : value;
  return (
    <div className="flex items-center gap-[0.625rem]">
      <label
        className="relative size-[2.25rem] shrink-0 cursor-pointer overflow-hidden rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border-strong"
        style={{ background: shown }}
        title="Pick a colour"
      >
        <input
          type="color"
          value={shown}
          onChange={(e) => onValue(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-2xs font-bold text-da-text">{label}</span>
        <span className="mt-[0.1875rem] text-3xs font-medium leading-[1.4] text-da-muted">
          {hint}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-[0.25rem]">
        <input
          type="text"
          spellCheck={false}
          maxLength={7}
          value={isAuto ? "AUTO" : value.toUpperCase()}
          onChange={(e) => {
            const next = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onValue(next);
          }}
          className={cn(
            "da-nums w-[4.75rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.375rem] py-[0.3125rem] text-center font-mono text-3xs font-bold uppercase outline-none focus:border-da-brand",
            isAuto ? "text-da-label" : "text-da-text",
          )}
        />
        {/* Only offered once there is an override to undo. */}
        <button
          type="button"
          onClick={onReset}
          className={cn(
            "flex size-[1.625rem] items-center justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] transition-colors",
            isAuto
              ? "pointer-events-none border-transparent opacity-0"
              : "cursor-pointer border-da-border text-da-muted hover:border-da-brand hover:text-da-brand",
          )}
          title="Hand this colour back to the theme"
          aria-label={`Reset ${label} to the theme colour`}
        >
          <RotateCcw className="size-[0.6875rem]" strokeWidth={2.4} />
        </button>
      </span>
    </div>
  );
}

/**
 * The compact form, for colours that are read as a set.
 *
 * Four semantic colours as four full rows was most of the height of the
 * Appearance tab and none of its meaning — they are chosen by comparison with
 * each other, so they are shown as a strip you can compare.
 */
export function SwatchTile({
  label,
  value,
  fallback,
  onValue,
  onReset,
}: {
  label: string;
  value: string;
  fallback: string;
  onValue: (hex: string) => void;
  onReset: () => void;
}) {
  const isAuto = value === "auto";
  const shown = isAuto ? fallback : value;
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border">
      <label
        className="relative block h-[1.875rem] cursor-pointer"
        style={{ background: shown }}
        title={`Pick the ${label.toLowerCase()} colour`}
      >
        <input
          type="color"
          value={shown}
          onChange={(e) => onValue(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <span className="flex items-center justify-between gap-[0.25rem] bg-da-subtle px-[0.4375rem] py-[0.375rem]">
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-3xs font-bold uppercase tracking-[0.08em] text-da-text">
            {label}
          </span>
          <span className="da-nums mt-[0.25rem] font-mono text-3xs font-medium text-da-muted">
            {isAuto ? "auto" : value.toUpperCase()}
          </span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className={cn(
            "shrink-0 transition-colors",
            isAuto
              ? "pointer-events-none opacity-0"
              : "cursor-pointer text-da-label hover:text-da-brand",
          )}
          title="Hand this colour back to the theme"
          aria-label={`Reset ${label} to the theme colour`}
        >
          <RotateCcw className="size-[0.6875rem]" strokeWidth={2.4} />
        </button>
      </span>
    </div>
  );
}

/* ── buttons + badges ─────────────────────────────────────────────────── */

export function Btn({
  variant = "secondary",
  icon: Icon,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  icon?: LucideIcon;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-[2rem] items-center justify-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] px-[0.6875rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors enabled:cursor-pointer disabled:opacity-40",
        variant === "primary" &&
          "border-da-brand bg-da-brand text-da-on-brand shadow-da-brand enabled:hover:bg-da-brand-hover enabled:hover:border-da-brand-hover",
        variant === "secondary" &&
          "border-da-border text-da-muted enabled:hover:border-da-brand enabled:hover:text-da-brand",
        variant === "danger" &&
          "border-da-border text-da-muted enabled:hover:border-da-danger enabled:hover:text-da-danger",
        className,
      )}
    >
      {Icon && <Icon className="size-[0.75rem]" strokeWidth={2.4} />}
      {children}
    </button>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "error" | "info" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.25rem] rounded-[0.1875rem] px-[0.375rem] py-[0.1875rem] text-3xs font-bold uppercase tracking-[0.08em]",
        tone === "ok" && "bg-da-success-soft text-da-success",
        tone === "warn" && "bg-da-warn-soft text-da-warn-text",
        tone === "error" && "bg-da-danger-soft text-da-danger",
        tone === "info" && "bg-da-info-soft text-da-info",
        tone === "muted" && "bg-da-subtle text-da-muted",
      )}
    >
      {children}
    </span>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="text-3xs font-medium leading-[1.5] text-da-label">{children}</p>
  );
}
