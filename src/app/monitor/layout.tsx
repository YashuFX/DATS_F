import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { MonitorShell } from "@/features/array-monitor";

export const metadata: Metadata = {
  title: "Array Monitor — DATS",
  description: "Subarray tile monitoring for the DATS-09 S-band aperture.",
};

export default function MonitorLayout({ children }: LayoutProps<"/monitor">) {
  return (
    <AuthGuard>
      <MonitorShell>{children}</MonitorShell>
    </AuthGuard>
  );
}
