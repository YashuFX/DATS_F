import type { Metadata } from "next";
import { SchedulerScreen } from "@/features/scheduler";

export const metadata: Metadata = {
  title: "Scheduler — DATS",
  description: "Multi-satellite telemetry and tracking pass scheduler.",
};

export default function SchedulerPage() {
  return <SchedulerScreen />;
}
