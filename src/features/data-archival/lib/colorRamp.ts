/**
 * Perceptual colour ramps — OKLab interpolation, plus a cyclic map for phase.
 *
 * Phase is an angle, not a scalar: −179° and +179° are 1° apart physically.
 * A linear 0..360 → 0..100% ramp (see `TileCard.tsx` before this file existed,
 * and `schedular`'s `array-grid.tsx`) puts them at opposite ends of the scale,
 * so a nearly-aligned array displays as maximally scrambled. `cyclicPhaseColor`
 * fixes that with a 4-anchor map that wraps with no seam at ±180°.
 *
 * Interpolation happens in OKLab rather than sRGB so a ramp's midpoint looks
 * like a perceptual midpoint instead of sliding through a duller, greyer hue.
 */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return c * 255;
}

/** Björn Ottosson's OKLab — linear sRGB → OKLab. */
function linearRgbToOklab([r, g, b]: RGB): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

function oklabToLinearRgb([L, a, b]: [number, number, number]): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return linearRgbToOklab([srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]);
}

function oklabToHex(lab: [number, number, number]): string {
  const [r, g, b] = oklabToLinearRgb(lab);
  return rgbToHex([linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)]);
}

/** Interpolate two hex colours in OKLab space at t ∈ [0, 1]. */
export function mixOklab(hexA: string, hexB: string, t: number): string {
  const a = hexToOklab(hexA);
  const b = hexToOklab(hexB);
  const clamped = Math.min(1, Math.max(0, t));
  return oklabToHex([
    a[0] + (b[0] - a[0]) * clamped,
    a[1] + (b[1] - a[1]) * clamped,
    a[2] + (b[2] - a[2]) * clamped,
  ]);
}

/** A scalar ramp between two anchor colours, clamped to [min, max]. */
export function linearRampColor(
  value: number,
  min: number,
  max: number,
  colorMin: string,
  colorMax: string,
): string {
  const t = max === min ? 0 : (value - min) / (max - min);
  return mixOklab(colorMin, colorMax, t);
}

/** Four evenly-spaced anchors around the circle — matches the chart palette. */
const PHASE_ANCHORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"] as const;

/**
 * Cyclic colour for an angle in degrees (any range — wraps mod 360).
 *
 * Four anchors at 0/90/180/270° interpolated in OKLab; the wrap back from the
 * last anchor to the first makes ±180° meet with no seam, so a nearly-aligned
 * array (phases clustered near 0° or near ±180°) reads as one calm colour
 * region instead of splitting across the ends of a linear scale.
 */
export function cyclicPhaseColor(phaseDeg: number): string {
  const deg = ((phaseDeg % 360) + 360) % 360;
  const segment = deg / 90;
  const i0 = Math.floor(segment) % 4;
  const i1 = (i0 + 1) % 4;
  const t = segment - Math.floor(segment);
  return mixOklab(PHASE_ANCHORS[i0], PHASE_ANCHORS[i1], t);
}
