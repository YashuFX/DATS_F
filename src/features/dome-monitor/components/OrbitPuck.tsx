"use client";

import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/features/data-archival/lib/cn";
import { useDomeStore } from "../store/domeStore";

/**
 * OrbitPuck — a wireframe globe you grab to turn the dome.
 *
 * Drag it and the dome orbits: horizontally for azimuth, vertically for
 * elevation. It is a two-way instrument, not just an input — the scene
 * reports the camera pose on every move (domeStore.setCameraPose), so the
 * globe tracks a canvas drag, the wheel, a preset and a face fly-to exactly
 * as it tracks its own drag.
 *
 * WHY A GLOBE, not the compass rose this started as. A rose plus a needle is
 * the wrong picture for this control: it says "a bearing on a flat plane",
 * shows elevation nowhere, and a needle at 200 degrees looks exactly like a
 * needle at 200 degrees no matter which way you got there. What is actually
 * being manipulated is a solid being turned in front of you, so the widget
 * draws that solid. The lines below are a real orthographic projection of a
 * sphere from the camera's own azimuth and elevation, which means:
 *
 *   - drag LEFT/RIGHT and the meridians sweep bodily across the globe, the
 *     brand-coloured prime meridian leading them, so rotation is legible as
 *     motion rather than as a number changing;
 *   - drag UP/DOWN and the equator opens from a flat line into an ellipse
 *     while the pole marker walks in from the rim toward the centre — the
 *     unmistakable read of climbing over the top of something;
 *   - lines on the far side are drawn faint, which is the whole reason the
 *     thing reads as a sphere and not as a plate of ellipses.
 *
 * WHY IT LIVES BOTTOM-LEFT, not with the camera presets bottom-right: the
 * detail panel is `z-20` over the HUD's `z-10` and overlays the right half
 * of the viewport. A control docked beside the presets would disappear at
 * exactly the moment an operator most wants to turn the dome — while a face
 * is selected and being read. The left edge is the one the panel never
 * covers, at any selection state.
 *
 * Drag maths deliberately reads its start pose from a ref captured on
 * pointer-down rather than from the store each frame. The store value is a
 * round trip through the scene (request -> camera -> OrbitControls ->
 * report), so integrating deltas onto it would compound that lag into drift.
 */

/** Degrees of orbit per pixel dragged. Tuned so a puck-width sweep is ~70°. */
const AZ_PER_PX = 0.9;
const EL_PER_PX = 0.6;

/** Step for the chevrons and the arrow keys, and the Shift-held coarse step. */
const STEP = 15;
const STEP_FINE = 5;

/** Geometry, in the SVG's own 100x100 units. */
const CX = 50;
const CY = 50;
const GLOBE_R = 30;
const CHEVRON_R = 43;

const D2R = Math.PI / 180;

type Vec3 = [number, number, number];
interface Projected {
  x: number;
  y: number;
  /** True on the hemisphere facing the viewer. */
  front: boolean;
}

/**
 * Orthographic projection of the unit sphere as seen from `azimuth` /
 * `elevation` — the same world convention the faces and presets use
 * (lib/cameraFraming.ts), so the globe is turning through the same angles
 * the camera is, not a decorative approximation of them.
 */
function makeProjector(azimuthDeg: number, elevationDeg: number) {
  const a = azimuthDeg * D2R;
  const e = elevationDeg * D2R;

  const view: Vec3 = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
  const right: Vec3 = [-Math.sin(a), Math.cos(a), 0];
  const up: Vec3 = [-Math.sin(e) * Math.cos(a), -Math.sin(e) * Math.sin(a), Math.cos(e)];

  return (p: Vec3): Projected => ({
    x: CX + (p[0] * right[0] + p[1] * right[1] + p[2] * right[2]) * GLOBE_R,
    // SVG y grows downward; screen-up is the +up axis.
    y: CY - (p[0] * up[0] + p[1] * up[1] + p[2] * up[2]) * GLOBE_R,
    front: p[0] * view[0] + p[1] * view[1] + p[2] * view[2] >= 0,
  });
}

/**
 * Split a closed curve into near-side and far-side polyline paths.
 *
 * Each run keeps the point that crossed the horizon, so the bright and faint
 * halves meet on the rim instead of leaving a gap there.
 */
