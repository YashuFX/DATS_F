/**
 * Viewport framing tests — the invariant this file exists to protect is that
 * the dome lands in the middle of the strip the detail panel is NOT covering,
 * at every viewport the dashboard is designed for.
 *
 * The bug these were written against: the left-shift used to be a fixed
 * fraction of canvas width, while the panel it dodges is
 * `clamp(24rem, 50%, 44rem)` against a root font-size of
 * `min(1.1111vw, 1.8223vh)` — height-derived on anything wider than ~16:10.
 * So the panel's share of the card grew with viewport HEIGHT and the shift
 * did not. Entering fullscreen at 1920x1080 was enough to push the dome into
 * the panel. The regression was invisible at one window size and obvious at
 * another, which is exactly the class of thing a table of viewports catches
 * and eyeballing one screenshot does not.
 *
 * Run with:  npm run test:geometry
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { fitFov, viewportFraming } from "../cameraFraming";
import { CAMERA_BASE_FOV, CAMERA_MAX_FIT_FOV, MAX_OBSTRUCTED_FRACTION } from "../../config";

/** Dome silhouette radius in metres at the default framing — smaller than
 *  DOME_CIRCUMRADIUS (3.0, the vertex bound) because the bottom cap is
 *  absent. This is what actually has to stay on screen. */
const SILHOUETTE_RADIUS = 2.83;

/** Framing distance when a face is selected (FACE_FRAME_DISTANCE). */
const FACE_DISTANCE = 9.5;
/** Framing distance with nothing selected (CAMERA_DEFAULT_DISTANCE). */
const ARRAY_DISTANCE = 8;

/**
 * Reproduces globals.css: `font-size: min(1.1111vw, 1.8223vh)` — the whole
 * reason the panel's share of the card is viewport-height-dependent.
 */
function rootRem(vw: number, vh: number): number {
  return Math.min((1.1111 * vw) / 100, (1.8223 * vh) / 100);
}

/** Canvas + panel geometry for a viewport, mirroring DomeScreen's layout. */
function layout(vw: number, vh: number) {
  const rem = rootRem(vw, vh);
  return {
    // DomeScreen wraps the card in p-0.75rem.
    width: vw - 1.5 * rem,
    // ...below a ~4.5rem header, plus the same page padding.
    height: vh - 6 * rem,
    // PANEL_WIDTH_CSS = clamp(24rem, 50%, 44rem) of the card.
    panelWidth: Math.min(Math.max(24 * rem, 0.5 * (vw - 1.5 * rem)), 44 * rem),
  };
}

/**
 * Where the dome's silhouette lands, in canvas px from the left edge.
 *
 * Mirrors three.js's perspective projection under `setViewOffset`: with a
 * sensor `fullWidth` px wide and the canvas aligned to its right edge, the
 * camera axis renders at `fullWidth / 2 - offsetX` px, and the frustum keeps
 * the canvas's own scale (`2 * distance * tan(fov / 2)` world units across
 * `height` px). Verified against the real three.js build before being
 * written down here.
 */
function domeExtent(vw: number, vh: number, distance: number, panelOpen: boolean) {
  const { width, height, panelWidth } = layout(vw, vh);
  const { fov, obstructedPx, visibleWidthPx } = viewportFraming(
    width,
    height,
    panelWidth,
    distance,
    panelOpen,
  );

  const fullWidth = width + obstructedPx;
  const centreX = fullWidth / 2 - obstructedPx;
  const pxPerMetre = height / (2 * distance * Math.tan(((fov / 2) * Math.PI) / 180));
  const radiusPx = SILHOUETTE_RADIUS * pxPerMetre;

  return { fov, visibleWidthPx, centreX, left: centreX - radiusPx, right: centreX + radiusPx };
}

/** Every viewport the dashboard is designed for, widest aspect to squarest. */
const DESIGN_ENVELOPE: [string, number, number][] = [
  ["ultrawide 3440x1440", 3440, 1440],
  ["4K 3840x2160", 3840, 2160],
  ["QHD 2560x1440", 2560, 1440],
  ["FHD fullscreen 1920x1080", 1920, 1080],
  ["FHD windowed @80% zoom", 2400, 1119],
  ["1680x1050", 1680, 1050],
  ["design canvas 1440x878", 1440, 878],
  ["laptop 1366x768", 1366, 768],
  ["4:3 1600x1200", 1600, 1200],
  ["5:4 1280x1024", 1280, 1024],
  ["square 1200x1200", 1200, 1200],
];

