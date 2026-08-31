"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { ALL_FACES, PRESENT_FACES, FACE_MAP } from "../data/geometry";
import { CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE, CAMERA_TRANSITION_MS } from "../config";
import { useDomeStore } from "../store/domeStore";
import { FaceShell } from "./FaceShell";
import { ElementLayer } from "./ElementLayer";
import { FaceStatusTexture } from "./FaceStatusTexture";
import {
  DOME_CENTER_TARGET,
  DOME_UP,
  centeredFrame,
  faceFrame,
  frameToPosition,
  positionToOrientation,
  viewportFraming,
} from "../lib/cameraFraming";
import { useDragThreshold } from "../hooks/useDragThreshold";
import type { CameraPreset } from "../types";

function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.dataset.motion === "reduced") return true;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * DomeScene — the scene graph root inside the R3F Canvas.
 *
 * Maps 26 present faces to FaceShell + ElementLayer pairs.
 * The 6 absent faces render as ghost outlines (bottom cap boundary).
 * OrbitControls with damping, clamped distance.
 *
 * No bloom, no emissive glow, no HDR tone mapping, no skybox, no auto-rotation.
 * Tone mapping stays NoToneMapping so colours in the scene match the panel badges.
 */
export function DomeScene({
  manualPreset,
  showHoverTag = true,
}: {
  /** Preset used when nothing is selected. */
  manualPreset: CameraPreset;
  /** Forwarded to every FaceShell — see the note there. */
  showHoverTag?: boolean;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate, size, gl, scene } = useThree();

  // The dome is Z-up: `Face.elevationDeg` is `asin(normal.z)`, the zenith
  // pentagon sits at +Z and the missing foot at -Z. three.js defaults to
  // Y-up, which put OrbitControls' orbit axis on a HORIZONTAL axis of the
  // dome — vertical drags tumbled it sideways, every framed face landed
  // rolled to whatever angle world +Y happened to project to, and the N/S
  // presets (elevation 0, camera on ±Y) sat exactly on the up vector, where
  // `lookAt` has no defined roll at all.
  //
  // Set during render rather than in an effect on purpose: OrbitControls
  // snapshots `object.up` ONCE, in its constructor
  // (`this._quat = setFromUnitVectors(object.up, (0,1,0))`, three r184) and
  // never re-reads it — and drei constructs it in a render-phase useMemo of
  // the child below. An effect here would run after that snapshot was
  // already taken from the wrong vector.
  useMemo(() => camera.up.fromArray(DOME_UP), [camera]);

  const clearSelection = useDomeStore((s) => s.clearSelection);
  const selection = useDomeStore((s) => s.selection);
  const reframeNonce = useDomeStore((s) => s.reframeNonce);
  const alarmsOpen = useDomeStore((s) => s.alarmsOpen);
  const panelWidth = useDomeStore((s) => s.panelWidth);
  const orbitRequest = useDomeStore((s) => s.orbitRequest);
  const snapshotRequest = useDomeStore((s) => s.snapshotRequest);
  const emptySpaceDragGuard = useDragThreshold();

  // The camera always targets the dome's true centre, selected or not — the
  // left-shift for the detail panel is a separate projection-level offset
  // (below), not a change to what the camera orbits around. See
  // lib/cameraFraming.ts for why those two had to be split apart.
  const activeFrame = useMemo(() => {
    if (selection.level !== "array" && selection.faceNum !== undefined) {
      const face = FACE_MAP[selection.faceNum];
      if (face) return faceFrame(face);
    }
    return centeredFrame(manualPreset.azimuth, manualPreset.elevation, manualPreset.distance);
    // reframeNonce is a deliberate cache-buster, not a read value — "Zoom to
    // Face" bumps it to force a recompute even when selection hasn't
    // changed (the user drifted away with the orbit controls).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.level, selection.faceNum, manualPreset, camera, reframeNonce]);

  // Absent faces (bottom cap)
  const absentFaces = ALL_FACES.filter((f) => !f.present);

  // Apply camera frame (preset or selected face) — a plain Vector3 lerp of
  // camera.position PLUS an independent lerp of the look-at target, so a
  // face selection can move both where the camera sits and what it's
  // biased toward in one synchronized motion.
  //
  // `frameToPosition` owns the spherical->cartesian step (lib/cameraFraming.ts).
  // It used to be inlined here in a different angle convention from the one
  // the face data is in, which is what sent the camera to the wrong face; it
  // also has to be anchored at the orbit target, not the world origin, or the
  // camera never actually lands on the boresight it was given.
  // Set by the fly-to below while it is in flight, so anything that takes
  // over the camera mid-transition can stop it first. Two things write
  // camera.position every frame is one thing too many: they fight, and
  // whichever runs last wins the frame, which reads as juddering.
  const cancelTransitionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!activeFrame || !controls) return;

    const endTarget = new THREE.Vector3(...activeFrame.target);
    const endPos = new THREE.Vector3(...frameToPosition(activeFrame));
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    const settle = (position: THREE.Vector3, target: THREE.Vector3) => {
      camera.position.copy(position);
      camera.lookAt(target);
      controls.target.copy(target);
      controls.update();
      invalidate();
    };

    if (prefersReducedMotion()) {
      settle(endPos, endTarget);
      return;
    }

    // One in-flight transition at a time. Without the cancel, clicking a
    // second tile mid-flight left BOTH loops writing camera.position every
    // frame — they fight, the dome judders, and whichever loop happens to
    // finish last wins, so the camera can settle on the face you no longer
    // have selected. Cleanup runs before the next effect, and the new lerp
    // starts from wherever this one got to, so interrupting still looks
    // like one continuous move.
    let frame = 0;
    let cancelled = false;
    const startTime = performance.now();
    const lerped = new THREE.Vector3();

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cancelTransitionRef.current = null;
    };
    cancelTransitionRef.current = stop;

    const animate = () => {
      if (cancelled) return;
      const t = Math.min(1, (performance.now() - startTime) / CAMERA_TRANSITION_MS);
      // Smooth ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      settle(
        lerped.lerpVectors(startPos, endPos, ease),
        startTarget.clone().lerp(endTarget, ease),
      );

      if (t < 1) frame = requestAnimationFrame(animate);
      else cancelTransitionRef.current = null;
    };
    frame = requestAnimationFrame(animate);

    // A drag, a wheel or a puck grab that starts mid-flight takes the camera
    // over immediately rather than wrestling the remaining frames for it.
    // OrbitControls raises "start" only for real user input, never for the
    // `controls.update()` calls the loop above makes.
    controls.addEventListener("start", stop);

    return () => {
      controls.removeEventListener("start", stop);
      stop();
    };
  }, [activeFrame, camera, invalidate]);

  // A hand-driven orbit from the HUD puck: snap to the requested heading at
  // whatever distance the camera is already at, so the puck turns the dome
  // without also dollying it. `frameToPosition` again — the puck speaks the
  // same azimuth/elevation the faces and presets do, and nothing here has
  // its own idea of what those mean.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!orbitRequest || !controls) return;

    cancelTransitionRef.current?.();

    const target = controls.target;
    const distance = camera.position.distanceTo(target);
    camera.position.set(
      ...frameToPosition({
        azimuth: orbitRequest.azimuth,
        elevation: orbitRequest.elevation,
        distance,
        target: [target.x, target.y, target.z],
      }),
    );
    camera.lookAt(target);
    controls.update();
    invalidate();
  }, [orbitRequest, camera, invalidate]);

  // Snapshot the viewport as a PNG.
  //
  // This has to live in the scene, and it has to be synchronous. The canvas
  // runs `frameloop="demand"` without `preserveDrawingBuffer`, so the WebGL
  // drawing buffer is only valid to read back inside the same task that drew
  // it — hence the explicit `gl.render` immediately before `toDataURL`
  // rather than reading whatever happens to be there. Turning
  // preserveDrawingBuffer on instead would make every frame of a 7 557-dot
  // scene pay for a capture that happens once in a session.
  //
  // The result is then composited onto the viewport's own backdrop, because
  // the canvas is deliberately transparent (DomeCanvas: `alpha: true`, clear
  // colour 0). Exporting it raw hands the operator a dome floating on
  // nothing, which lands unreadable in any light-background document.
  useEffect(() => {
    if (!snapshotRequest) return;

    gl.render(scene, camera);

    const source = gl.domElement;

    // Crop away the strip the detail panel is sitting on. The panel overlays
    // the canvas rather than resizing it, so the renderer happily draws a
    // full-width frame whose right ~46% nobody can see — and the projection
    // has already shifted the dome out of it (`setViewOffset`, below). Export
    // that raw and you hand someone a dome squashed against the left edge of
    // a half-empty picture. Cropping to the same strip the framing maths
    // already targets makes the file match what is on screen.
    //
    // `source` is sized in device pixels and `size` in CSS pixels, hence the
    // ratio rather than using obstructedPx directly.
    const panelOpen = selection.level !== "array" || alarmsOpen;
    const { obstructedPx } = viewportFraming(
      size.width,
      size.height,
      panelWidth,
      activeFrame.distance,
      panelOpen,
    );
    const scale = size.width > 0 ? source.width / size.width : 1;
    const visibleWidth = Math.max(1, Math.round(source.width - obstructedPx * scale));

    const sheet = document.createElement("canvas");
    sheet.width = visibleWidth;
    sheet.height = source.height;
    const ctx = sheet.getContext("2d");
    if (!ctx) return;

    const backdrop = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-da-dome-viewport")
      .trim();
    ctx.fillStyle = backdrop || "#0a1512";
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.drawImage(source, 0, 0, visibleWidth, source.height, 0, 0, visibleWidth, source.height);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const link = document.createElement("a");
    link.href = sheet.toDataURL("image/png");
    link.download = `dome-array-${stamp}.png`;
    link.click();
  }, [
    snapshotRequest,
    gl,
    scene,
    camera,
    selection.level,
    alarmsOpen,
    panelWidth,
    activeFrame.distance,
    size.width,
    size.height,
  ]);

  // Semantic zoom (PHASEPLAN §4 tech stack): every camera move (drag, wheel,
  // or the preset animation loop above, which calls invalidate() every
  // frame) reports distance-from-target so ElementLayer/FaceStatusTexture
  // can swap between per-element dots and the face-aggregate texture. The
  // same report carries the heading the orbit puck reads back, so the puck
  // tracks the camera however it was moved — including by the puck.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const reportPose = () => {
      const target = controls.target;
      const { azimuth, elevation } = positionToOrientation(
        [camera.position.x, camera.position.y, camera.position.z],
        [target.x, target.y, target.z],
      );
      useDomeStore
        .getState()
        .setCameraPose(camera.position.distanceTo(target), azimuth, elevation);
    };
    controls.addEventListener("change", reportPose);
    reportPose();
    return () => controls.removeEventListener("change", reportPose);
  }, [camera]);

  // Frame the dome inside the part of the canvas the operator can actually
  // see, and left-shift the RENDERED frame out from under the detail panel —
  // via projection-level changes only, never by moving the orbit target (see
  // the long comment on `activeFrame` above and lib/cameraFraming.ts). Because
  // this never touches camera.position/target, free 360 degree orbiting keeps
  // working exactly the same whether or not the panel is open; the crop just
  // re-centres on whatever the camera is currently pointed at.
  //
  // The shift is derived from the panel's MEASURED width, not from a fixed
  // fraction of canvas width. An earlier version used the latter and drifted:
  // PANEL_WIDTH_CSS resolves against a root font-size of
  // `min(1.1111vw, 1.8223vh)` (globals.css), so on any viewport taller than
  // ~16:10 the panel's share of the card grows with HEIGHT while the canvas
  // width — and therefore the fixed shift — does not. Entering fullscreen at
  // 1920x1080 took the panel from 38% of the card to 46% and left the dome
  // ~170 px too far right, touching the panel edge; the same error was
  // present windowed, just with enough slack to hide it.
  //
  // fov and the offset are set in ONE effect on purpose: `setViewOffset`
  // rebuilds the projection matrix as its last act, so a separate fov effect
  // would race it and land a frame late.
  //
  // Trap: `setViewOffset(fullWidth, fullHeight, ...)` sets `camera.aspect =
  // fullWidth / fullHeight` as a side effect (three.js source, first line of
  // the method) — it is not just a projection tweak, it overwrites the
  // camera's own aspect property with the WIDENED sensor's ratio.
  // `clearViewOffset()` does NOT undo this (it only flips `view.enabled` and
  // recomputes the projection matrix from whatever `.aspect` currently is),
  // so `.aspect` is reassigned from the true canvas ratio on every run below
  // rather than only on the closing one. Without that, the dome renders
  // squeezed from the moment the panel first opens onward — including after
  // it closes, since nothing else in R3F re-derives `.aspect` unless the
  // canvas itself actually resizes.
  useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    if (typeof perspectiveCamera.setViewOffset !== "function") return;
    if (size.width === 0 || size.height === 0) return;

    // Alarms count as an open panel: it is the same overlay at the same
    // width, so it hides the dome exactly as much as a face selection does.
    const panelOpen = selection.level !== "array" || alarmsOpen;

    const { fov, obstructedPx } = viewportFraming(
      size.width,
      size.height,
      panelWidth,
      activeFrame.distance,
      panelOpen,
    );

    // Mutating the camera IS the API here — three.js has no immutable path
    // for fov/aspect/view-offset, and R3F hands out the live camera object
    // precisely so scenes can drive it. (Pre-existing on this effect; the
    // rule cannot tell an owned imperative handle from shared state.)
    /* eslint-disable react-hooks/immutability */
    perspectiveCamera.fov = fov;
    perspectiveCamera.aspect = size.width / size.height;

    if (obstructedPx > 0) {
      // Render as if the sensor were `obstructedPx` wider than the canvas and
      // the canvas were aligned to its right edge. World origin then lands at
      // `fullWidth / 2 - offsetX` px from the left — i.e. the centre of the
      // unobstructed strip — while the visible frustum keeps the canvas's own
      // aspect and scale. Nothing here scales the dome; it only moves.
      const fullWidth = size.width + obstructedPx;
      perspectiveCamera.setViewOffset(fullWidth, size.height, obstructedPx, 0, size.width, size.height);
    } else {
      perspectiveCamera.clearViewOffset();
    }

    perspectiveCamera.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */

    invalidate();
  }, [
    selection.level,
    alarmsOpen,
    panelWidth,
    activeFrame.distance,
    size.width,
    size.height,
    camera,
    invalidate,
  ]);

  return (
    <>
      {/* Lighting — subtle, no HDR */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 8]} intensity={0.7} />
      <directionalLight position={[-3, -2, 4]} intensity={0.3} />

      {/* Click on empty space clears selection */}
      <mesh
        visible={false}
        position={[0, 0, 0]}
        onPointerDown={emptySpaceDragGuard.onPointerDown}
        onClick={(e) => {
          if (emptySpaceDragGuard.isDrag(e)) return;
          clearSelection();
        }}
      >
        <sphereGeometry args={[15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Present faces — full shells + elements */}
      {PRESENT_FACES.map((face) => (
        <group key={face.fceNum}>
          <FaceShell face={face} showHoverTag={showHoverTag} />
          <ElementLayer face={face} />
          <FaceStatusTexture face={face} />
        </group>
      ))}

      {/* Absent faces — ghost outlines only */}
      {absentFaces.map((face) => (
        <FaceShell key={face.fceNum} face={face} isAbsent />
      ))}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.12}
        minDistance={CAMERA_MIN_DISTANCE}
        maxDistance={CAMERA_MAX_DISTANCE}
        target={DOME_CENTER_TARGET}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.7}
        zoomSpeed={0.8}
        makeDefault
      />
    </>
  );
}
