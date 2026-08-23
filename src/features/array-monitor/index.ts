/**
 * Public surface of the Array Monitor module.
 *
 * Same shape as the other features here: a host imports the shell and the
 * screen, and nothing outside this folder is referenced except the theme
 * tokens in `globals.css` and two shared primitives.
 */

export { MonitorShell } from "./components/MonitorShell";
export { ArrayScreen } from "./components/ArrayScreen";
export { ChassisScreen } from "./components/ChassisScreen";
export { RfsocScreen } from "./components/RfsocScreen";
export { InfrastructureScreen } from "./components/InfrastructureScreen";
export { ScreenFallback } from "./components/ScreenFallback";
export { TileCard, HEALTH } from "./components/TileCard";
export { TileDetailRail } from "./components/TileDetailRail";

export { TILES, TILE_MAP, TILE_IDS, ARRAY_TOTALS, THRESHOLDS } from "./data/tiles";
export { buildChassis, chassisTotals, powerRails, CARD_KIND } from "./data/chassis";
export type { SlotCard, CardKind, ChassisTotals } from "./data/chassis";
export { buildBoard, boardTelemetry, RFSOC_SLOTS } from "./data/rfsoc";
export type { RfsocBoard, RfsocBlock, RfsocChannel } from "./data/rfsoc";
export { INFRASTRUCTURE, siteAlarms } from "./data/infrastructure";
export type { InfraSection, InfraNode } from "./data/infrastructure";
export { useDrillParams } from "./hooks/useDrillParams";
export * from "./types";
