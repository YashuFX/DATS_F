"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { linearRampColor, cyclicPhaseColor } from "@/features/data-archival/lib/colorRamp";
import {
  ELEMENT_COLOURS,
  SELECTED_ELEMENT_COLOUR,
  FACE_COLOURS,
  GAIN_RAMP,
  GAIN_RAMP_RANGE,
  TEMP_RAMP,
  TEMP_RAMP_RANGE,
  THRESHOLDS,
} from "../config";
import { ELEMENT_SCALE } from "../lib/elementAppearance";
import type { MetricMode } from "../types";

/**
 * ElementLegend — what the colours on the dome actually mean.
 *
 * The HUD's inline swatch strip (MetricLegend) names the four states and
 * stops there, and only in States mode: switch to Gain, Phase or Temp and
 * every element on the dome recolours with nothing on screen saying what
 * blue-to-amber, or a hue wheel, is measuring. This is the readout that
 * answers "why is that one red / yellow", in every mode.
 *
 * Three rules it is built to obey, because a legend that is subtly wrong is
 * worse than none at all:
 *
 *   1. SWATCHES COME FROM THE SCENE'S OWN CONSTANTS. ELEMENT_COLOURS /
 *      FACE_COLOURS are literal hex fed straight to WebGL materials, and
 *      ELEMENT_SCALE is the size channel elementAppearance applies. The HUD
 *      strip instead paints its dots with `var(--color-da-warn)` and
 *      friends, which are THEME tokens — they happen to match the scene in
 *      dark mode and do not in light (offline is #2a3545 on the dome and a
 *      mid blue-grey #5b7a9e in the token set). Nothing here reads the
 *      cascade, so nothing here can drift from what is rendered.
 *
 *   2. RAMPS ARE SAMPLED, NOT APPROXIMATED. The gradient bars call the same
 *      `linearRampColor` / `cyclicPhaseColor` the elements do, so the bar is
 *      the ramp rather than a CSS impression of it — which matters when the
 *      real one interpolates in OKLab and a browser gradient does not.
 *
 *   3. SIZE IS SHOWN AS WELL AS HUE. Faults are drawn larger on purpose
 *      (elementAppearance: hue alone fails colour-blind operators and
 *      greyscale displays), so the legend's dots carry the same multiplier —
 *      otherwise the size channel is undocumented and reads as a rendering
 *      artefact.
 */

