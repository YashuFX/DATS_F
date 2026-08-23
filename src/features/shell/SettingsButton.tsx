"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/features/data-archival/lib/cn";

/**
 * The settings entry point, carried by every console header.
 *
 * Sized to sit beside `ThemeToggle` — same 1.75rem box, same hover — so the two
 * read as one pair of chrome controls rather than two separately-designed
 * buttons that happen to be adjacent.
 *
 * It remembers where you came from. Settings is a detour, not a destination,
 * and handing it the current path means its back link returns you to the exact
 * console you left instead of dumping you at a section root.
 */
export function SettingsButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const href =
    pathname && !pathname.startsWith("/settings")
      ? `/settings?from=${encodeURIComponent(pathname)}`
      : "/settings";

  return (
    <Link
      href={href}
      title="Settings"
      aria-label="Settings"
      className={cn(
        "flex size-[1.75rem] shrink-0 cursor-pointer items-center justify-center rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border text-da-muted transition-colors hover:border-da-brand hover:text-da-brand",
        className,
      )}
    >
      <Settings className="size-[0.875rem]" strokeWidth={2} />
    </Link>
  );
}
