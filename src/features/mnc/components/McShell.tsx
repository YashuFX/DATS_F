"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, CircleHelp, Settings, UploadCloud, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { BrandMark } from "@/features/shell/BrandMark";
import { OperatorChip } from "@/features/shell/OperatorChip";
import { RunControl } from "./RunControl";
import { UplinkPopover } from "./UplinkPopover";

/** Square icon button used across the header's right rail. */
function IconButton({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Bell;
  label: string;
  href?: string;
}) {
  const className =
    "flex size-[1.875rem] cursor-pointer items-center justify-center rounded-[0.375rem] text-da-muted transition-colors hover:bg-da-subtle hover:text-da-text focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]";
  const inner = <Icon className="size-[0.9375rem]" strokeWidth={2.1} />;
  return href ? (
    <Link href={href} aria-label={label} title={label} className={className}>{inner}</Link>
  ) : (
    <button type="button" aria-label={label} title={label} className={className}>{inner}</button>
  );
}

/**
 * Chrome for the M&C console.
 *
 * Identity left, controls right, and deliberately nothing in the middle: the
 * screen's title used to sit there, centred on the viewport. It was removed
 * because a wall-mounted console does not need to caption itself — the operator
 * knows which room they are standing in — and the space it occupied is the
 * only slack the header has for the identity block and the control rail to
 * grow into at narrow widths.
 */
export function McShell({ children }: { children: ReactNode }) {
  const [uplinkOpen, setUplinkOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      <header className="relative z-30 flex h-[3.5rem] shrink-0 items-center justify-between gap-[1rem] border-b-[max(1px,0.0625rem)] border-da-border bg-da-chrome px-[0.875rem]">
        <BrandMark href={null} section="Monitoring and Control" />

        <div className="flex shrink-0 items-center gap-[0.375rem]">
          <OperatorChip />

          <IconButton icon={Bell} label="Alerts" href="/data-archival/alerts" />
          <IconButton icon={CircleHelp} label="Help" />
          <IconButton icon={Settings} label="Settings" href="/settings" />

          <span aria-hidden className="mx-[0.25rem] h-[1.5rem] w-[max(1px,0.0625rem)] bg-da-border" />

          {/* Anchor for the popover: it positions against this wrapper, so
              it stays pinned to the icon at any header width instead of
              needing a measured screen coordinate. */}
          <span className="relative" data-uplink-anchor>
            <button
              type="button"
              onClick={() => setUplinkOpen((open) => !open)}
              aria-label="Uplink activity"
              title="Uplink activity"
              aria-expanded={uplinkOpen}
              aria-haspopup="dialog"
              className={cn(
                "flex size-[1.875rem] cursor-pointer items-center justify-center rounded-[0.375rem] transition-colors",
                "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]",
                uplinkOpen ? "bg-da-brand text-da-on-brand" : "text-da-muted hover:bg-da-subtle hover:text-da-text",
              )}
            >
              <UploadCloud className="size-[0.9375rem]" strokeWidth={2.1} />
            </button>
            {uplinkOpen && <UplinkPopover onClose={() => setUplinkOpen(false)} />}
          </span>
          <IconButton icon={ShieldCheck} label="Safety interlocks" />
          <IconButton icon={SlidersHorizontal} label="Console configuration" />

          <RunControl />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
