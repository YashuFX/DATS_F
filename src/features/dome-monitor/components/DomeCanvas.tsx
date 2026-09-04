"use client";

import { Component, useState, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DomeScene } from "./DomeScene";
import { CAMERA_BASE_FOV } from "../config";
import { detectWebGL } from "../lib/detectWebGL";
import { DomeNetView } from "./DomeNetView";
import type { CameraPreset } from "../types";
import { AlertTriangle, RefreshCw } from "lucide-react";

/** Does this failure look like the GPU/WebGL stack rather than scene code? */
function isWebGLFailure(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  return /webgl|gl context|creating .*context/i.test(message);
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Error boundary catching Three.js WebGL context initialization failures. */
class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.warn("WebGL Canvas failed, switching to 2D Net View fallback:", error?.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * DomeCanvas — the dynamic SSR boundary for Three.js.
 *
 * Wraps the R3F Canvas with frameloop="demand" (no frames when idle),
 * NoToneMapping (status colours match the badge panel), and antialias.
 *
 * If WebGL is unavailable or fails to create a WebGL context, falls back
 * seamlessly to the 2D Unfolded Net View (DomeNetView).
 */
export function DomeCanvas({
  manualPreset,
  viewMode = "3d",
  showHoverTag = true,
}: {
  /** Preset used when nothing is selected — a face selection overrides this internally (see DomeScene). */
  manualPreset: CameraPreset;
  viewMode?: "3d" | "net";
  /** Draw hover readouts as tags on the faces. Off for small embeds, which
   *  render the same information in a fixed corner instead. */
  showHoverTag?: boolean;
}) {
  const [webGLOk, setWebGLOk] = useState<boolean>(detectWebGL);

  // Listen for unhandled rejections related to WebGL
  useEffect(() => {
    if (!webGLOk) return;
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isWebGLFailure(event.reason)) return;
      event.preventDefault();
      console.warn(
        "WebGL context creation failed, switching to 2D Net View fallback:",
        event.reason,
      );
      setWebGLOk(false);
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [webGLOk]);

  if (viewMode === "net") {
    return <DomeNetView />;
  }

  const fallbackView = (
    <div className="relative size-full">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-da-warn/40 bg-da-warn-soft px-[0.75rem] py-[0.375rem] text-3xs font-semibold text-da-warn-text">
        <span className="flex items-center gap-[0.375rem]">
          <AlertTriangle className="size-[0.875rem]" />
          WebGL acceleration unavailable — displaying 2D Unfolded Net View fallback.
        </span>
        <button
          type="button"
          onClick={() => setWebGLOk(detectWebGL())}
          className="flex items-center gap-[0.25rem] rounded-[0.1875rem] border border-da-warn/50 px-[0.375rem] py-[0.125rem] hover:bg-da-warn/20"
        >
          <RefreshCw className="size-[0.625rem]" />
          Retry 3D
        </button>
      </div>
      <div className="pt-[2rem] size-full">
        <DomeNetView />
      </div>
    </div>
  );

  if (!webGLOk) {
    return fallbackView;
  }

  return (
    <WebGLErrorBoundary fallback={fallbackView}>
      <div className="size-full">
        <Canvas
          frameloop="demand"
          gl={{
            antialias: true,
            toneMapping: THREE.NoToneMapping,
            alpha: true,
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{
            // `up` is deliberately NOT set here. The dome is Z-up, and
            // DomeScene sets camera.up during its render pass because
            // OrbitControls reads that vector exactly once, in a constructor
            // that runs while DomeScene's children render — see the comment
            // there. Setting it in two places invites someone to delete the
            // one that is load-bearing.
            //
            // Authored value only — DomeScene re-derives fov every time the
            // canvas or the detail panel resizes, so the dome stays inside
            // the strip the panel is not covering (lib/cameraFraming.fitFov).
            fov: CAMERA_BASE_FOV,
            near: 0.1,
            far: 100,
            position: [6, 6, 4],
          }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <DomeScene manualPreset={manualPreset} showHoverTag={showHoverTag} />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
