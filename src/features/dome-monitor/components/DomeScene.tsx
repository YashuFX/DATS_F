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
import { DOME_CENTER_TARGET, centeredFrame, faceFrame, viewportFraming } from "../lib/cameraFraming";
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
}: {
  /** Preset used when nothing is selected. */
  manualPreset: CameraPreset;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate, size } = useThree();

  const clearSelection = useDomeStore((s) => s.clearSelection);
  const selection = useDomeStore((s) => s.selection);
  const reframeNonce = useDomeStore((s) => s.reframeNonce);
  const alarmsOpen = useDomeStore((s) => s.alarmsOpen);
  const panelWidth = useDomeStore((s) => s.panelWidth);
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

  // Apply camera frame (preset or face-biased) — a plain Vector3 lerp of
  // camera.position PLUS an independent lerp of the look-at target, so a
  // face selection can move both where the camera sits and what it's
  // biased toward in one synchronized motion.
  useEffect(() => {
    if (!activeFrame || !controlsRef.current) return;

    const azRad = (activeFrame.azimuth * Math.PI) / 180;
    const elRad = (activeFrame.elevation * Math.PI) / 180;
    const d = activeFrame.distance;

    const endTarget = new THREE.Vector3(...activeFrame.target);
    const x = d * Math.cos(elRad) * Math.sin(azRad);
    const y = d * Math.cos(elRad) * Math.cos(azRad);
    const z = d * Math.sin(elRad);

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(x, y, z);
    const startTarget = controlsRef.current.target.clone();

    if (prefersReducedMotion()) {
      camera.position.copy(endPos);
      camera.lookAt(endTarget);
      controlsRef.current.target.copy(endTarget);
      controlsRef.current.update();
      invalidate();
      return;
    }

    const startTime = performance.now();
    const duration = CAMERA_TRANSITION_MS;

    function animate() {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / duration);
      // Smooth ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPos, endPos, ease);
      const target = startTarget.clone().lerp(endTarget, ease);
      camera.lookAt(target);
      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
      invalidate();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }
    animate();
  }, [activeFrame, camera, invalidate]);

  // Semantic zoom (PHASEPLAN §4 tech stack): every camera move (drag, wheel,
  // or the preset animation loop above, which calls invalidate() every
  // frame) reports distance-from-target so ElementLayer/FaceStatusTexture
  // can swap between per-element dots and the face-aggregate texture.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const reportDistance = () => {
      useDomeStore.getState().setCameraDistance(camera.position.distanceTo(controls.target));
    };
    controls.addEventListener("change", reportDistance);
    reportDistance();
    return () => controls.removeEventListener("change", reportDistance);
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
          <FaceShell face={face} />
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
