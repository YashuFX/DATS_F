/**
 * Public surface of the Dome Monitor module.
 *
 * Same shape as the other features: a host imports the shell and the screen,
 * and nothing outside this folder is referenced except theme tokens and shared
 * primitives.
 */

export { DomeShell } from "./components/DomeShell";
export { DomeScreen } from "./components/DomeScreen";
export { ScreenFallback } from "./components/ScreenFallback";

export { PRESENT_FACES, ALL_FACES, FACE_MAP, ADJACENCY } from "./data/geometry";
export { MOCK_TELEMETRY } from "./data/telemetry.mock";
export { useDomeStore } from "./store/domeStore";

export * from "./types";
