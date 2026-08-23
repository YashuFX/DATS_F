"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { TABS } from "../../config";
import { cn } from "../../lib/cn";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-[2.75rem] shrink-0 items-center justify-between border-b-[max(1px,0.0625rem)] border-da-border bg-da-surface px-[0.875rem]">
      <ul className="flex h-full items-stretch gap-[1.375rem]">
        {TABS.map((tab) => {
          // The index tab must match exactly; the rest match their own subtree.
          const active =
            tab.href === "/data-archival"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <li key={tab.id} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center text-2xs font-bold uppercase tracking-[0.06em] transition-colors",
                  active ? "text-da-brand" : "text-da-muted hover:text-da-text",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-[max(1px,0.0625rem)] h-[0.125rem] rounded-t-full transition-opacity",
                    active ? "bg-da-brand opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-[0.5rem]">
        <label className="relative flex h-[1.75rem] w-[11.25rem] items-center">
          <Search
            className="pointer-events-none absolute right-[0.5rem] size-[0.8125rem] text-da-label"
            strokeWidth={2}
          />
          <span className="sr-only">Search archive</span>
          <input
            type="search"
            placeholder="Search archive..."
            className="h-full w-full rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-field pl-[0.625rem] pr-[1.75rem] text-2xs text-da-text placeholder:text-da-label focus:border-da-brand focus:outline-none"
          />
        </label>
      </div>
    </nav>
  );
}
