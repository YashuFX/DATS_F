import type { Metadata } from "next";
import { TaskHistoryScreen } from "@/features/scheduler";

export const metadata: Metadata = {
  title: "Task History — DATS",
  description: "Completed satellite pass log, issues and compliance records.",
};

export default function TaskHistoryPage() {
  return <TaskHistoryScreen />;
}
