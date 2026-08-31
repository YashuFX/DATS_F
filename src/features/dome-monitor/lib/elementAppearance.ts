/**
 * Per-element colour + point size for the instanced element layer.
 *
 * Priority (PHASEPLAN §Phase 3): fault overrides everything (full colour,
 * 1.35× point size — a fault must be findable by size as well as hue, since
 * hue alone fails colour-blind operators and greyscale display) → offline
 * muted → metric ramp. This is the one place that priority is implemented,
 * so "states" and the three analysis modes (Gain / Phase / Temp) share it
 * exactly instead of drifting apart.
 */

import { linearRampColor, cyclicPhaseColor } from "@/features/data-archival/lib/colorRamp";
import {
  ELEMENT_COLOURS,
  SELECTED_ELEMENT_COLOUR,
  GAIN_RAMP,
  GAIN_RAMP_RANGE,
  TEMP_RAMP,
  TEMP_RAMP_RANGE,
} from "../config";
import type { ElementTelemetry, MetricMode } from "../types";

export interface ElementAppearance {
  color: string;
  /** Multiplier on the base element point radius. */
  scale: number;
}

/**
 * The point-size channel, in one place.
 *
 * Size is the SECOND channel this module encodes, and it carries real
 * meaning (see the header): a fault is bigger, an offline module is smaller.
 * Exported so ElementLegend can draw its swatches at the sizes the scene
 * actually renders — a legend that hardcodes its own copy of these is a
 * legend that quietly stops being true the first time one is retuned.
 */
export const ELEMENT_SCALE = {
  nominal: 1,
  degraded: 1.15,
  critical: 1.35,
  offline: 0.85,
  selected: 1.35,
} as const;

const NOMINAL: ElementAppearance = { color: ELEMENT_COLOURS.nominal, scale: ELEMENT_SCALE.nominal };

export function elementAppearance(
  el: ElementTelemetry | undefined,
  metricMode: MetricMode,
  isSelected: boolean,
): ElementAppearance {
  if (isSelected) return { color: SELECTED_ELEMENT_COLOUR, scale: ELEMENT_SCALE.selected };
  if (!el) return NOMINAL;

  // Fault overrides every ramp — a critical element must never be visually
  // demoted just because the operator switched to an analysis mode.
  if (el.health === "critical") return { color: ELEMENT_COLOURS.critical, scale: ELEMENT_SCALE.critical };
  if (el.health === "offline") return { color: ELEMENT_COLOURS.offline, scale: ELEMENT_SCALE.offline };
  if (el.health === "degraded" && metricMode === "states") {
    return { color: ELEMENT_COLOURS.degraded, scale: ELEMENT_SCALE.degraded };
  }

  switch (metricMode) {
    case "gain":
      return { color: linearRampColor(el.amplitude, GAIN_RAMP_RANGE[0], GAIN_RAMP_RANGE[1], GAIN_RAMP[0], GAIN_RAMP[1]), scale: ELEMENT_SCALE.nominal };
    case "phase":
      return { color: cyclicPhaseColor(el.phase), scale: ELEMENT_SCALE.nominal };
    case "temp":
      return { color: linearRampColor(el.tempC, TEMP_RAMP_RANGE[0], TEMP_RAMP_RANGE[1], TEMP_RAMP[0], TEMP_RAMP[1]), scale: ELEMENT_SCALE.nominal };
    case "states":
    default:
      return NOMINAL;
  }
}
