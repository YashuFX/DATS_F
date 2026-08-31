"use client";

import { cn } from "@/features/data-archival/lib/cn";

/** Underline tab rail shared by Health Preview and Parameter Panel. */
export function TabRail<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex shrink-0 items-center gap-[0.25rem] border-b-[max(1px,0.0625rem)] border-da-border px-[0.5rem]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "cursor-pointer border-b-2 px-[0.5rem] py-[0.4375rem] text-2xs font-semibold transition-colors",
            "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--color-da-brand)]",
            active === tab.id
              ? "border-da-brand text-da-text"
              : "border-transparent text-da-muted hover:text-da-text",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
