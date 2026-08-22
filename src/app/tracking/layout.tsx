import type { Metadata } from "next";
import { ThemeProvider } from "@/features/tracking";

export const metadata: Metadata = {
  title: "Satellite Tracking — DATS",
  description: "Real-time satellite tracking and rotor/radio control console.",
};

export default function TrackingLayout({ children }: LayoutProps<"/tracking">) {
  return (
    <ThemeProvider>{children}</ThemeProvider>
  );
}
