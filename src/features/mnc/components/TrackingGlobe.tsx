"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Home, Crosshair, Maximize, Radar, Tags, Map as MapIcon, Box, RefreshCw, Focus, Lock } from "lucide-react";
import { cn } from "@/features/data-archival/lib/cn";
import { TRACKING, BEAMS, BEAMS_PER_TARGET } from "../data/mnc.mock";
import { useSimStore, activeTarget, TIME_SCALES } from "../sim/simStore";
import { useSimClock } from "../sim/useSimClock";
import { beamDirections, carryingBeamIndex, separationDeg } from "../sim/beamPlanner";
import type { Basemap, GlobeApi, Projection } from "../globeApi";
import { TRACK_COLOUR } from "../trackColours";

const CesiumGlobe = dynamic(() => import("./CesiumGlobe").then((m) => ({ default: m.CesiumGlobe })), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center">
      <div className="flex flex-col items-center gap-[0.5rem]">
        <RefreshCw className="size-[1.25rem] animate-spin text-da-brand" strokeWidth={2} />
        <span className="text-3xs font-semibold uppercase tracking-[0.09em] text-da-label">Loading globe…</span>
      </div>
    </div>
  ),
});

function GlobeButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof Home;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex size-[1.5rem] cursor-pointer items-center justify-center rounded-[0.1875rem] transition-colors",
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]",
        active ? "bg-da-brand text-da-on-brand" : "text-da-muted hover:bg-da-subtle hover:text-da-text",
      )}
    >
      <Icon className="size-[0.8125rem]" strokeWidth={2.1} />
    </button>
  );
}

/**
 * One figure with its caption — the strip's repeated unit.
 *
 * `dot` is not decoration. The globe paints in-view objects blue, served ones
 * amber and unserved ones red, and before this the strip repeated those hues on
 * the VALUE TEXT, which put identity on the one element that has to stay
 * readable and left the colours unexplained besides. Moving the hue onto a mark
 * beside the label turns the strip into the globe's legend — the amber dot here
 * is the amber dot out there — and leaves every number in plain ink.
 */
function Figure({
  label,
  value,
  dot,
  hint,
}: {
  label: string;
  value: string;
  /** CSS colour of the legend mark, matching how the globe draws this class. */
  dot?: string;
  hint?: string;
}) {
  return (
    <span className="flex flex-col justify-end leading-none" title={hint}>
      <span className="flex items-center gap-[0.25rem]">
        {dot && (
          <span
            aria-hidden
            className="size-[0.3125rem] shrink-0 rounded-full"
            style={{ background: dot }}
          />
        )}
        <span className="text-[0.5rem] font-bold uppercase tracking-[0.08em] whitespace-nowrap text-da-label">
          {label}
        </span>
      </span>
      {/* Tabular figures on a standalone value, against the usual advice: every
          one of these reticks four times a second, and proportional digits make
          the whole strip shuffle sideways on each tick. At 10px there is no
          display-size looseness to trade against. */}
      <span className="da-nums mt-[0.1875rem] text-2xs font-bold whitespace-nowrap text-da-text">
        {value}
      </span>
    </span>
  );
}

/** Hairline between two groups of figures. */
function Rule() {
  return (
    <span aria-hidden className="my-[0.0625rem] w-[max(1px,0.0625rem)] shrink-0 self-stretch bg-da-border" />
  );
}

/** The narrowing between one figure and the next. */
function Step() {
  return (
    <span aria-hidden className="self-end pb-[0.0625rem] text-2xs font-bold text-da-border-strong">
      ›
    </span>
  );
}

/**
 * Capacity strip — the question this panel exists to answer.
 *
 * It reads left to right as a FUNNEL, because that is what the numbers are: a
 * catalogue of 300 objects, of which some are above the horizon, of which fewer
 * are inside the tracking volume, of which the aperture serves as many as its
 * geometry and its beam budget allow. The previous version printed the same
 * seven figures as one undifferentiated row of label/value pairs, which made
 * every number look equally important and hid the only relationship between
 * them — that each is a subset of the one before it. The chevrons and the group
 * rules are that relationship, drawn.
 *
 * The budget is a METER rather than an eighth number. "138 of 416" is a ratio
 * against a fixed limit, and a ratio against a limit is the one thing a bar
 * says instantly and a pair of integers never does: an operator should be able
 * to see the aperture filling up without reading anything.
 */
