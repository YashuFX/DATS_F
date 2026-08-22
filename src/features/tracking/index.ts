/**
 * Public surface of the Tracking module.
 *
 * Mirrors `features/data-archival`: a host imports the screen and the provider,
 * and nothing outside this folder is referenced except the shared theme tokens
 * in `globals.css` and `@/lib/theme`.
 */

export { TrackingScreen } from "./components/TrackingScreen";
export { DashboardProvider, useDashboard } from "./context/DashboardContext";
export { ThemeProvider, useTheme } from "./context/ThemeContext";
export type { Satellite, SatId, TrackEvent } from "./context/DashboardContext";
