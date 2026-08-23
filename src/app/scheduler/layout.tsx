import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { SchedulerShell } from "@/features/scheduler";

export const metadata: Metadata = {
  title: "Scheduler — DATS",
  description: "Multi-satellite telemetry and tracking pass scheduler.",
};

export default function SchedulerLayout({ children }: LayoutProps<"/scheduler">) {
  return (
    <AuthGuard>
      <SchedulerShell>{children}</SchedulerShell>
    </AuthGuard>
  );
}
