"use client";

import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useDomeStore } from "../store/domeStore";
import { ELEMENT_COLOURS } from "../config";
import { getFaceElements } from "../data/geometry";
import type { Face } from "../types";

const ELEMENT_SIZE = 0.025; // metres — radius of each element dot

/**
 * ElementLayer — instanced mesh rendering all elements on one face.
 *
 * One InstancedMesh per face, sharing one small circle geometry. The
 * instanceColor is driven by health/metric state. Clicking an instance
 * yields event.instanceId, giving element identity for free.
 *
 * Per-face decomposition keeps raycasting cheap: ~374 instances max per face
 * instead of brute-forcing 7,557.
 */
export function ElementLayer({ face }: { face: Face }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const telemetry = useDomeStore((s) => s.telemetry);
  const selection = useDomeStore((s) => s.selection);
  const selectElement = useDomeStore((s) => s.selectElement);
  const selectFace = useDomeStore((s) => s.selectFace);

  const faceTelemetry = telemetry.faces[face.fceNum];

  // Compute world positions for all elements on this face
  const positions = useMemo(() => getFaceElements(face), [face]);

  // Small circle geometry for each element
  const elementGeo = useMemo(() => {
    return new THREE.CircleGeometry(ELEMENT_SIZE, 8);
  }, []);

  const elementMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      toneMapped: false,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  // Set instance matrices (positions + orient to face normal)
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const normal = new THREE.Vector3(...face.normal);
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < positions.length; i++) {
      position.set(positions[i][0], positions[i][1], positions[i][2]);
      // Offset slightly along normal to avoid z-fighting with face shell
      position.addScaledVector(normal, 0.003);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [positions, face.normal, invalidate]);

  // Update instance colours from telemetry
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !faceTelemetry) return;

    const color = new THREE.Color();
    const isSelectedFace = selection.level !== "array" && selection.faceNum === face.fceNum;

    for (let i = 0; i < positions.length; i++) {
      const el = faceTelemetry.elements[i];
      if (!el) {
        color.set(ELEMENT_COLOURS.nominal);
      } else {
        const healthColour = ELEMENT_COLOURS[el.health] ?? ELEMENT_COLOURS.nominal;
        color.set(healthColour);
      }

      // Highlight selected element
      if (isSelectedFace && selection.level === "element" && selection.elementIdx === i) {
        color.set("#2dd4bf"); // brand colour
      }

      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [faceTelemetry, selection, positions.length, face.fceNum, invalidate]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[elementGeo, elementMat, positions.length]}
      onClick={(e) => {
        e.stopPropagation();
        const idx = e.instanceId;
        if (idx !== undefined && idx >= 0) {
          if (selection.level === "element" && selection.faceNum === face.fceNum && selection.elementIdx === idx) {
            selectFace(face.fceNum);
          } else {
            selectElement(face.fceNum, idx);
          }
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    />
  );
}
