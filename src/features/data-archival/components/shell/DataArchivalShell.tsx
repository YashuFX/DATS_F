import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { StatusFooterBar } from "./StatusFooterBar";
import { TabBar } from "./TabBar";

/**
 * The persistent chrome for every Data Archival tab.
 *
 * Rendered from the route `layout`, so React keeps this subtree mounted across
 * tab navigation — the clock, the countdown, and (once wired) the task timers
 * all keep running instead of resetting on every click.
 *
 * The board is sized to the viewport: the fluid root font-size in
 * `globals.css` scales the whole layout to fit, from a 1366 laptop up to a 4K
 * wall display, so in the ordinary case nothing scrolls.
 *
 * `main` still scrolls rather than clipping, because that scaling has a floor —
 * `clamp(13px, …)` stops shrinking at 13px for legibility, so on a short
 * viewport (a 1366x768 laptop, once browser chrome is taken) the board is
 * genuinely taller than the space available. Clipping there buries the bottom
 * row of every screen with no way to reach it; scrolling keeps it reachable.
 */
export function DataArchivalShell({ children }: { children: ReactNode }) {
  return (
    <div className="dats-archival flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      <AppHeader />
      <TabBar />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <StatusFooterBar />
    </div>
  );
}
