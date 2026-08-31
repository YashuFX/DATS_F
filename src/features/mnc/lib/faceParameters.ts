/**
 * Health Preview rows, derived from real dome telemetry.
 *
 * Pure functions — telemetry in, table rows out, no React and no store access —
 * so the numbers on this panel can be reasoned about (and tested) without
 * standing up a WebGL scene.
 *
 * Every row here traces to something the feed actually carries. The panel used
 * to render a hand-written "Tile Group" fixture whose values had no connection
 * to the dome beside it: an operator could select a critical face and watch the
 * preview keep reporting Healthy, which is worse than showing nothing.
 */

import { THRESHOLDS } from "@/features/dome-monitor/config";
import { PRESENT_FACES } from "@/features/dome-monitor/data/geometry";
import type { DomeTelemetry, FaceTelemetry, HealthId } from "@/features/dome-monitor/types";
import type { McHealth, ParameterRow } from "../types";

/** Dome health ids and the preview's own vocabulary are the same four states. */
function toMcHealth(health: HealthId): McHealth {
  return health === "nominal" ? "healthy" : health === "degraded" ? "warning" : health === "critical" ? "critical" : "offline";
}

/** Grade a value against a ceiling: warn on approach, critical past it. */
function gradeMax(value: number, limit: number, warnAt = limit * 0.85): McHealth {
  if (value > limit) return "critical";
  if (value >= warnAt) return "warning";
  return "healthy";
}

/** Grade a value against a floor. */
function gradeMin(value: number, limit: number, warnAt = limit * 1.02): McHealth {
  if (value < limit) return "critical";
  if (value <= warnAt) return "warning";
  return "healthy";
}

/** Element-level extrema, computed in one pass rather than four. */
function elementSpread(ft: FaceTelemetry) {
  let maxTemp = -Infinity;
  let minAmp = Infinity;
  let maxAbsPhaseErr = 0;
  const counts: Record<HealthId, number> = { nominal: 0, degraded: 0, critical: 0, offline: 0 };

  for (const el of ft.elements) {
    counts[el.health]++;
    if (el.tempC > maxTemp) maxTemp = el.tempC;
    if (el.amplitude < minAmp) minAmp = el.amplitude;
    const absErr = Math.abs(el.phaseErrorDeg);
    if (absErr > maxAbsPhaseErr) maxAbsPhaseErr = absErr;
  }

  return {
    maxTemp: maxTemp === -Infinity ? 0 : maxTemp,
    minAmp: minAmp === Infinity ? 0 : minAmp,
    maxAbsPhaseErr,
    counts,
  };
}

/** Face-level readout — the Overview tab. */
export function faceOverviewRows(ft: FaceTelemetry): ParameterRow[] {
  const spread = elementSpread(ft);

  return [
    {
      parameter: "Availability",
      value: ft.availabilityPercent.toFixed(1),
      unit: "%",
      status: gradeMin(ft.availabilityPercent, 95, 97),
      threshold: "> 95",
    },
    {
      parameter: "Elements Online",
      value: `${ft.online} / ${ft.total}`,
      unit: "-",
      status: ft.online === ft.total ? "healthy" : "warning",
      threshold: `${ft.total}`,
    },
    {
      parameter: "Chassis Temperature",
      value: ft.tempC.toFixed(1),
      unit: "°C",
      status: gradeMax(ft.tempC, THRESHOLDS.tempCritC, THRESHOLDS.tempWarnC),
      threshold: `< ${THRESHOLDS.tempWarnC}`,
    },
    {
      parameter: "Element Temp (Max)",
      value: spread.maxTemp.toFixed(1),
      unit: "°C",
      status: gradeMax(spread.maxTemp, THRESHOLDS.tempCritC, THRESHOLDS.tempWarnC),
      threshold: `< ${THRESHOLDS.tempCritC}`,
    },
    {
      parameter: "VSWR",
      value: ft.vswr.toFixed(2),
      unit: "-",
      status: gradeMax(ft.vswr, THRESHOLDS.vswrMax),
      threshold: `< ${THRESHOLDS.vswrMax.toFixed(2)}`,
    },
    {
      parameter: "Phase Error (RMS)",
      value: ft.phaseErrorRmsDeg.toFixed(1),
      unit: "°",
      status: gradeMax(ft.phaseErrorRmsDeg, THRESHOLDS.phaseJitterDeg),
      threshold: `< ${THRESHOLDS.phaseJitterDeg}`,
    },
    {
      parameter: "Mean Excitation",
      value: ft.meanExcitationDb.toFixed(2),
      unit: "dB FS",
      // Drive level, not health — there is no spec floor for it in this feed,
      // so it is reported without a verdict rather than given an invented one.
      status: "healthy",
      threshold: "-",
    },
    {
      parameter: "Worst Cluster",
      value: `${ft.worstClusterSize}`,
      unit: "el",
      status: ft.worstClusterSize >= 10 ? "critical" : ft.worstClusterSize >= 5 ? "warning" : "healthy",
      threshold: "< 10",
    },
  ];
}

