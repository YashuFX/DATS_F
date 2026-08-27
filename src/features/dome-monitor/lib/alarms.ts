/**
 * Alarms fire on face/cluster aggregates, never on raw elements (PHASEPLAN
 * §Phase 4): 7 557 alarmable elements is an alarm-flood machine — one PSU
 * drop could raise 374 element-level alarms in the same second. Elements
 * still carry their own health for the flagged-elements list; this is the
 * layer an operator actually watches.
 */

import { PRESENT_FACES } from "../data/geometry";
import { THRESHOLDS } from "../config";
import type { DomeTelemetry } from "../types";

export interface Alarm {
  id: string;
  faceNum: number;
  severity: "critical" | "degraded";
  message: string;
}

export function deriveAlarms(telemetry: DomeTelemetry): Alarm[] {
  const alarms: Alarm[] = [];

  for (const face of PRESENT_FACES) {
    const ft = telemetry.faces[face.fceNum];
    if (!ft) continue;

    if (ft.health === "critical") {
      alarms.push({
        id: `face-${face.fceNum}-health`,
        faceNum: face.fceNum,
        severity: "critical",
        message: `Face ${face.fceNum} critical — worst cluster ${ft.worstClusterSize} el`,
      });
    } else if (ft.health === "degraded") {
      alarms.push({
        id: `face-${face.fceNum}-health`,
        faceNum: face.fceNum,
        severity: "degraded",
        message: `Face ${face.fceNum} degraded — ${ft.online}/${ft.total} elements online`,
      });
    }

    if (ft.vswr > THRESHOLDS.vswrMax) {
      alarms.push({
        id: `face-${face.fceNum}-vswr`,
        faceNum: face.fceNum,
        severity: "critical",
        message: `Face ${face.fceNum} VSWR ${ft.vswr.toFixed(2)} exceeds ${THRESHOLDS.vswrMax}`,
      });
    }

    if (ft.tempC >= THRESHOLDS.tempWarnC) {
      alarms.push({
        id: `face-${face.fceNum}-temp`,
        faceNum: face.fceNum,
        severity: ft.tempC >= THRESHOLDS.tempCritC ? "critical" : "degraded",
        message: `Face ${face.fceNum} chassis ${ft.tempC.toFixed(1)}°C`,
      });
    }
  }

  return alarms.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}
