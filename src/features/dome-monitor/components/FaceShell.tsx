"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useDomeStore } from "../store/domeStore";
import { FACE_COLOURS } from "../config";
import type { Face } from "../types";
import { fanIndices } from "../lib/truncatedIcosahedron";

/**
 * FaceShell — one polygon mesh per face of the dome.
 *
 * Pentagon = 3 triangles, hexagon = 4 triangles. The mesh is pickable and
 * shows selection/hover state through fill and edge colour.
 *
 * Colour follows the dome's visual rule: neutral grey when healthy. Colour
 * appears only for deviation from nominal.
 */
export function FaceShell({
  face,
  isAbsent,
}: {
  face: Face;
  isAbsent?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);

  const selection = useDomeStore((s) => s.selection);
  const hoveredFace = useDomeStore((s) => s.hoveredFace);
  const telemetry = useDomeStore((s) => s.telemetry);
  const selectFace = useDomeStore((s) => s.selectFace);
  const clearSelection = useDomeStore((s) => s.clearSelection);
  const setHover = useDomeStore((s) => s.setHover);

  const isSelected = selection.level === "face" && selection.faceNum === face.fceNum;
  const isHovered = hoveredFace === face.fceNum;
  const faceTelemetry = telemetry.faces[face.fceNum];
  const health = faceTelemetry?.health ?? "nominal";

  // Build geometry from polygon vertices
  const { geometry, edgeGeometry } = useMemo(() => {
    const verts = face.polygon;
    const positions = new Float32Array(verts.length * 3);
    for (let i = 0; i < verts.length; i++) {
      positions[i * 3] = verts[i][0];
      positions[i * 3 + 1] = verts[i][1];
      positions[i * 3 + 2] = verts[i][2];
    }

    const indices = fanIndices(verts.length);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Edge geometry (wireframe outline of the polygon)
    const edgePositions: number[] = [];
    for (let i = 0; i < verts.length; i++) {
      const next = (i + 1) % verts.length;
      edgePositions.push(
        verts[i][0], verts[i][1], verts[i][2],
        verts[next][0], verts[next][1], verts[next][2],
      );
    }
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(edgePositions, 3),
    );

    return { geometry: geo, edgeGeometry: edgeGeo };
  }, [face.polygon]);

  // Determine colours
  const colours = isAbsent ? FACE_COLOURS.absent : FACE_COLOURS;
  const fillColour = isAbsent
    ? FACE_COLOURS.absent.fill
    : isHovered
      ? FACE_COLOURS.hovered.fill
      : FACE_COLOURS[health]?.fill ?? FACE_COLOURS.nominal.fill;

  const edgeColour = isSelected
    ? FACE_COLOURS.selected.edge
    : isAbsent
      ? FACE_COLOURS.absent.edge
      : FACE_COLOURS[health]?.edge ?? FACE_COLOURS.nominal.edge;

  const fillOpacity = isAbsent ? 0.3 : isHovered ? 0.9 : 0.7;

  return (
    <group>
      {/* Face fill */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          if (isAbsent) return;
          e.stopPropagation();
          if (isSelected) {
            clearSelection();
          } else {
            selectFace(face.fceNum);
          }
        }}
        onPointerOver={(e) => {
          if (isAbsent) return;
          e.stopPropagation();
          setHover(face.fceNum);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          if (isAbsent) return;
          setHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <meshStandardMaterial
          color={fillColour}
          transparent
          opacity={fillOpacity}
          side={THREE.DoubleSide}
          depthWrite={!isAbsent}
        />
      </mesh>

      {/* Edge outline */}
      <lineSegments ref={edgeRef} geometry={edgeGeometry}>
        <lineBasicMaterial
          color={edgeColour}
          linewidth={1}
          transparent
          opacity={isAbsent ? 0.4 : isSelected ? 1 : 0.8}
        />
      </lineSegments>
    </group>
  );
}
