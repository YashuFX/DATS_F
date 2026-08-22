"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import { Button } from "../ui/Button";
import { FieldLabel } from "../ui/Card";

/**
 * The filter-rail vocabulary, lifted out of the Archive Browser's panel so the
 * LOGS and ALERTS rails are the same object rather than a lookalike: 13.75rem
 * column, 2.125rem header, 0.625rem group rhythm, 1.75rem controls.
 */

export function FilterRail({
  onReset,
  children,
  footer,
}: {
  onReset?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="da-card h-full min-h-0 overflow-y-auto">
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.07em] text-da-text">
          Filters
        </span>
        {onReset && (
          <Button variant="link" onClick={onReset}>
            Reset
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-[0.625rem] px-[0.75rem] py-[0.625rem]">
        {children}
        {footer && <div className="mt-[0.125rem] flex flex-col gap-[0.375rem]">{footer}</div>}
      </div>
    </aside>
  );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[0.4375rem]">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function SelectField({ options }: { options: readonly string[] }) {
  return (
    <div className="relative">
      <select
        className="h-[1.75rem] w-full cursor-pointer appearance-none rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field pl-[0.5rem] pr-[1.5rem] text-2xs font-medium text-da-text focus:border-da-brand focus:outline-none"
        defaultValue={options[0]}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-[0.5rem] top-1/2 size-[0.75rem] -translate-y-1/2 text-da-label"
        strokeWidth={2.2}
      />
    </div>
  );
}

export function TextField({ placeholder }: { placeholder: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="da-nums h-[1.75rem] w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem] text-2xs text-da-text placeholder:text-da-label focus:border-da-brand focus:outline-none"
    />
  );
}

export function CheckRow({
  label,
  count,
  checked,
  onToggle,
  swatch,
  tintLabel = false,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
  /** Token name (no `--color-` prefix) for the box fill. */
  swatch?: string;
  /** Colour the label with `swatch` too — how the priority facets read. */
  tintLabel?: boolean;
}) {
  return (
    <label className="flex h-[1.125rem] cursor-pointer select-none items-center gap-[0.375rem]">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex size-[0.6875rem] shrink-0 items-center justify-center rounded-[0.125rem] border-[max(1px,0.0625rem)] transition-colors",
          checked ? "border-transparent" : "border-da-border-strong bg-da-field",
        )}
        style={checked ? { backgroundColor: `var(--color-${swatch ?? "da-brand"})` } : undefined}
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="size-[0.5rem] text-da-on-brand" fill="none">
            <path
              d="M2 5.2L4 7.2L8 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className="flex-1 truncate text-2xs font-medium text-da-text"
        style={tintLabel && swatch ? { color: `var(--color-${swatch})` } : undefined}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="da-nums text-3xs font-semibold text-da-label">
          {formatNumber(count)}
        </span>
      )}
    </label>
  );
}

/** Row of mutually exclusive pills — ACTIVE / ACK / RESOLVED on the alerts rail. */
export function SegmentedField({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex h-[1.75rem] items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border p-[0.125rem]">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-full flex-1 cursor-pointer truncate rounded-[0.1875rem] text-3xs font-bold uppercase tracking-[0.04em] transition-colors",
            o === value
              ? "bg-da-brand text-da-on-brand"
              : "text-da-muted hover:bg-da-subtle hover:text-da-text",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-[1.75rem] cursor-pointer items-center justify-between rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem] text-2xs font-medium text-da-text transition-colors hover:bg-da-subtle"
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "flex h-[0.875rem] w-[1.625rem] items-center rounded-full p-[0.125rem] transition-colors",
          checked ? "bg-da-success" : "bg-da-border-strong",
        )}
      >
        <span
          className={cn(
            "size-[0.625rem] rounded-full bg-white transition-transform",
            checked && "translate-x-[0.75rem]",
          )}
        />
      </span>
    </button>
  );
}

/** The compact date-range readout used at the top of every rail. */
export function RangeField({ value, icon }: { value: string; icon: ReactNode }) {
  return (
    <div className="flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border px-[0.5rem]">
      <span className="da-nums flex-1 truncate text-[0.5625rem] font-medium text-da-text">
        {value}
      </span>
      {icon}
    </div>
  );
}
