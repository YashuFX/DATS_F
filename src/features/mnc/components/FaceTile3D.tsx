"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FACE_MAP } from "@/features/dome-monitor/data/geometry";
import { useDomeStore } from "@/features/dome-monitor/store/domeStore";
import { buildFaceLattice, type FaceLattice } from "../lib/faceLattice";
import type { HealthId } from "@/features/dome-monitor/types";

/** Literal hex, not CSS tokens: three.js materials read raw colour values,
 *  never the DOM cascade, so `var(--color-*)` cannot reach the GPU. */
const FILL: Record<HealthId, string> = {
  nominal: "#34d399",
  degraded: "#fbbf24",
  critical: "#f87171",
  offline: "#5b7a9e",
};
const INERT = "#46617f";

/** Extrusion depth as a fraction of cell radius — enough to catch the light
 *  when tilted, shallow enough that face-on still reads as a flat panel. */
const DEPTH_RATIO = 0.55;

/**
 * Fit the orthographic camera so the tile fills the panel, and refit on resize.
 *
 * Orthographic on purpose. A perspective camera foreshortens the far side of
 * the tile, and at panel size that costs more legibility than the depth cue is
 * worth — face-on here is pixel-equivalent to the flat SVG, so switching to 3D
 * never makes the default view worse. Depth still reads once tilted, from
 * shading rather than from convergence.
 */
function FitCamera({ lattice }: { lattice: FaceLattice }) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    if (!cam.isOrthographicCamera) return;
    const extent = Math.max(lattice.width, lattice.height) + lattice.pitch * 2;
    if (extent <= 0 || size.width === 0 || size.height === 0) return;
    /* eslint-disable react-hooks/immutability */
    cam.zoom = Math.min(size.width, size.height) / extent;
    cam.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */
    invalidate();
  }, [camera, size.width, size.height, lattice, invalidate]);

  return null;
}

/** One instanced draw for every lattice site — 598 on a hexagon face, which is
 *  a fraction of the 7 557 the dome scene already carries. */
function TileMesh({ lattice }: { lattice: FaceLattice }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(() => {
    const r = lattice.cellRadius;
    // Six radial segments makes the cylinder a hexagonal prism — the Voronoi
    // cell of a triangular lattice, so the cells tessellate exactly as they do
    // in the 2D view. Rotated so its axis is +Z and a vertex points up, which
    // is the pointy-top orientation the flat tile uses.
    const geo = new THREE.CylinderGeometry(r, r, r * DEPTH_RATIO, 6);
    geo.rotateX(Math.PI / 2);
    geo.rotateZ(Math.PI / 6);
    return geo;
  }, [lattice.cellRadius]);

  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ toneMapped: false }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const colour = new THREE.Color();

    for (let i = 0; i < lattice.sites.length; i++) {
      const site = lattice.sites[i];
      // Inert sites sit slightly lower, so the radiating aperture stands
      // proud of its carrier — the boundary reads as relief, not just hue.
      const z = site.health ? 0 : -lattice.cellRadius * DEPTH_RATIO * 0.45;
      position.set(site.u, site.v, z);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
      colour.set(site.health ? FILL[site.health] : INERT);
      mesh.setColorAt(i, colour);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [lattice, invalidate]);

  return <instancedMesh ref={meshRef} args={[geometry, material, lattice.sites.length]} />;
}

/** Applies a reset request from the panel by easing the controls back home. */
function ResetOnRequest({
  nonce,
  controls,
}: {
  nonce: number;
  controls: React.RefObject<React.ComponentRef<typeof OrbitControls> | null>;
}) {
  const { camera, invalidate } = useThree();
  const animating = useRef(false);

  useEffect(() => {
    if (nonce === 0) return;
    animating.current = true;
    invalidate();
  }, [nonce, invalidate]);

  useFrame(() => {
    if (!animating.current) return;
    const c = controls.current;
    if (!c) return;
    // Ease the camera back to face-on rather than snapping: a tile that jumps
    // orientation gives the operator no cue about which way it turned.
    camera.position.lerp(new THREE.Vector3(0, 0, 10), 0.18);
    c.target.lerp(new THREE.Vector3(0, 0, 0), 0.18);
    camera.up.set(0, 1, 0);
    c.update();
    if (camera.position.distanceTo(new THREE.Vector3(0, 0, 10)) < 0.01) {
      camera.position.set(0, 0, 10);
      animating.current = false;
    }
    invalidate();
  });

  return null;
}

/**
 * The POC tile in 3D — the same lattice the flat view draws, extruded and
 * orbitable.
 *
 * Both renderers read `buildFaceLattice`, so the 3D tile cannot drift from the
 * 2D one: same sites, same pitch, same square carrier, same inert population.
 *
 * `frameloop="demand"` — a static tile has no animation, so frames are drawn
 * only when something asks for one (a drag, a telemetry tick, a resize). At
 * rest this costs nothing, which matters on a board already running a Cesium
 * globe beside it.
 */
export function FaceTile3D({ faceNum, resetNonce }: { faceNum: number; resetNonce: number }) {
  const telemetry = useDomeStore((s) => s.telemetry);
  const face = FACE_MAP[faceNum];
  const ft = telemetry.faces[faceNum];
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  const lattice = useMemo(() => (face && ft ? buildFaceLattice(face, ft) : null), [face, ft]);
  if (!lattice) return null;

  return (
    <Canvas
      frameloop="demand"
      orthographic
      camera={{ position: [0, 0, 10], near: 0.01, far: 100, zoom: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      style={{ background: "transparent" }}
    >
      {/* Lighting only steep enough to shade the extrusion. Face-on, the tile
          should still read flat and evenly lit. */}
      <ambientLight intensity={1.35} />
      <directionalLight position={[2, 4, 8]} intensity={0.85} />
      <directionalLight position={[-3, -2, 4]} intensity={0.25} />

      <FitCamera lattice={lattice} />
      <TileMesh lattice={lattice} />
      <ResetOnRequest nonce={resetNonce} controls={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        enablePan={false}
        rotateSpeed={0.55}
        minZoom={20}
        maxZoom={600}
      />
    </Canvas>
  );
}
