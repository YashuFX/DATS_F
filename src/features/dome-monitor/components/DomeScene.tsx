"use client";

import { OrbitControls, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { ALL_FACES, PRESENT_FACES } from "../data/geometry";
import { CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE, CAMERA_DEFAULT_DISTANCE, CAMERA_PRESETS, CAMERA_TRANSITION_MS } from "../config";
import { useDomeStore } from "../store/domeStore";
import { FaceShell } from "./FaceShell";
import { ElementLayer } from "./ElementLayer";
import type { CameraPreset } from "../types";

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
  activePreset,
}: {
  activePreset: CameraPreset | null;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate } = useThree();

  const clearSelection = useDomeStore((s) => s.clearSelection);

  // Absent faces (bottom cap)
  const absentFaces = ALL_FACES.filter((f) => !f.present);

  // Apply camera preset
  useEffect(() => {
    if (!activePreset || !controlsRef.current) return;

    const azRad = (activePreset.azimuth * Math.PI) / 180;
    const elRad = (activePreset.elevation * Math.PI) / 180;
    const d = activePreset.distance;

    const target = new THREE.Vector3(0, 0, 0.5); // Slight offset up since dome is mostly upper hemisphere
    const x = d * Math.cos(elRad) * Math.sin(azRad);
    const y = d * Math.cos(elRad) * Math.cos(azRad);
    const z = d * Math.sin(elRad);

    // Animate the transition
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(x, y, z);
    const startTime = performance.now();
    const duration = CAMERA_TRANSITION_MS;

    function animate() {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / duration);
      // Smooth ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPos, endPos, ease);
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
  }, [activePreset, camera, invalidate]);

  // Set initial camera position
  useEffect(() => {
    const preset = CAMERA_PRESETS[0]; // ISO
    const azRad = (preset.azimuth * Math.PI) / 180;
    const elRad = (preset.elevation * Math.PI) / 180;
    const d = preset.distance;

    camera.position.set(
      d * Math.cos(elRad) * Math.sin(azRad),
      d * Math.cos(elRad) * Math.cos(azRad),
      d * Math.sin(elRad),
    );
    camera.lookAt(0, 0, 0.5);
    invalidate();
  }, [camera, invalidate]);

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
        onClick={() => clearSelection()}
      >
        <sphereGeometry args={[15, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Present faces — full shells + elements */}
      {PRESENT_FACES.map((face) => (
        <group key={face.fceNum}>
          <FaceShell face={face} />
          <ElementLayer face={face} />
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
        target={[0, 0, 0.5]}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.7}
        zoomSpeed={0.8}
        makeDefault
      />
    </>
  );
}
