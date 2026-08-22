"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, readTheme } from "@/lib/theme";

/**
 * Light/dark switch for the header rail.
 *
 * Which glyph shows is decided by CSS, not by React state: both icons render
 * and the `dark:` variant hides one. That keeps the button free of any
 * client-only value during SSR — there is nothing to mismatch on hydration and
 * nothing to flash — while the click handler drives the DOM attribute the
 * theme actually hangs off.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Switch between light and dark theme"
      title="Toggle theme"
      onClick={() => applyTheme(readTheme() === "dark" ? "light" : "dark")}
      className="flex size-[1.75rem] cursor-pointer items-center justify-center rounded-[0.25rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text"
    >
      <Sun className="hidden size-[0.9375rem] dark:block" strokeWidth={2} />
      <Moon className="size-[0.9375rem] dark:hidden" strokeWidth={2} />
    </button>
  );
}
