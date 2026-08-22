import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";
import { DataArchivalShell } from "@/features/data-archival";

export const metadata: Metadata = {
  title: "Data Archival — DATS",
  description: "All logs, data, tasks and alerts.",
};

export default function DataArchivalLayout({ children }: LayoutProps<"/data-archival">) {
  return (
    <AuthGuard>
      <DataArchivalShell>{children}</DataArchivalShell>
    </AuthGuard>
  );
}
