import type { Metadata } from "next";
import { AuthShell } from "@/features/auth";

export const metadata: Metadata = {
  title: "Sign in — DATS",
  description: "Authenticate to reach the DATS archival board.",
};

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return <AuthShell>{children}</AuthShell>;
}
