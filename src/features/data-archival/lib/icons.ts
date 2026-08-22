import {
  Activity,
  BarChart3,
  Database,
  FileCog,
  FileText,
  ListChecks,
  Radio,
  ScrollText,
  ServerCog,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { DataTypeId } from "../types";

/** Icon shown in the table's DATA TYPE cell, one per archived data class. */
export const DATA_TYPE_ICON: Record<DataTypeId, LucideIcon> = {
  telemetry: Radio,
  waveform: Activity,
  scheduler: ListChecks,
  system: ServerCog,
  configuration: FileCog,
  calibration: Target,
  reports: FileText,
};

/** Icon keys used by seeded tasks in `data/seed.ts`. */
export const TASK_ICON: Record<string, LucideIcon> = {
  "file-text": FileText,
  activity: Activity,
  list: ScrollText,
  target: Target,
  "bar-chart": BarChart3,
  database: Database,
};
