/**
 * Public surface of the Tracking module.
 *
 * Mirrors `features/data-archival`: a host imports the screen and the provider,
 * and nothing outside this folder is referenced except the shared theme tokens
 * in `globals.css` and `@/lib/theme`.
 *
 * The one deliberate exception is `features/mnc`. This console does not model a
 * sky of its own any more — it reads the same propagator, beam planner and pass
 * search the M&C board does, and shows the same tracking display. That
 * dependency is what stops the two screens disagreeing about where a spacecraft
 * is, and it is confined to `context/DashboardContext`, which is the single
 * seam where the simulation is mapped onto this console's shapes.
 */

export { TrackingScreen } from "./components/TrackingScreen";
export { DashboardProvider, useDashboard } from "./context/DashboardContext";
export { ThemeProvider, useTheme } from "./context/ThemeContext";
export type {
  Satellite,
  SatId,
  TrackEvent,
  BeamReadout,
  ActiveMode,
} from "./context/DashboardContext";
