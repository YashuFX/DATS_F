import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { DomeShell } from "@/features/dome-monitor";

export const metadata: Metadata = {
  title: "Dome Array — DATS",
  description: "3D operational dashboard for the Must_cord.xlsx geodesic antenna array.",
};

export default function DomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DomeShell>{children}</DomeShell>
    </AuthGuard>
  );
}