function splitByDepth(points: Projected[]): { front: string; back: string } {
  const front: string[] = [];
  const back: string[] = [];
  let run: string[] = [];
  let runFront = points[0].front;

  const flush = () => {
    if (run.length > 1) (runFront ? front : back).push(`M${run.join("L")}`);
    run = [];
  };

  for (const p of points) {
    const xy = `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    if (p.front !== runFront) {
      run.push(xy); // close the old run on the rim...
      flush();
      runFront = p.front;
      run.push(xy); // ...and open the new one from the same point.
    }
    run.push(xy);
  }
  // Close the loop back onto the first point.
  if (points[0].front === runFront) run.push(`${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`);
  flush();

  return { front: front.join(" "), back: back.join(" ") };
}

const SAMPLES = 64;

/** A great circle through the poles, at longitude `lonDeg`. */
function meridian(lonDeg: number, project: (p: Vec3) => Projected) {
  const lon = lonDeg * D2R;
  return splitByDepth(
    Array.from({ length: SAMPLES }, (_, i) => {
      const u = (i / SAMPLES) * 2 * Math.PI;
      return project([Math.cos(u) * Math.cos(lon), Math.cos(u) * Math.sin(lon), Math.sin(u)]);
    }),
  );
}

/** A circle of constant latitude. */
function parallel(latDeg: number, project: (p: Vec3) => Projected) {
  const lat = latDeg * D2R;
  const r = Math.cos(lat);
  const z = Math.sin(lat);
  return splitByDepth(
    Array.from({ length: SAMPLES }, (_, i) => {
      const u = (i / SAMPLES) * 2 * Math.PI;
      return project([r * Math.cos(u), r * Math.sin(u), z]);
    }),
  );
}

/** The four nudge arrows, as (label, unit direction from centre). */
const CHEVRONS = [
  { id: "left", dx: -1, dy: 0 },
  { id: "right", dx: 1, dy: 0 },
  { id: "up", dx: 0, dy: -1 },
  { id: "down", dx: 0, dy: 1 },
] as const;

export function OrbitPuck() {
  const azimuth = useDomeStore((s) => s.cameraAzimuth);
  const elevation = useDomeStore((s) => s.cameraElevation);
  const requestOrbit = useDomeStore((s) => s.requestOrbit);

  const drag = useRef<{ x: number; y: number; azimuth: number; elevation: number } | null>(null);

  const globe = useMemo(() => {
    const project = makeProjector(azimuth, elevation);
    return {
      // Longitude 0 is drawn in the brand colour: one line you can actually
      // follow around, which is what turns a spin into something readable.
      prime: meridian(0, project),
      // Three more meridians and the equator, and no more than that. An
      // earlier pass drew four plus the +/-45 parallels; at the ~55px the
      // globe actually renders at, seven curves stopped being a wireframe
      // and became grey haze with a teal line in it. The equator alone
      // carries elevation and the meridians alone carry the spin.
      others: [60, 120].map((lon) => meridian(lon, project)),
      equator: parallel(0, project),
      northPole: project([0, 0, 1]),
    };
  }, [azimuth, elevation]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { cameraAzimuth, cameraElevation } = useDomeStore.getState();
    drag.current = { x: e.clientX, y: e.clientY, azimuth: cameraAzimuth, elevation: cameraElevation };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const start = drag.current;
      if (!start) return;
      // Direct manipulation: the globe follows the pointer, so dragging right
      // walks the camera the other way round it — the same sense as dragging
      // the dome itself on the canvas.
      requestOrbit(
        start.azimuth - (e.clientX - start.x) * AZ_PER_PX,
        start.elevation + (e.clientY - start.y) * EL_PER_PX,
      );
    },
    [requestOrbit],
  );

  const endDrag = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  /**
   * Discrete nudge, shared by the chevrons and the arrow keys.
   *
   * These move the CAMERA (up means the camera climbs), which is the
   * opposite sense to the drag above — where you are grabbing the globe
   * itself. That is the same split every 3D tool makes between tumbling a
   * model and stepping a view, and it is why the arrows read correctly as
   * buttons while the drag reads correctly as a grab.
   */
  const nudge = useCallback(
    (dx: number, dy: number, coarse: boolean) => {
      const step = coarse ? STEP : STEP_FINE;
      const { cameraAzimuth: az, cameraElevation: el } = useDomeStore.getState();
      requestOrbit(az - dx * step, el - dy * step);
    },
    [requestOrbit],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const coarse = e.shiftKey;
      switch (e.key) {
        case "ArrowLeft":  nudge(-1, 0, coarse); break;
        case "ArrowRight": nudge(1, 0, coarse); break;
        case "ArrowUp":    nudge(0, -1, coarse); break;
        case "ArrowDown":  nudge(0, 1, coarse); break;
        default: return;
      }
      // The dome screen has its own global arrow-key handler for stepping
      // between faces (useDomeKeyboard, bound to window). React's listener
      // sits on the root container, below window in the bubble path, so
      // stopping here genuinely keeps the event from reaching it.
      e.preventDefault();
      e.stopPropagation();
    },
    [nudge],
  );

  return (
    <div className="pointer-events-auto flex w-fit flex-col items-center gap-[0.125rem] rounded-[0.375rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/85 px-[0.375rem] pt-[0.25rem] pb-[0.375rem] shadow-da-card backdrop-blur-[0.5rem]">
      <svg
        viewBox="0 0 100 100"
        className={cn(
          // rounded-full so the focus ring traces the instrument, not its box.
          "size-[5.5rem] rounded-full cursor-grab touch-none select-none active:cursor-grabbing",
          // `outline-none` first: this is a tabindex'd <svg>, so Chrome paints
          // its own 3px white focus ring, and it outranked the brand ring.
          // `outline-solid` is not decoration either — Tailwind v4's
          // `outline-none` sets `--tw-outline-style: none` and the width
          // utility reads that same variable, so without restoring the style
          // the ring computes to width 2, colour brand, style NONE and paints
          // nothing at all.
          "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2",
          "focus-visible:outline-[color:var(--color-da-brand)]",
        )}
        role="slider"
        tabIndex={0}
        aria-label="Orbit the dome"
        aria-valuetext={`Azimuth ${Math.round(azimuth)} degrees, elevation ${Math.round(elevation)} degrees`}
        aria-valuenow={Math.round(azimuth)}
        aria-valuemin={0}
        aria-valuemax={360}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {/* Silhouette — the sphere's own limb, and the ground the wires sit on. */}
        <circle cx={CX} cy={CY} r={GLOBE_R} className="fill-da-field stroke-da-border" strokeWidth={1} />

        {/* Far side first, faint, so the near side overdraws it. */}
        <g fill="none" strokeWidth={1} className="stroke-da-muted" opacity={0.25}>
          <path d={globe.equator.back} />
          {globe.others.map((c, i) => <path key={`mb${i}`} d={c.back} />)}
        </g>
        <path d={globe.prime.back} fill="none" strokeWidth={1.3} className="stroke-da-brand" opacity={0.3} />

        {/* Near side. */}
        <g fill="none" strokeWidth={1.1} className="stroke-da-muted" opacity={0.8}>
          {globe.others.map((c, i) => <path key={`mf${i}`} d={c.front} />)}
        </g>
        {/* The equator carries elevation: a flat line at 0, an open ellipse
            as you climb. Brighter than its neighbours because it is the one
            the eye should track for the vertical axis. */}
        <path d={globe.equator.front} fill="none" strokeWidth={1.5} className="stroke-da-label" />
        <path d={globe.prime.front} fill="none" strokeWidth={2} className="stroke-da-brand" strokeLinecap="round" />

        {/* Pole marker — walks from the rim to the centre as elevation rises. */}
        <circle cx={globe.northPole.x} cy={globe.northPole.y} r={2.6} className="fill-da-brand" />

        {/* Direction affordances. Aria-hidden: they duplicate the arrow keys,
            which the slider role already advertises, so exposing them as a
            second set of controls would only clutter the a11y tree. */}
        {CHEVRONS.map(({ id, dx, dy }) => {
          const cx = CX + dx * CHEVRON_R;
          const cy = CY + dy * CHEVRON_R;
          // Point outward: the arrow's tip sits further from centre than its wings.
          const tip = `${cx + dx * 3.2} ${cy + dy * 3.2}`;
          const wingA = `${cx - dx * 1.6 + dy * 3.6} ${cy - dy * 1.6 + dx * 3.6}`;
          const wingB = `${cx - dx * 1.6 - dy * 3.6} ${cy - dy * 1.6 - dx * 3.6}`;
          return (
            <g
              key={id}
              aria-hidden
              className="cursor-pointer text-da-muted transition-colors hover:text-da-text"
              onPointerDown={(e) => {
                e.stopPropagation();
                nudge(dx, dy, e.shiftKey);
              }}
            >
              <circle cx={cx} cy={cy} r={8} fill="transparent" />
              <path d={`M${tip}L${wingA}L${wingB}Z`} fill="currentColor" />
            </g>
          );
        })}
      </svg>

      <span className="text-3xs font-bold tabular-nums tracking-[0.04em] text-da-label">
        {Math.round(azimuth).toString().padStart(3, "0")}° /{" "}
        {elevation >= 0 ? "+" : "−"}
        {Math.abs(Math.round(elevation))}°
      </span>
    </div>
  );
}