/** Per-element breakdown — the Elements tab. */
export function faceElementRows(ft: FaceTelemetry): ParameterRow[] {
  const { counts, minAmp, maxAbsPhaseErr } = elementSpread(ft);
  const pct = (n: number) => ((n / (ft.total || 1)) * 100).toFixed(1);

  return [
    { parameter: "Nominal", value: `${counts.nominal}`, unit: "el", status: "healthy", threshold: `${pct(counts.nominal)}%` },
    { parameter: "Degraded", value: `${counts.degraded}`, unit: "el", status: counts.degraded > 0 ? "warning" : "healthy", threshold: `${pct(counts.degraded)}%` },
    { parameter: "Critical", value: `${counts.critical}`, unit: "el", status: counts.critical > 0 ? "critical" : "healthy", threshold: `${pct(counts.critical)}%` },
    { parameter: "Offline", value: `${counts.offline}`, unit: "el", status: counts.offline > 0 ? "offline" : "healthy", threshold: `${pct(counts.offline)}%` },
    {
      parameter: "Phase Error (Peak)",
      value: maxAbsPhaseErr.toFixed(1),
      unit: "°",
      status: gradeMax(maxAbsPhaseErr, THRESHOLDS.phaseJitterDeg * 3, THRESHOLDS.phaseJitterDeg),
      threshold: `< ${THRESHOLDS.phaseJitterDeg * 3}`,
    },
    {
      parameter: "Excitation (Min)",
      value: minAmp.toFixed(3),
      unit: "FS",
      status: gradeMin(minAmp, 0.5, 0.7),
      threshold: "> 0.500",
    },
  ];
}

/** Dome-wide rollup, shown when no single face is selected. */
export function domeOverviewRows(telemetry: DomeTelemetry): ParameterRow[] {
  const t = telemetry.totals;
  const faces = PRESENT_FACES.map((f) => telemetry.faces[f.fceNum]).filter(Boolean) as FaceTelemetry[];
  const n = faces.length || 1;
  const meanTemp = faces.reduce((s, f) => s + f.tempC, 0) / n;

  return [
    { parameter: "Availability", value: t.availabilityPercent.toFixed(2), unit: "%", status: gradeMin(t.availabilityPercent, 95, 97), threshold: "> 95" },
    { parameter: "Elements Online", value: `${t.elementsOnline.toLocaleString()} / ${t.elementsTotal.toLocaleString()}`, unit: "-", status: t.elementsOnline === t.elementsTotal ? "healthy" : "warning", threshold: `${t.elementsTotal.toLocaleString()}` },
    { parameter: "Faces", value: `${t.facesTotal}`, unit: "-", status: "healthy", threshold: "26 present" },
    { parameter: "Chassis Temp (Mean)", value: meanTemp.toFixed(1), unit: "°C", status: gradeMax(meanTemp, THRESHOLDS.tempCritC, THRESHOLDS.tempWarnC), threshold: `< ${THRESHOLDS.tempWarnC}` },
    { parameter: "Peak Temp", value: `${t.peakTempC.toFixed(1)} (F${t.peakTempFace})`, unit: "°C", status: gradeMax(t.peakTempC, THRESHOLDS.tempCritC, THRESHOLDS.tempWarnC), threshold: `< ${THRESHOLDS.tempCritC}` },
    { parameter: "Peak VSWR", value: `${t.peakVswr.toFixed(2)} (F${t.peakVswrFace})`, unit: "-", status: gradeMax(t.peakVswr, THRESHOLDS.vswrMax), threshold: `< ${THRESHOLDS.vswrMax.toFixed(2)}` },
    { parameter: "Peak Phase Error", value: `${t.peakPhaseErrorDeg.toFixed(1)} (F${t.peakPhaseErrorFace})`, unit: "°", status: gradeMax(t.peakPhaseErrorDeg, THRESHOLDS.phaseJitterDeg), threshold: `< ${THRESHOLDS.phaseJitterDeg}` },
    { parameter: "Worst Cluster", value: `${t.worstClusterSize} (F${t.worstClusterFace})`, unit: "el", status: t.worstClusterSize >= 10 ? "critical" : t.worstClusterSize >= 5 ? "warning" : "healthy", threshold: "< 10" },
  ];
}

export { toMcHealth };
