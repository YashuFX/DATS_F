"use client";

import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useDomeStore } from "../store/domeStore";
import { getFaceElements } from "../data/geometry";
import { elementAppearance } from "../lib/elementAppearance";
import { useDragThreshold } from "../hooks/useDragThreshold";
import type { Face } from "../types";

const ELEMENT_SIZE = 0.025; // metres — base radius of each element dot

/**
 * ElementLayer — instanced mesh rendering all elements on one face.
 *
 * One InstancedMesh per face, sharing one small circle geometry. Position,
 * colour and per-instance scale are all written in a single effect so a
 * telemetry or metric-mode change never leaves the two out of sync — a fault
 * gets a bigger dot as well as a different colour (PHASEPLAN §Phase 3: "a
 * fault must be findable by size as well as hue"), so it stays findable in
 * greyscale or for a colour-blind operator.
 *
 * Past ELEMENT_VISIBILITY_DISTANCE the whole layer hides (semantic zoom —
 * FaceStatusTexture takes over as the aggregate view); R3F's pointer-event
 * system skips raycasting invisible objects, so this also caps picking cost
 * for free at the one range where 7 557 targets would matter most.
 */
export function ElementLayer({ face }: { face: Face }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const telemetry = useDomeStore((s) => s.telemetry);
  const selection = useDomeStore((s) => s.selection);
  const metricMode = useDomeStore((s) => s.metricMode);
  const showElements = useDomeStore((s) => s.elementsVisible);
  const selectElement = useDomeStore((s) => s.selectElement);
  const selectFace = useDomeStore((s) => s.selectFace);
  const dragGuard = useDragThreshold();

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

  // Position, orientation, per-instance scale and colour — one pass, so a
  // fault's size bump and its colour always land in the same frame.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !showElements) return;

    const normal = new THREE.Vector3(...face.normal);
    const up = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const color = new THREE.Color();
    const isSelectedFace = selection.level !== "array" && selection.faceNum === face.fceNum;

    for (let i = 0; i < positions.length; i++) {
      const isSelectedElement =
        isSelectedFace && selection.level === "element" && selection.elementIdx === i;
      const { color: hex, scale } = elementAppearance(
        faceTelemetry?.elements[i],
        metricMode,
        isSelectedElement,
      );

      position.set(positions[i][0], positions[i][1], positions[i][2]);
      // Offset slightly along normal to avoid z-fighting with face shell
      position.addScaledVector(normal, 0.003);
      matrix.compose(position, quaternion, new THREE.Vector3(scale, scale, scale));
      mesh.setMatrixAt(i, matrix);

      color.set(hex);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [positions, face.normal, face.fceNum, faceTelemetry, selection, metricMode, showElements, invalidate]);

  if (positions.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[elementGeo, elementMat, positions.length]}
      visible={showElements}
      onPointerDown={dragGuard.onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (dragGuard.isDrag(e)) return;
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
