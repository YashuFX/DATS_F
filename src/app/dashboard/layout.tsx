import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { McShell } from "@/features/mnc";

export const metadata: Metadata = {
  title: "Monitoring & Controlling — DATS",
  description:
    "Single-screen operator console: live tracking, array health, schedule and antenna parameters.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <McShell>{children}</McShell>
    </AuthGuard>
  );
}
