"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useDomeStore } from "../store/domeStore";
import { ELEMENT_COLOURS } from "../config";
import { getFaceElements, faceBasis } from "../data/geometry";
import { FACES } from "../data/generated/domeGeometry.generated";
import type { Face, HealthId } from "../types";

const CANVAS_SIZE = 160;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Paint the per-face status texture — a soft blotch per non-nominal element,
 * in the face's own (u, v) frame. A contiguous fault cluster overlaps into
 * one blotch; scattered failures stay separate faint dots — the qualitative
 * read the headline "worst cluster" KPI exists to justify (PHASEPLAN §2).
 */
function paintTexture(
  uv: [number, number][],
  healths: HealthId[],
  bounds: { minU: number; maxU: number; minV: number; maxV: number },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const w = Math.max(bounds.maxU - bounds.minU, 1e-6);
  const h = Math.max(bounds.maxV - bounds.minV, 1e-6);
  const radiusPx = CANVAS_SIZE * 0.05;

  for (let i = 0; i < uv.length; i++) {
    const health = healths[i];
    if (health === "nominal") continue;
    const [u, v] = uv[i];
    const px = ((u - bounds.minU) / w) * CANVAS_SIZE;
    const py = ((bounds.maxV - v) / h) * CANVAS_SIZE;
    const [r, g, b] = hexToRgb(ELEMENT_COLOURS[health] ?? ELEMENT_COLOURS.critical);

    const grad = ctx.createRadialGradient(px, py, 0, px, py, radiusPx);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export function FaceStatusTexture({ face }: { face: Face }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const telemetry = useDomeStore((s) => s.telemetry);
  const elementsVisible = useDomeStore((s) => s.elementsVisible);

  const showTexture = !elementsVisible;
  const faceTelemetry = telemetry.faces[face.fceNum];

  const genFace = useMemo(() => FACES.find((f) => f.fceNum === face.fceNum)!, [face.fceNum]);
  const { e1, e2 } = useMemo(() => faceBasis(genFace), [genFace]);

  // Project each element's real (tested, already-correct) world position
  // onto the face's own basis — this guarantees the texture's (u, v) frame
  // agrees exactly with where ElementLayer draws the same elements, instead
  // of re-deriving the per-face clocking/mirror transform a second time.
  const { uv, bounds } = useMemo(() => {
    const positions = getFaceElements(face);
    const pts: [number, number][] = positions.map((p) => {
      const rx = p[0] - face.centroid[0];
      const ry = p[1] - face.centroid[1];
      const rz = p[2] - face.centroid[2];
      return [rx * e1[0] + ry * e1[1] + rz * e1[2], rx * e2[0] + ry * e2[1] + rz * e2[2]];
    });
    const us = pts.map((p) => p[0]);
    const vs = pts.map((p) => p[1]);
    return {
      uv: pts,
      bounds: { minU: Math.min(...us), maxU: Math.max(...us), minV: Math.min(...vs), maxV: Math.max(...vs) },
    };
  }, [face, e1, e2]);

  const texture = useMemo(() => {
    const healths = faceTelemetry?.elements.map((el) => el.health) ?? [];
    const canvas = paintTexture(uv, healths, bounds);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [uv, bounds, faceTelemetry]);

  useEffect(() => {
    invalidate();
    return () => texture.dispose();
  }, [texture, invalidate]);

  // A plane whose local +X/+Y axes are the face's own e1/e2 (built directly
  // from the orthonormal basis, not a normal-only rotation — an in-plane
  // frame anchored to an arbitrary reference axis is exactly trap T2).
  const { position, quaternion, width, height } = useMemo(() => {
    const centerU = (bounds.minU + bounds.maxU) / 2;
    const centerV = (bounds.minV + bounds.maxV) / 2;
    const pos: [number, number, number] = [
      face.centroid[0] + centerU * e1[0] + centerV * e2[0] + face.normal[0] * 0.0015,
      face.centroid[1] + centerU * e1[1] + centerV * e2[1] + face.normal[1] * 0.0015,
      face.centroid[2] + centerU * e1[2] + centerV * e2[2] + face.normal[2] * 0.0015,
    ];
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...e1),
      new THREE.Vector3(...e2),
      new THREE.Vector3(...face.normal),
    );
    const quat = new THREE.Quaternion().setFromRotationMatrix(basis);
    const pad = 0.06; // one element pitch of headroom so edge blotches aren't clipped
    return {
      position: pos,
      quaternion: quat,
      width: bounds.maxU - bounds.minU + pad * 2,
      height: bounds.maxV - bounds.minV + pad * 2,
    };
  }, [bounds, e1, e2, face.centroid, face.normal]);

  if (!faceTelemetry) return null;

  return (
    <mesh ref={meshRef} position={position} quaternion={quaternion} visible={showTexture} raycast={() => null}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