describe("viewportFraming — dome centring", () => {
  test("centres the dome in the unobstructed strip, panel open", () => {
    for (const [name, vw, vh] of DESIGN_ENVELOPE) {
      const { centreX, visibleWidthPx } = domeExtent(vw, vh, FACE_DISTANCE, true);
      assert.ok(
        Math.abs(centreX - visibleWidthPx / 2) < 1,
        `${name}: dome centre ${centreX.toFixed(1)}px, strip centre ${(visibleWidthPx / 2).toFixed(1)}px`,
      );
    }
  });

  test("centres the dome in the whole canvas, panel closed", () => {
    for (const [name, vw, vh] of DESIGN_ENVELOPE) {
      const { centreX, visibleWidthPx } = domeExtent(vw, vh, ARRAY_DISTANCE, false);
      const { width } = layout(vw, vh);
      assert.ok(Math.abs(visibleWidthPx - width) < 1, `${name}: closed panel must obstruct nothing`);
      assert.ok(
        Math.abs(centreX - width / 2) < 1,
        `${name}: dome centre ${centreX.toFixed(1)}px, canvas centre ${(width / 2).toFixed(1)}px`,
      );
    }
  });

  test("never lets the dome reach the panel edge or the canvas edge", () => {
    for (const [name, vw, vh] of DESIGN_ENVELOPE) {
      for (const distance of [FACE_DISTANCE, ARRAY_DISTANCE]) {
        const { left, right, visibleWidthPx } = domeExtent(vw, vh, distance, true);
        assert.ok(left > 8, `${name} @d=${distance}: dome overhangs the left edge by ${(-left).toFixed(0)}px`);
        assert.ok(
          right < visibleWidthPx - 8,
          `${name} @d=${distance}: dome runs ${(right - visibleWidthPx).toFixed(0)}px into the panel`,
        );
      }
    }
  });
});

describe("fitFov", () => {
  test("leaves the authored FOV alone wherever the strip is wider than it is tall", () => {
    // The common case, and the one that must not regress: this is what keeps
    // the framing on a normal desktop identical to how it was authored.
    for (const [name, vw, vh] of DESIGN_ENVELOPE.slice(0, 8)) {
      const { fov } = domeExtent(vw, vh, FACE_DISTANCE, true);
      assert.equal(fov, CAMERA_BASE_FOV, `${name}: FOV drifted to ${fov.toFixed(1)}`);
    }
  });

  test("opens up, monotonically, as the visible strip narrows", () => {
    const height = 1000;
    const widths = [2000, 1400, 1000, 800, 600, 400];
    const fovs = widths.map((w) => fitFov(w, height, FACE_DISTANCE));
    for (let i = 1; i < fovs.length; i++) {
      assert.ok(fovs[i] >= fovs[i - 1], `narrowing to ${widths[i]}px lowered FOV to ${fovs[i]}`);
    }
    assert.equal(fovs[0], CAMERA_BASE_FOV);
    assert.ok(fovs.at(-1)! > CAMERA_BASE_FOV);
  });

  test("stays inside [base, max] and never returns garbage", () => {
    for (const args of [
      [0, 1000, 9.5],
      [1000, 0, 9.5],
      [1000, 1000, 0],
      [-100, -100, -1],
      [Number.NaN, 1000, 9.5],
      [1, 100000, 0.001],
    ] as [number, number, number][]) {
      const fov = fitFov(...args);
      assert.ok(Number.isFinite(fov), `fitFov(${args}) returned ${fov}`);
      assert.ok(fov >= CAMERA_BASE_FOV && fov <= CAMERA_MAX_FIT_FOV, `fitFov(${args}) = ${fov}`);
    }
  });
});

describe("viewportFraming — obstruction", () => {
  test("reports no obstruction while the panel is closed", () => {
    const { obstructedPx, visibleWidthPx } = viewportFraming(1600, 900, 700, FACE_DISTANCE, false);
    assert.equal(obstructedPx, 0);
    assert.equal(visibleWidthPx, 1600);
  });

  test("caps obstruction so an oversized panel can't push the dome off-screen", () => {
    // PANEL_WIDTH_CSS's 24rem floor can exceed 50% of a narrow card.
    const { obstructedPx, visibleWidthPx } = viewportFraming(600, 900, 580, FACE_DISTANCE, true);
    assert.equal(obstructedPx, 600 * MAX_OBSTRUCTED_FRACTION);
    assert.ok(visibleWidthPx > 0);
  });

  test("tolerates an unmeasured panel (width 0) without shifting", () => {
    // panelWidth is 0 until DetailPanel's ResizeObserver has reported once.
    const { obstructedPx, fov } = viewportFraming(1600, 900, 0, FACE_DISTANCE, true);
    assert.equal(obstructedPx, 0);
    assert.equal(fov, CAMERA_BASE_FOV);
  });
});
