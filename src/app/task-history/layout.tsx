import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { SchedulerShell } from "@/features/scheduler";

export const metadata: Metadata = {
  title: "Task History — DATS",
  description: "Completed satellite pass log, issues and compliance records.",
};

export default function TaskHistoryLayout({ children }: LayoutProps<"/task-history">) {
  return (
    <AuthGuard>
      <SchedulerShell>{children}</SchedulerShell>
    </AuthGuard>
  );
}
