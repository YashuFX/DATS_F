/**
 * Public surface of the Scheduler module (tender J.1).
 *
 * Same shape as the other features here: a host imports the shell and the two
 * screens, and nothing outside this folder is referenced except the theme
 * tokens in `globals.css` and two shared primitives.
 */

export { SchedulerShell } from "./components/SchedulerShell";
export { SchedulerScreen } from "./components/SchedulerScreen";
export { TaskHistoryScreen } from "./components/TaskHistoryScreen";

export {
  ANTENNAS,
  CATALOGUE,
  CONFLICTS,
  HISTORY,
  PASSES,
  SCHEDULE_STATS,
  STATIONS,
  statsFor,
  WINDOW,
} from "./data/schedule";
export { usePassHistoryStore } from "./store/passHistoryStore";
export { useSimStore } from "./store/simStore";
export * from "./types";
