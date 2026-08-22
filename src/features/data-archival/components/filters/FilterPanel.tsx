"use client";

import { Calendar, ChevronDown, Save } from "lucide-react";
import { useState } from "react";
import { LOCATIONS, MISSIONS, PRIORITIES, SOURCES } from "../../config";
import {
  SEED_PRIORITY_FACETS,
  SEED_TOTAL_RECORDS,
  SEED_TYPE_FACETS,
} from "../../data/seed";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import type { DataTypeId, PriorityId } from "../../types";
import { Button } from "../ui/Button";
import { FieldLabel } from "../ui/Card";

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[0.4375rem]">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function SelectField({ options }: { options: readonly string[] }) {
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

function CheckRow({
  label,
  count,
  checked,
  onToggle,
  swatch,
  labelColor,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
  /** Theme token name (no `--color-` prefix) for the checkbox fill. */
  swatch?: string;
  /** Theme token name (no `--color-` prefix) for the label text. */
  labelColor?: string;
}) {
  return (
    <label className="flex h-[1.125rem] cursor-pointer select-none items-center gap-[0.375rem]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-[0.6875rem] shrink-0 items-center justify-center rounded-[0.125rem] border-[max(1px,0.0625rem)] transition-colors",
          checked
            ? "border-transparent"
            : "border-da-border-strong bg-da-field",
        )}
        style={
          checked
            ? { backgroundColor: `var(--color-${swatch ?? "da-brand"})` }
            : undefined
        }
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
        style={labelColor ? { color: `var(--color-${labelColor})` } : undefined}
      >
        {label}
      </span>
      <span className="da-nums text-3xs font-semibold text-da-label">
        {formatNumber(count)}
      </span>
    </label>
  );
}

export function FilterPanel() {
  const [types, setTypes] = useState<DataTypeId[]>([]);
  const [priorities, setPriorities] = useState<PriorityId[]>([]);

  const allTypes = types.length === 0;

  const toggleType = (id: DataTypeId) =>
    setTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );

  const togglePriority = (id: PriorityId) =>
    setPriorities((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const reset = () => {
    setTypes([]);
    setPriorities([]);
  };

  return (
    /* Fits without scrolling at 1440x878 and every larger display, including
       4K. Below roughly 730px of viewport height the 13px legibility floor in
       globals.css stops the board shrinking any further, so the panel scrolls
       rather than clipping its last filter group. */
    <aside className="da-card h-full min-h-0 overflow-y-auto">
      <header className="flex h-[2.125rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border px-[0.75rem]">
        <span className="text-2xs font-bold uppercase tracking-[0.07em] text-da-text">
          Filters
        </span>
        <Button variant="link" onClick={reset}>
          Reset
        </Button>
      </header>

      {/* Group rhythm is 0.625rem, not 0.75rem: at 0.75 the eight filter groups
          overrun the panel by a few pixels and raise a scrollbar. */}
      <div className="flex flex-col gap-[0.625rem] px-[0.75rem] py-[0.625rem]">
        <Group label="Date Range">
          <div className="flex h-[1.75rem] items-center gap-[0.375rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field px-[0.5rem]">
            <span className="da-nums flex-1 truncate text-[0.5625rem] font-medium text-da-text">
              18/05/2025 00:00 - 26/05/2025 23:59
            </span>
            <Calendar className="size-[0.75rem] shrink-0 text-da-label" strokeWidth={2} />
          </div>
        </Group>

        <Group label="Data Type">
          <div className="flex flex-col gap-[0.25rem]">
            <CheckRow
              label="All Types"
              count={SEED_TOTAL_RECORDS}
              checked={allTypes}
              onToggle={() => setTypes([])}
            />
            {SEED_TYPE_FACETS.map((facet) => (
              <CheckRow
                key={facet.id}
                label={facet.label}
                count={facet.count}
                checked={types.includes(facet.id)}
                onToggle={() => toggleType(facet.id)}
              />
            ))}
          </div>
        </Group>

        <Group label="Source">
          <SelectField options={SOURCES} />
        </Group>

        <Group label="Mission / Task">
          <SelectField options={MISSIONS} />
        </Group>

        <Group label="Data Priority">
          <div className="flex flex-col gap-[0.25rem]">
            {SEED_PRIORITY_FACETS.map((facet) => {
              const meta = PRIORITIES.find((p) => p.id === facet.id)!;
              return (
                <CheckRow
                  key={facet.id}
                  label={facet.label}
                  count={facet.count}
                  checked={priorities.includes(facet.id)}
                  onToggle={() => togglePriority(facet.id)}
                  swatch={meta.color}
                  labelColor={meta.color}
                />
              );
            })}
          </div>
        </Group>

        <Group label="Storage Location">
          <SelectField options={LOCATIONS} />
        </Group>

        <div className="mt-[0.125rem] flex flex-col gap-[0.375rem]">
          <Button className="w-full">Apply Filters</Button>
          <Button
            variant="ghost"
            className="w-full"
            icon={<Save className="size-[0.75rem]" strokeWidth={2.2} />}
          >
            Save Filter Set
          </Button>
        </div>
      </div>
    </aside>
  );
}
