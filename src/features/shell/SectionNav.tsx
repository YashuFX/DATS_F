"use client";

import { Compass, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { SECTIONS, sectionFor } from "./sections";

/**
 * SECTION NAV — the compass.
 *
 * A circle at the bottom of every screen that expands into the four sections
 * and collapses back. Ported from the reference app's footer nav, which is the
 * same idea: navigation that costs one puck of screen until you want it, rather
 * than a permanent rail taxing every console for the few seconds a shift spends
 * switching sections.
 *
 * Rebuilt without framer-motion. The reference animated it with layout
 * transitions; this is two absolutely-positioned states cross-fading with CSS,
 * which needs no dependency and — because both states are always mounted — has
 * no layout thrash when it opens.
 *
 * Collapsed by default. It floats over live consoles, so anything that has to
 * be dismissed before you can read the screen underneath is the wrong default.
 */
export function SectionNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = sectionFor(pathname);

  /*
   * Close on route change — you asked for a section, you got it.
   *
   * Done during render rather than in an effect: React's documented way to
   * reset state on a changing input, and it means the bar is already closed on
   * the first frame of the new screen instead of closing one frame into it.
   */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  /* Escape closes it, like any other transient overlay. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auth screens have nothing to navigate between, and the settings screen
  // reaches everything through its own back link.
  if (pathname.startsWith("/auth")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[1rem] z-40 flex justify-center">
      <div className="relative flex items-center justify-center">
        {/* Collapsed puck */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open section navigation"
          aria-expanded={open}
          className={cn(
            "pointer-events-auto flex size-[2.75rem] items-center justify-center rounded-full border-[max(1px,0.0625rem)] border-da-border bg-da-chrome text-da-muted shadow-da-lg backdrop-blur-[0.125rem] transition-all duration-200",
            open
              ? "pointer-events-none scale-90 opacity-0"
              : "cursor-pointer opacity-100 hover:border-da-brand hover:text-da-brand",
          )}
        >
          <Compass className="size-[1.125rem]" strokeWidth={2} />
        </button>

        {/* Expanded bar */}
        <nav
          aria-label="Sections"
          className={cn(
            "absolute bottom-0 flex items-center gap-[0.25rem] rounded-[1.5rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome p-[0.375rem] shadow-da-lg backdrop-blur-[0.125rem] transition-all duration-200",
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0",
          )}
        >
          {SECTIONS.map((section) => {
            const isActive = section.id === active?.id;
            return (
              <Link
                key={section.id}
                href={section.href}
                title={section.blurb}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-[2rem] items-center gap-[0.4375rem] rounded-[1rem] px-[0.875rem] text-3xs font-bold uppercase tracking-[0.08em] transition-colors",
                  isActive
                    ? "bg-da-brand text-da-on-brand shadow-da-brand"
                    : "text-da-muted hover:bg-da-subtle hover:text-da-text",
                )}
              >
                <section.icon
                  className="size-[0.8125rem] shrink-0"
                  strokeWidth={2.2}
                />
                {section.label}
              </Link>
            );
          })}

          <span className="mx-[0.125rem] h-[1.25rem] w-[max(1px,0.0625rem)] shrink-0 bg-da-border" />

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close section navigation"
            className="flex size-[2rem] cursor-pointer items-center justify-center rounded-full text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
          >
            <X className="size-[0.875rem]" strokeWidth={2.4} />
          </button>
        </nav>
      </div>
    </div>
  );
}