/** Sample a ramp into a CSS gradient, so the bar IS the scene's ramp. */
function rampGradient(sample: (t: number) => string, steps = 24): string {
  const stops = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return `${sample(t)} ${(t * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/** Base diameter of a legend dot at scale 1, matching the HUD's swatches. */
const DOT_BASE_REM = 0.4375;

function Dot({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <span aria-hidden className="flex w-[0.8125rem] shrink-0 items-center justify-center">
      <span
        className="rounded-full"
        style={{
          backgroundColor: color,
          width: `${DOT_BASE_REM * scale}rem`,
          height: `${DOT_BASE_REM * scale}rem`,
          // Offline is near-black by design; without this it vanishes into
          // the glass panel and reads as an empty row.
          outline: "max(1px, 0.0625rem) solid color-mix(in srgb, var(--color-da-text) 22%, transparent)",
        }}
      />
    </span>
  );
}

/**
 * One swatch + label + meaning.
 *
 * `items-center` rather than a hand-tuned top margin: the dots vary in size
 * (that IS the size channel), so any fixed nudge is only ever right for one
 * of them — which is what left them all riding above their labels. Every
 * meaning here is short enough to stay on one line, so centring is exact.
 */
function Row({
  swatch,
  label,
  meaning,
}: {
  swatch: React.ReactNode;
  label: string;
  meaning: string;
}) {
  return (
    <div className="flex items-center gap-[0.375rem]">
      {swatch}
      <span className="min-w-0 leading-[1.3]">
        <span className="text-3xs font-bold uppercase tracking-[0.06em] text-da-text">{label}</span>
        <span className="text-3xs font-medium text-da-label"> — {meaning}</span>
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-3xs font-bold uppercase tracking-[0.1em] text-da-muted">{children}</div>
  );
}

interface Tick {
  label: string;
  /** Position along the bar, 0..1 — where this reading actually falls. */
  at: number;
}

/**
 * A sampled ramp bar with its readings.
 *
 * Ticks are placed at their real fraction of the range rather than spread
 * evenly. Even spacing is fine for two end labels and quietly wrong for
 * anything between them: 50 °C is 67% of the way along a 20–65 °C ramp, so
 * a flex-spaced middle label put the warn threshold at the halfway colour
 * and pointed the operator at the wrong shade.
 */
function RampBar({
  gradient,
  ticks,
  caption,
}: {
  gradient: string;
  ticks: Tick[];
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-[0.25rem]">
      <span
        aria-hidden
        className="relative block h-[0.4375rem] w-full rounded-full border-[max(1px,0.0625rem)] border-da-border"
        style={{ background: gradient }}
      >
        {ticks
          .filter((t) => t.at > 0 && t.at < 1)
          .map((t) => (
            <span
              key={t.label}
              className="absolute inset-y-0 w-[max(1px,0.0625rem)] bg-da-text/70"
              style={{ left: `${t.at * 100}%` }}
            />
          ))}
      </span>
      <div className="relative h-[0.75rem]">
        {ticks.map((t) => (
          <span
            key={t.label}
            className="absolute top-0 whitespace-nowrap text-3xs font-semibold tabular-nums text-da-label"
            style={{
              left: `${t.at * 100}%`,
              // Ends hug the bar's ends; anything between centres on its tick.
              transform: t.at === 0 ? "none" : t.at === 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <p className="text-3xs font-medium leading-[1.35] text-da-label">{caption}</p>
    </div>
  );
}

const STATE_ROWS: { id: keyof typeof ELEMENT_COLOURS; label: string; meaning: string }[] = [
  { id: "nominal", label: "Nominal", meaning: "healthy" },
  { id: "degraded", label: "Degraded", meaning: "out of spec, still radiating" },
  { id: "critical", label: "Critical", meaning: "failed" },
  { id: "offline", label: "Offline", meaning: "no reading" },
];

export function ElementLegend({ metricMode }: { metricMode: MetricMode }) {
  const [open, setOpen] = useState(true);

  const modeLabel = { states: "States", gain: "Gain", phase: "Phase", temp: "Temp" }[metricMode];

  return (
    <div className="pointer-events-auto w-[13.5rem] overflow-hidden rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 shadow-da-card backdrop-blur-[0.5rem]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-[0.375rem] px-[0.5rem] py-[0.375rem] text-left transition-colors hover:bg-da-subtle"
      >
        <span className="text-3xs font-bold uppercase tracking-[0.1em] text-da-text">
          Legend
          <span className="font-medium text-da-muted"> · {modeLabel}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-[0.75rem] shrink-0 text-da-muted transition-transform", !open && "-rotate-90")}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-[0.5rem] border-t-[max(1px,0.0625rem)] border-da-border px-[0.5rem] pt-[0.4375rem] pb-[0.5rem]">
          <div className="flex flex-col gap-[0.3125rem]">
            <SectionLabel>Elements</SectionLabel>

            {metricMode === "states" ? (
              <>
                {STATE_ROWS.map((r) => (
                  <Row
                    key={r.id}
                    swatch={<Dot color={ELEMENT_COLOURS[r.id]} scale={ELEMENT_SCALE[r.id]} />}
                    label={r.label}
                    meaning={r.meaning}
                  />
                ))}
                <p className="text-3xs font-medium leading-[1.35] text-da-label">
                  Faults are drawn bigger, offline smaller.
                </p>
              </>
            ) : (
              <>
                {metricMode === "gain" && (
                  <RampBar
                    gradient={rampGradient((t) =>
                      linearRampColor(t, 0, 1, GAIN_RAMP[0], GAIN_RAMP[1]),
                    )}
                    ticks={[
                      { label: `${GAIN_RAMP_RANGE[0]}`, at: 0 },
                      { label: GAIN_RAMP_RANGE[1].toFixed(1), at: 1 },
                    ]}
                    caption="Drive level, not antenna gain."
                  />
                )}

                {metricMode === "phase" && (
                  <RampBar
                    gradient={rampGradient((t) => cyclicPhaseColor(-180 + t * 360))}
                    ticks={[
                      { label: "−180°", at: 0 },
                      { label: "0°", at: 0.5 },
                      { label: "+180°", at: 1 },
                    ]}
                    caption="Measured phase. Both ends are the same angle."
                  />
                )}

                {metricMode === "temp" && (
                  <RampBar
                    gradient={rampGradient((t) =>
                      linearRampColor(
                        TEMP_RAMP_RANGE[0] + t * (TEMP_RAMP_RANGE[1] - TEMP_RAMP_RANGE[0]),
                        TEMP_RAMP_RANGE[0],
                        TEMP_RAMP_RANGE[1],
                        TEMP_RAMP[0],
                        TEMP_RAMP[1],
                      ),
                    )}
                    ticks={[
                      { label: `${TEMP_RAMP_RANGE[0]}°C`, at: 0 },
                      {
                        label: `${THRESHOLDS.tempWarnC}° warn`,
                        at:
                          (THRESHOLDS.tempWarnC - TEMP_RAMP_RANGE[0]) /
                          (TEMP_RAMP_RANGE[1] - TEMP_RAMP_RANGE[0]),
                      },
                      { label: `${TEMP_RAMP_RANGE[1]}°C`, at: 1 },
                    ]}
                    caption="Chassis temperature."
                  />
                )}

                {/* elementAppearance applies faults BEFORE any ramp, so red
                    and near-black keep their meaning in the analysis modes —
                    which is exactly the thing an operator would otherwise
                    misread as an extreme ramp value. */}
                <div className="flex flex-col gap-[0.3125rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.375rem]">
                  <Row
                    swatch={<Dot color={ELEMENT_COLOURS.critical} scale={ELEMENT_SCALE.critical} />}
                    label="Critical"
                    meaning="stays red in every mode"
                  />
                  <Row
                    swatch={<Dot color={ELEMENT_COLOURS.offline} scale={ELEMENT_SCALE.offline} />}
                    label="Offline"
                    meaning="nothing to plot"
                  />
                </div>
              </>
            )}

            <div className="border-t-[max(1px,0.0625rem)] border-da-border pt-[0.375rem]">
              <Row
                swatch={<Dot color={SELECTED_ELEMENT_COLOUR} scale={ELEMENT_SCALE.selected} />}
                label="Selected"
                meaning="what you last clicked"
              />
            </div>
          </div>

          <div className="flex flex-col gap-[0.3125rem] border-t-[max(1px,0.0625rem)] border-da-border pt-[0.4375rem]">
            <SectionLabel>Face shell</SectionLabel>
            <div className="flex items-center gap-[0.5rem]">
              {(["nominal", "degraded", "critical"] as const).map((id) => (
                <span key={id} className="flex items-center gap-[0.25rem]">
                  <span
                    aria-hidden
                    className="size-[0.5rem] rounded-[0.125rem] border-[max(1px,0.0625rem)]"
                    style={{
                      backgroundColor: FACE_COLOURS[id].fill,
                      borderColor: FACE_COLOURS[id].edge,
                    }}
                  />
                  <span className="text-3xs font-medium capitalize text-da-label">{id}</span>
                </span>
              ))}
            </div>
            <p className="text-3xs font-medium leading-[1.35] text-da-label">
              A face takes its worst element. Grey means healthy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
