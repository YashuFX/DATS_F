/**
 * Public surface of the Data Archival module.
 *
 * A host application needs only these exports — drop `src/features/data-archival`
 * into any React 19 + Tailwind v4 project, import the shell and the screen, and
 * the board renders. Nothing outside this folder is referenced except the theme
 * tokens in `globals.css`.
 */

export { DataArchivalShell } from "./components/shell/DataArchivalShell";
export { ArchiveBrowser } from "./components/ArchiveBrowser";
export { TabPlaceholder } from "./components/shell/TabPlaceholder";

// The five secondary screens, one per tab.
export { LogsScreen } from "./components/logs/LogsScreen";
export { TasksScreen } from "./components/tasks/TasksScreen";
export { AlertsScreen } from "./components/alerts/AlertsScreen";
export { ReportsScreen } from "./components/reports/ReportsScreen";
export { ExportsScreen } from "./components/exports/ExportsScreen";

// Chrome, exported individually so a host can compose its own arrangement.
export { AppHeader } from "./components/shell/AppHeader";
export { TabBar } from "./components/shell/TabBar";
export { StatusFooterBar } from "./components/shell/StatusFooterBar";

// Screen sections.
export { FilterPanel } from "./components/filters/FilterPanel";
export { KpiStrip } from "./components/overview/KpiStrip";
export { RecentArchivedTable } from "./components/table/RecentArchivedTable";
export { DistributionCard } from "./components/charts/DistributionCard";
export { StorageCard } from "./components/charts/StorageCard";
export { ActivityCard } from "./components/charts/ActivityCard";
export { ActiveTasksCard } from "./components/rail/ActiveTasksCard";
export { RecentAlertsCard } from "./components/rail/RecentAlertsCard";

// Primitives, reusable across other DATS screens.
export { Card, CardHeader, SectionLabel, FieldLabel } from "./components/ui/Card";
export { Button } from "./components/ui/Button";
export { Badge, PriorityBadge } from "./components/ui/Badge";
export { ProgressBar } from "./components/ui/ProgressBar";
export { StatStrip } from "./components/ui/StatStrip";
export { DataTable, type Column } from "./components/ui/DataTable";
export { TableCard } from "./components/table/TableCard";
export { StatusPill, Dot, Tally, MeterRow } from "./components/ui/StatusBits";
export {
  FilterRail,
  FilterGroup,
  SelectField,
  TextField,
  CheckRow,
  SegmentedField,
  ToggleRow,
  RangeField,
} from "./components/filters/FilterControls";
export { DonutChart, type DonutSlice } from "./components/charts/DonutChart";
export { BarChart } from "./components/charts/BarChart";
export { RadialGauge } from "./components/charts/RadialGauge";
export { AreaChart } from "./components/charts/AreaChart";

export { archivalConfig, TABS, DATA_TYPES, PRIORITIES } from "./config";
export * from "./types";
