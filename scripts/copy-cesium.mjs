/**
 * Copy Cesium's runtime assets into public/cesium.
 *
 * Cesium is not a plain ES module you can just bundle: at runtime it fetches
 * web workers, its widget CSS, and a pile of binary assets (terrain approximation
 * tables, fonts, the WebGL glTF pipeline) by URL, resolved against
 * `window.CESIUM_BASE_URL`. Those files have to exist on the origin, so they are
 * copied out of node_modules into public/ rather than imported.
 *
 * Regenerated on install and before every build, and gitignored — copying 40 MB
 * of vendor binaries into the repo would dwarf the source tree and go stale the
 * moment the dependency is bumped.
 */
import { cp, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "node_modules", "cesium", "Build", "Cesium");
const DEST = path.join(process.cwd(), "public", "cesium");
const DIRS = ["Assets", "ThirdParty", "Widgets", "Workers"];

if (!existsSync(SRC)) {
  console.warn("[cesium] node_modules/cesium not found — skipping asset copy.");
  process.exit(0);
}

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });
for (const dir of DIRS) {
  const from = path.join(SRC, dir);
  if (!existsSync(from)) continue;
  await cp(from, path.join(DEST, dir), { recursive: true });
}
console.log(`[cesium] assets copied to public/cesium`);