function CapacityStrip() {
  const plan = useSimStore((s) => s.plan);
  const states = useSimStore((s) => s.states);
  const running = useSimStore((s) => s.running);

  const aboveHorizon = states.filter((s) => s.elevationDeg > 0).length;
  const unserved = plan.rejected.length;
  const utilisation = plan.beamsTotal ? (plan.beamsUsed / plan.beamsTotal) * 100 : 0;

  /* Severity on the FILL, with the track a lighter step of the same hue, so
     the state of the budget reads across the whole bar rather than only across
     the filled part of it. */
  const level =
    utilisation >= 90
      ? { fill: "var(--color-da-danger)", track: "var(--color-da-danger-soft)", ink: "text-da-danger" }
      : utilisation >= 75
        ? { fill: "var(--color-da-warn)", track: "var(--color-da-warn-soft)", ink: "text-da-warn-text" }
        : { fill: "var(--color-da-brand)", track: "var(--color-da-brand-soft)", ink: "text-da-brand" };

  return (
    <div className="pointer-events-none absolute inset-x-[0.5rem] bottom-[0.5rem] z-10 flex flex-wrap items-stretch gap-x-[0.75rem] gap-y-[0.5rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 px-[0.75rem] py-[0.5rem] shadow-da-card backdrop-blur-[0.35rem]">
      {/* Run state, first — every figure to the right of it is only meaningful
          once you know whether the clock is moving. */}
      <span className="flex shrink-0 items-center gap-[0.375rem] self-end pb-[0.0625rem]">
        <span
          className={cn(
            "size-[0.4375rem] shrink-0 rounded-full",
            running ? "animate-pulse bg-da-success" : "bg-da-label",
          )}
        />
        <span
          className={cn(
            "text-[0.5rem] font-bold uppercase tracking-[0.1em] whitespace-nowrap",
            running ? "text-da-success" : "text-da-label",
          )}
        >
          {running ? "Live" : "Stopped"}
        </span>
      </span>

      <Rule />

      {/* The funnel. Most of the catalogue is below the horizon or out of range
          at any instant — that gap is the point, not an omission. */}
      <Figure label="Catalogue" value={`${states.length}`} hint="Objects the simulation propagates" />
      <Step />
      <Figure
        label="Above horizon"
        value={`${aboveHorizon}`}
        hint="Elevation above 0°, before the mask and the range limit"
      />
      <Step />
      <Figure
        label="In view"
        value={`${plan.visibleCount}`}
        dot={TRACK_COLOUR.visible}
        hint={`Inside the tracking volume — above ${TRACKING.elevationMaskDeg}° and within ${TRACKING.maxRangeKm} km`}
      />
      <Step />
      <Figure
        label="Tracked"
        value={`${plan.assignments.length}`}
        dot={TRACK_COLOUR.tracked}
        hint="In view and holding a beam cluster"
      />
      {unserved > 0 && (
        <Figure
          label="Unserved"
          value={`${unserved}`}
          dot={TRACK_COLOUR.unserved}
          hint="In view but out of any face's scan cone, or out of channels"
        />
      )}

      <Rule />

      {/* The budget, as a ratio against its limit. */}
      <span className="flex min-w-[8rem] flex-1 flex-col justify-end gap-[0.25rem] leading-none">
        <span className="flex items-baseline justify-between gap-[0.5rem]">
          <span className="text-[0.5rem] font-bold uppercase tracking-[0.08em] whitespace-nowrap text-da-label">
            Beam budget
          </span>
          <span className="da-nums text-[0.5rem] font-bold whitespace-nowrap text-da-label">
            {plan.budgetCapacityTargets} tgt max
          </span>
        </span>
        <span className="flex items-center gap-[0.5rem]">
          <span
            role="meter"
            aria-valuenow={Math.round(utilisation)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Beam channels committed"
            className="h-[0.3125rem] min-w-0 flex-1 overflow-hidden rounded-full"
            style={{ background: level.track }}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.min(100, utilisation)}%`, background: level.fill }}
            />
          </span>
          <span className={cn("da-nums shrink-0 text-2xs font-bold whitespace-nowrap", level.ink)}>
            {utilisation.toFixed(0)}%
          </span>
          <span className="da-nums hidden shrink-0 text-2xs font-bold whitespace-nowrap text-da-text sm:inline">
            {plan.beamsUsed}/{plan.beamsTotal}
          </span>
        </span>
      </span>
    </div>
  );
}

/**
 * The active target's look angles and its six beams.
 *
 * The beam list is not decoration: it is what makes the difference between
 * "pointing at it" and "tracking it" visible. The cluster is drawn about the
 * COMMANDED direction, the target has drifted somewhere off it, and exactly
 * one of the five tracking beams is holding it — the row marked here, and the
 * beam the data downlink is riding. An operator watching that mark move from
 * SUM to ΔEL+ and back is watching the pointing loop work; a list of five
 * identical directions would show none of it.
 */
function TargetCard() {
  const target = useSimStore(activeTarget);
  const plan = useSimStore((s) => s.plan);
  const pointing = useSimStore((s) => s.pointing);
  if (!target) return null;

  const assignment = plan.assignments.find((a) => a.satelliteId === target.id);
  // Falling back to the target's own direction covers the frame between
  // selecting an object and the array being re-steered onto it.
  const commanded =
    pointing?.satelliteId === target.id
      ? pointing
      : { azimuthDeg: target.azimuthDeg, elevationDeg: target.elevationDeg };
  const beams = beamDirections(commanded.azimuthDeg, commanded.elevationDeg);
  const carrying = carryingBeamIndex(beams, target.azimuthDeg, target.elevationDeg);
  const driftDeg = separationDeg(
    target.azimuthDeg,
    target.elevationDeg,
    commanded.azimuthDeg,
    commanded.elevationDeg,
  );

  return (
    <div className="pointer-events-none absolute top-[2.5rem] right-[0.5rem] z-10 hidden w-[11rem] flex-col gap-[0.3125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-surface/92 px-[0.5rem] py-[0.4375rem] shadow-da-card backdrop-blur-[0.25rem] sm:flex">
      <span className="flex items-baseline justify-between gap-[0.375rem]">
        <span className="text-3xs font-bold uppercase tracking-[0.07em] text-da-danger">{target.id}</span>
        <span className="text-3xs font-medium text-da-muted">{target.regime}</span>
      </span>

      <dl className="flex flex-col gap-[0.125rem]">
        {[
          ["Azimuth", `${target.azimuthDeg.toFixed(2)}°`],
          ["Elevation", `${target.elevationDeg.toFixed(2)}°`],
          ["Range", `${target.rangeKm.toFixed(0)} km`],
          ["Range rate", `${target.rangeRateKmS >= 0 ? "+" : ""}${target.rangeRateKmS.toFixed(2)} km/s`],
          // How far the spacecraft has walked off the commanded direction
          // since the array last re-steered. This is the number the five-beam
          // cluster exists to tolerate, so it belongs beside the beam list.
          ["Pointing drift", `${driftDeg.toFixed(2)}°`],
        ].map(([k, val]) => (
          <div key={k} className="flex items-baseline justify-between gap-[0.375rem]">
            <dt className="text-3xs text-da-muted">{k}</dt>
            <dd className="da-nums text-3xs font-semibold text-da-text">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t-[max(1px,0.0625rem)] border-da-border/70 pt-[0.3125rem]">
        <span className="flex items-baseline justify-between gap-[0.375rem]">
          <span className="text-[0.5rem] font-bold uppercase tracking-[0.07em] text-da-label">
            Beams · {BEAMS_PER_TARGET} · {BEAMS.beamwidthDeg}°
          </span>
          {assignment && (
            <span className="da-nums text-3xs font-semibold text-da-muted">
              F{assignment.faceNum} · {assignment.offBoresightDeg.toFixed(1)}° off
            </span>
          )}
        </span>
        <ul className="mt-[0.25rem] grid grid-cols-2 gap-x-[0.375rem] gap-y-[0.125rem]">
          {beams.map((b, i) => {
            // The data beam has no direction of its own — it rides whichever
            // tracking beam is holding the target, so it is labelled with that
            // beam rather than with a duplicate of the commanded direction.
            const isCarrying = b.role === "tracking" && i === carrying;
            return (
              <li key={b.id} className="flex items-center gap-[0.25rem]">
                <span
                  className="size-[0.3125rem] shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      b.role === "data"
                        ? "var(--color-da-success)"
                        : isCarrying
                          ? "var(--color-da-warn)"
                          : "transparent",
                    boxShadow: isCarrying ? "0 0 0 0.0625rem var(--color-da-warn)" : undefined,
                    border: b.role === "tracking" && !isCarrying
                      ? "max(1px,0.0625rem) solid var(--color-da-warn)"
                      : undefined,
                    opacity: b.role === "tracking" && !isCarrying ? 0.45 : 1,
                  }}
                />
                <span
                  className={cn(
                    "da-nums text-[0.5rem] font-semibold",
                    isCarrying || b.role === "data" ? "text-da-text" : "text-da-muted",
                  )}
                >
                  {b.role === "data" ? `${b.id} → ${beams[carrying].id}` : b.id}
                </span>
                {/* The share of the target's six-beam allocation this beam
                    gets. The cluster is not six equal beams — the downlink is
                    worth spending on and the error channels are not — and a
                    list that printed six identical rows would hide the one
                    design decision in it. */}
                <span className="da-nums ml-auto text-[0.5rem] font-medium text-da-label">
                  {(b.share * 100).toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * The tracking display itself — globe, control rail, target card, capacity
 * strip — with no panel chrome of its own.
 *
 * Extracted so the M&C board and the tracking console show the SAME instrument
 * rather than two that drift. `/dashboard` wraps this in the board's `Panel`;
 * `/tracking` wraps it in that console's own card, which is why the chrome is
 * deliberately not part of it — a component that brought its own title rail
 * could only ever fit one of the two.
 *
 * `onReady` hands the `GlobeApi` up so a host can drive the globe from its own
 * controls. The tracking console's card header already has Show Orbits /
 * Trails / Labels checkboxes; without this they would stay the dead switches
 * they have always been.
 */
export function TrackingGlobe({
  className,
  showRail = true,
  onReady,
}: {
  className?: string;
  /** The vertical button rail on the canvas. A host with its own controls in
   *  its header can turn it off rather than offering two of everything. */
  showRail?: boolean;
  onReady?: (api: GlobeApi) => void;
}) {
  const apiRef = useRef<GlobeApi | null>(null);
  const [fov, setFov] = useState(true);
  const [labels, setLabels] = useState(true);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [projection, setProjection] = useState<Projection>("3d");
  const [follow, setFollow] = useState(false);
  const selectedId = useSimStore((s) => s.selectedId);

  // The clock lives with the display that shows it, so it stops when that
  // display unmounts rather than propagating 250 spacecraft for a screen
  // nobody is on. Refcounted in the hook, so mounting this on two routes at
  // once cannot run the simulation at double speed.
  useSimClock();

  const timeScale = useSimStore((s) => s.timeScale);
  const setTimeScale = useSimStore((s) => s.setTimeScale);

  /* Latched in an effect, not during render: the globe hands its API up once,
     long after mount, so the callback only has to be current by the time that
     happens — and writing a ref while rendering is how a concurrent re-render
     ends up publishing to a callback the host has already replaced. */
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const handleReady = useCallback((api: GlobeApi) => {
    apiRef.current = api;
    onReadyRef.current?.(api);
  }, []);

  // Re-lock when the operator picks a different object while following.
  // Cesium's trackedEntity is set once; without this the camera would stay
  // welded to the previous satellite after a new one was selected.
  useEffect(() => {
    if (follow) apiRef.current?.setFollowTarget(true);
  }, [follow, selectedId]);

  return (
    <div className={cn("relative size-full min-h-0", className)}>
      <CesiumGlobe onReady={handleReady} />

      {showRail && (
        <div className="absolute top-[0.5rem] left-[0.5rem] z-10 flex flex-col gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 p-[0.1875rem] shadow-da-card backdrop-blur-[0.25rem]">
          <GlobeButton icon={Home} label="Reset view" onClick={() => apiRef.current?.resetView()} />
          <GlobeButton icon={Crosshair} label="Centre on station" onClick={() => apiRef.current?.focusSite()} />
          <GlobeButton icon={Maximize} label="Fit all tracked objects" onClick={() => apiRef.current?.fitAll()} />
          <GlobeButton
            icon={Focus}
            label="Zoom to active target"
            onClick={() => apiRef.current?.zoomToTarget()}
          />
          <GlobeButton
            icon={Lock}
            label={follow ? "Stop following the target" : "Follow the active target"}
            active={follow}
            onClick={() => {
              const next = !follow;
              setFollow(next);
              apiRef.current?.setFollowTarget(next);
            }}
          />
          <GlobeButton
            icon={Radar}
            label={`${fov ? "Hide" : "Show"} tracking volume (${TRACKING.elevationMaskDeg}–90° el, ${TRACKING.maxRangeKm} km)`}
            active={fov}
            onClick={() => {
              const next = !fov;
              setFov(next);
              apiRef.current?.setFenceVisible(next);
            }}
          />
          <GlobeButton
            icon={Tags}
            label={`${labels ? "Hide" : "Show"} labels`}
            active={labels}
            onClick={() => {
              const next = !labels;
              setLabels(next);
              apiRef.current?.setLabelsVisible(next);
            }}
          />
        </div>
      )}

      <div className="absolute top-[0.5rem] right-[0.5rem] z-10 flex items-center gap-[0.125rem] rounded-[0.25rem] border-[max(1px,0.0625rem)] border-da-border bg-da-chrome/90 p-[0.1875rem] shadow-da-card backdrop-blur-[0.25rem]">
        {/* Time multiplier, running down to a tenth of real time. The slow end
            is the useful end here: the beam cluster hands the target between
            its five beams over a second or two, and above real time that
            handover is over before it can be read. The propagator still
            receives real timestamps, so the geometry stays true at any rate. */}
        <select
          value={timeScale}
          onChange={(e) => setTimeScale(Number(e.target.value))}
          aria-label="Simulation rate"
          title="Simulation rate — below 1× to watch the beams track, above it to skip between passes"
          className="da-nums mr-[0.125rem] cursor-pointer rounded-[0.1875rem] bg-transparent px-[0.25rem] py-[0.0625rem] text-[0.5625rem] font-bold text-da-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-da-brand)]"
        >
          {TIME_SCALES.map((x) => (
            <option key={x} value={x}>{x}×</option>
          ))}
        </select>
        <GlobeButton
          icon={MapIcon}
          label={basemap === "satellite" ? "Switch to street basemap" : "Switch to satellite imagery"}
          active={basemap === "street"}
          onClick={() => {
            const next: Basemap = basemap === "satellite" ? "street" : "satellite";
            setBasemap(next);
            apiRef.current?.setBasemap(next);
          }}
        />
        <GlobeButton
          icon={Box}
          label={projection === "3d" ? "Switch to 2D projection" : "Switch to 3D globe"}
          active={projection === "2d"}
          onClick={() => {
            const next: Projection = projection === "3d" ? "2d" : "3d";
            setProjection(next);
            apiRef.current?.setProjection(next);
          }}
        />
      </div>

      <TargetCard />
      <CapacityStrip />
    </div>
  );
}
