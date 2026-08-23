import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { ManualArchivalDialog } from "./ManualArchivalDialog";
import { StatusFooterBar } from "./StatusFooterBar";
import { TabBar } from "./TabBar";

export function DataArchivalShell({ children }: { children: ReactNode }) {
  return (
    <div className="dats-archival flex h-[100dvh] flex-col overflow-hidden bg-da-bg text-da-text">
      <AppHeader />
      <TabBar />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      <StatusFooterBar />
      <ManualArchivalDialog />
    </div>
  );
}
