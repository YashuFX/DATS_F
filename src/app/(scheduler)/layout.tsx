import type { ReactNode } from "react";
import { AuthGuard } from "@/features/auth";
import { SchedulerShell } from "@/features/scheduler";

/**
 * Shared chrome for the scheduler section.
 *
 * `/scheduler` and `/task-history` sit in one route group specifically so they
 * share this layout instance. Next keeps a shared layout mounted across a
 * navigation between its children, which is what lets `SchedulerRuntime` — the
 * clock and the archive watch, inside the shell — keep running when you move
 * between the two screens. With a layout per route the runtime would be torn
 * down and rebuilt on every navigation, and Task History would only ever gain
 * records while you were looking at the timeline instead.
 *
 * Typed with a plain prop rather than `LayoutProps`: a route group has no URL
 * segment of its own, so it never appears in Next's generated `LayoutRoutes`.
 */
export default function SchedulerSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <SchedulerShell>{children}</SchedulerShell>
    </AuthGuard>
  );
}
