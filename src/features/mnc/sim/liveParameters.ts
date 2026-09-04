/**
 * Panel rows derived from the live tracking state.
 *
 * The M&C board's panels are meant to describe ONE situation. Before this the
 * tracking display ran a real propagator while the parameter panel printed a
 * fixed table beside it — an operator could watch a pass climb through zenith
 * with "Beam Pointing Elevation 36.21°" frozen next to it. Panels sitting in
 * one frame have to agree, or none of them can be trusted.
 *
 * Pure: state in, rows out.
 */

import { BEAMS, BEAMS_PER_TARGET, MONOPULSE_SQUINT_DEG, TRACKING } from "../data/mnc.mock";
import type { ParameterRow } from "../types";
import type { SatelliteState } from "./lookAngles";
import type { BeamPlan } from "./beamPlanner";

/** Static facts about the aperture — true whether or not anything is tracked. */
const APERTURE_ROWS: ParameterRow[] = [
  { parameter: "Aperture", value: "MUST-01", unit: "-", min: "-", max: "-", status: "nominal" },
  { parameter: "Geometry", value: "Truncated icosahedron", unit: "-", min: "-", max: "-", status: "nominal" },
  { parameter: "Active Faces", value: "26", unit: "-", min: "-", max: "32", status: "nominal" },
  { parameter: "Radiating Elements", value: "7,557", unit: "-", min: "-", max: "-", status: "nominal" },
  { parameter: "Polarization", value: "LHCP", unit: "-", min: "-", max: "-", status: "nominal" },
  { parameter: "Operating Frequency", value: "8.20", unit: "GHz", min: "7.90", max: "8.50", status: "nominal" },
];

/** Antenna tab — where the aperture is actually pointed, right now. */
export function antennaRows(target: SatelliteState | null, plan: BeamPlan): ParameterRow[] {
  const assignment = target
    ? plan.assignments.find((a) => a.satelliteId === target.id)
    : undefined;

  return [
    ...APERTURE_ROWS,
    {
      parameter: "Beam Pointing Azimuth",
      value: target ? target.azimuthDeg.toFixed(2) : "—",
      unit: "deg",
      min: "0",
      max: "360",
      status: target ? "healthy" : "offline",
    },
    {
      parameter: "Beam Pointing Elevation",
      value: target ? target.elevationDeg.toFixed(2) : "—",
      unit: "deg",
      min: String(TRACKING.elevationMaskDeg),
      max: "90",
      // Below the mask the path through the atmosphere stops closing the link,
      // which is a real operational state and not merely a low number.
      status: !target
        ? "offline"
        : target.elevationDeg < TRACKING.elevationMaskDeg
          ? "warning"
          : "nominal",
    },
    {
      parameter: "Serving Face",
      value: assignment ? `F${assignment.faceNum}` : "—",
      unit: "-",
      min: "-",
      max: "-",
      status: assignment ? "nominal" : "offline",
    },
    {
      parameter: "Off-Boresight",
      value: assignment ? assignment.offBoresightDeg.toFixed(1) : "—",
      unit: "deg",
      min: "0",
      max: String(TRACKING.faceScanLimitDeg),
      // Scan loss grows as cos^1.2 of this angle; past the limit the face
      // cannot form a usable beam at all.
      status: !assignment
        ? "offline"
        : assignment.offBoresightDeg > TRACKING.faceScanLimitDeg * 0.8
          ? "warning"
          : "nominal",
    },
    { parameter: "Drive Status", value: target ? "Tracking" : "Standby", unit: "-", min: "-", max: "-", status: "nominal" },
  ];
}

/** Beam tab — the monopulse cluster and what it is costing. */
export function beamRows(target: SatelliteState | null, plan: BeamPlan): ParameterRow[] {
  const utilisation = plan.beamsTotal ? (plan.beamsUsed / plan.beamsTotal) * 100 : 0;

  return [
    { parameter: "Tracking Beams / Target", value: String(BEAMS.trackingBeamsPerTarget), unit: "-", min: "-", max: "-", status: "nominal" },
    { parameter: "Data Beams / Target", value: String(BEAMS.dataBeamsPerTarget), unit: "-", min: "-", max: "-", status: "nominal" },
    { parameter: "Beams / Target", value: String(BEAMS_PER_TARGET), unit: "-", min: "-", max: "-", status: "nominal" },
    { parameter: "Beamwidth (HPBW)", value: BEAMS.beamwidthDeg.toFixed(2), unit: "deg", min: "-", max: "-", status: "nominal" },
    { parameter: "Monopulse Squint", value: MONOPULSE_SQUINT_DEG.toFixed(2), unit: "deg", min: "-", max: "-", status: "nominal" },
    {
      parameter: "Beams Committed",
      value: `${plan.beamsUsed} / ${plan.beamsTotal}`,
      unit: "-",
      min: "0",
      max: String(plan.beamsTotal),
      status: utilisation > 80 ? "warning" : "nominal",
    },
    { parameter: "Beam Utilisation", value: utilisation.toFixed(1), unit: "%", min: "0", max: "100", status: utilisation > 80 ? "warning" : "nominal" },
    { parameter: "Targets Tracked", value: String(plan.assignments.length), unit: "-", min: "0", max: String(plan.budgetCapacityTargets), status: "nominal" },
    {
      parameter: "Slant Range",
      value: target ? target.rangeKm.toFixed(0) : "—",
      unit: "km",
      min: "0",
      max: String(TRACKING.maxRangeKm),
      status: !target ? "offline" : target.rangeKm > TRACKING.maxRangeKm ? "critical" : "nominal",
    },
    {
      parameter: "Range Rate",
      value: target ? `${target.rangeRateKmS >= 0 ? "+" : ""}${target.rangeRateKmS.toFixed(3)}` : "—",
      unit: "km/s",
      min: "-",
      max: "-",
      // The sign carries the meaning — closing means the pass is still
      // approaching, opening means it is on its way out — so it is rendered
      // into the value rather than flattened into a verdict.
      status: target ? "healthy" : "offline",
    },
  ];
}

/** System tab — the station and the simulation driving it. */
export function systemRows(
  target: SatelliteState | null,
  plan: BeamPlan,
  catalogueSize: number,
  running: boolean,
  simTime: number,
): ParameterRow[] {
  return [
    { parameter: "System Mode", value: target ? "Tracking" : "Survey", unit: "-", min: "-", max: "-", status: "nominal" },
    { parameter: "Simulation", value: running ? "Running" : "Stopped", unit: "-", min: "-", max: "-", status: running ? "nominal" : "offline" },
    {
      parameter: "Sim Epoch",
      value: new Date(simTime).toISOString().slice(11, 19),
      unit: "UTC",
      min: "-",
      max: "-",
      status: "nominal",
    },
    { parameter: "Catalogue", value: String(catalogueSize), unit: "obj", min: "-", max: "-", status: "nominal" },
    { parameter: "In View", value: String(plan.visibleCount), unit: "obj", min: "0", max: String(catalogueSize), status: "nominal" },
    { parameter: "Elevation Mask", value: String(TRACKING.elevationMaskDeg), unit: "deg", min: "0", max: "90", status: "nominal" },
    { parameter: "Max Range", value: String(TRACKING.maxRangeKm), unit: "km", min: "-", max: "-", status: "nominal" },
    { parameter: "Face Scan Limit", value: String(TRACKING.faceScanLimitDeg), unit: "deg", min: "-", max: "-", status: "nominal" },
    {
      parameter: "Active Target",
      value: target?.id ?? "—",
      unit: "-",
      min: "-",
      max: "-",
      status: target ? "nominal" : "offline",
    },
  ];
}
