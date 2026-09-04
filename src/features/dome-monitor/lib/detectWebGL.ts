/**
 * Can this browser give us a WebGL context?
 *
 * Its own module, deliberately. This used to be exported from DomeCanvas, and
 * importing it from there dragged the whole Three.js scene graph into the
 * importer's bundle as a STATIC dependency — defeating the `next/dynamic`
 * boundary that exists specifically to keep Three.js out of the initial load.
 * A capability probe has no business pulling in a renderer.
 */
export function detectWebGL(): boolean {
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
