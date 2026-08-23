import type { Metadata } from "next";
import { AuthGuard } from "@/features/auth";

export const metadata: Metadata = {
  title: "Settings — DATS",
  description: "Appearance, session and stored data.",
};

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return <AuthGuard>{children}</AuthGuard>;
}
