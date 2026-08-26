"use client";

import { Component, useState, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { DomeScene } from "./DomeScene";
import { DomeNetView } from "./DomeNetView";
import type { CameraPreset } from "../types";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Check whether a WebGL context (WebGL2 or WebGL1) can be created.
 *
 * Probes webgl2 first, then webgl1 / experimental-webgl.
 * The probe context is released immediately to avoid context leaks.
 */
function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;

    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

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
  activePreset,
  viewMode = "3d",
}: {
  activePreset: CameraPreset | null;
  viewMode?: "3d" | "net";
}) {
  const [webGLOk, setWebGLOk] = useState<boolean>(true);

  useEffect(() => {
    setWebGLOk(detectWebGL());
  }, []);

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
            fov: 50,
            near: 0.1,
            far: 100,
            position: [6, 6, 4],
          }}
          style={{ background: "transparent" }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <DomeScene activePreset={activePreset} />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
