/**
 * Generate the satellite glTF used for in-view spacecraft.
 *
 * Written rather than downloaded, for two reasons. A tracking display needs a
 * spacecraft that reads as a spacecraft at 40 pixels — a bus, two arrays, a
 * dish — and the public sample models are either far more detailed than that
 * (a megabyte of geometry to draw a shape the size of a thumbnail) or licensed
 * in ways a repository should not casually inherit. Eleven boxes of geometry is
 * a 4 KB file with no provenance question attached.
 *
 * Axes are glTF's: +Y up, +Z forward. Cesium converts those to its own Z-up,
 * X-forward frame when it loads the model, so authoring the arrays along X
 * puts them cross-track and the dish on -Y puts it on the nadir face once the
 * entity is oriented from its velocity vector.
 *
 * Regenerated on install and before every build, and gitignored, for the same
 * reason as the Cesium assets: it is a build output, not a source file.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** One axis-aligned box, as flat-shaded triangles. */
function box(size, centre = [0, 0, 0]) {
  const [hx, hy, hz] = size.map((s) => s / 2);
  const [cx, cy, cz] = centre;
  const faces = [
    [[1, 0, 0], [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]]],
    [[-1, 0, 0], [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]]],
    [[0, 1, 0], [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]]],
    [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
    [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]],
  ];

  const positions = [];
  const normals = [];
  const indices = [];
  for (const [normal, corners] of faces) {
    const base = positions.length / 3;
    for (const [x, y, z] of corners) {
      positions.push(x + cx, y + cy, z + cz);
      normals.push(...normal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

/** Merge boxes that share a material into one primitive. */
function merge(parts) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (const part of parts) {
    const base = positions.length / 3;
    positions.push(...part.positions);
    normals.push(...part.normals);
    indices.push(...part.indices.map((i) => i + base));
  }
  return { positions, normals, indices };
}

/* ---- the spacecraft ----
 *
 * Metres, and roughly to scale for a small LEO bus. The absolute size barely
 * matters — the entity is drawn at a constant pixel size — but the PROPORTIONS
 * decide whether it reads as a satellite at sixty pixels or as a smudge.
 *
 * The span is deliberately not much wider than the body. The apparent size is
 * measured across the bounding sphere, so long thin arrays spend most of that
 * budget on empty space and sub-pixel panel edges, and the recognisable part —
 * the bus — ends up a fifth of what the eye was promised. Stubbier arrays and
 * a chunkier body put the pixels where the shape is.
 */
const BUS = merge([
  box([1.7, 1.7, 2.3]),
  // Booms out to the arrays, so the panels do not appear to float.
  box([0.8, 0.18, 0.18], [-1.2, 0, 0]),
  box([0.8, 0.18, 0.18], [1.2, 0, 0]),
  // Downlink horn on the nadir face.
  box([0.6, 0.5, 0.6], [0, -1.1, 0.3]),
]);

const ARRAYS = merge([
  // Thick enough to stay a solid panel rather than a flickering hairline: at
  // this scale a five-centimetre array is well under a pixel edge-on.
  box([2.4, 0.22, 1.7], [-2.8, 0, 0]),
  box([2.4, 0.22, 1.7], [2.8, 0, 0]),
]);

const PRIMITIVES = [
  /**
   * Neutral silver, NOT the thermal-blanket gold this used to be.
   *
   * The materials are unlit, so there is no shading falloff to take the edge
   * off a saturated colour — whatever is written here is painted at full
   * brightness on every pixel of every in-view spacecraft. Gold is also very
   * close in hue to the tracked-object yellow used by the beams, the slant
   * paths and the silhouettes, so a sky with a dozen passes in it turned
   * uniformly yellow and the status colours stopped meaning anything.
   *
   * A neutral body is the fix and the convention: the spacecraft carries no
   * hue of its own, and the only colour on it is the silhouette that says what
   * the station is doing with it.
   */
  { name: "bus", geometry: BUS, colour: [0.80, 0.82, 0.85, 1] },
  { name: "arrays", geometry: ARRAYS, colour: [0.10, 0.16, 0.38, 1] },
];

/* ---- pack it into a GLB ---- */
const buffers = [];
const bufferViews = [];
const accessors = [];
let offset = 0;

/** Append a typed array as a bufferView, 4-byte aligned as glTF requires. */
function view(typed, target) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  const padding = (4 - (bytes.byteLength % 4)) % 4;
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target });
  buffers.push(bytes, new Uint8Array(padding));
  offset += bytes.byteLength + padding;
  return bufferViews.length - 1;
}

const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

const meshPrimitives = PRIMITIVES.map(({ geometry }, material) => {
  const positions = new Float32Array(geometry.positions);
  const normals = new Float32Array(geometry.normals);
  const indices = new Uint16Array(geometry.indices);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], positions[i + a]);
      max[a] = Math.max(max[a], positions[i + a]);
    }
  }

  // POSITION is the one accessor glTF requires min/max on: viewers use it to
  // compute the bounding volume without reading the whole buffer, and Cesium
  // needs that volume to honour `minimumPixelSize`.
  accessors.push({
    bufferView: view(positions, ARRAY_BUFFER),
    componentType: 5126,
    count: positions.length / 3,
    type: "VEC3",
    min,
    max,
  });
  accessors.push({
    bufferView: view(normals, ARRAY_BUFFER),
    componentType: 5126,
    count: normals.length / 3,
    type: "VEC3",
  });
  accessors.push({
    bufferView: view(indices, ELEMENT_ARRAY_BUFFER),
    componentType: 5123,
    count: indices.length,
    type: "SCALAR",
  });

  const base = accessors.length - 3;
  return { attributes: { POSITION: base, NORMAL: base + 1 }, indices: base + 2, material };
});

const bin = Buffer.concat(buffers.map((b) => Buffer.from(b)));

const gltf = {
  asset: { version: "2.0", generator: "scripts/make-satellite-model.mjs" },
  extensionsUsed: ["KHR_materials_unlit"],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "satellite" }],
  meshes: [{ name: "satellite", primitives: meshPrimitives }],
  /**
   * KHR_materials_unlit, not a metallic/roughness PBR surface.
   *
   * A metallic PBR material (the bus was 0.9) only looks like anything when
   * it has an environment to reflect. This scene supplies no image-based
   * lighting, so lit rendering leaves the model rendering close to black
   * against the equally dark space backdrop — correct positions, correct
   * geometry, and visually indistinguishable from absent. Unlit sidesteps the
   * whole lighting pipeline: the base colour IS the pixel colour, so the
   * model is exactly as visible as its `silhouetteColor` outline promises
   * regardless of scene lighting, GPU or IBL support.
   */
  materials: PRIMITIVES.map(({ name, colour }) => ({
    name,
    // Double sided so the winding of the hand-built boxes cannot cull a face,
    // and so an array edge-on never disappears.
    doubleSided: true,
    pbrMetallicRoughness: { baseColorFactor: colour },
    extensions: { KHR_materials_unlit: {} },
  })),
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.byteLength }],
};

const json = Buffer.from(JSON.stringify(gltf), "utf8");
const jsonPadding = Buffer.alloc((4 - (json.byteLength % 4)) % 4, 0x20); // spaces
const jsonChunk = Buffer.concat([json, jsonPadding]);

const header = Buffer.alloc(12);
header.write("glTF", 0, "ascii");
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.byteLength + 8 + bin.byteLength, 8);

const chunk = (payload, type) => {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(payload.byteLength, 0);
  head.writeUInt32LE(type, 4);
  return Buffer.concat([head, payload]);
};

const glb = Buffer.concat([
  header,
  chunk(jsonChunk, 0x4e4f534a), // 'JSON'
  chunk(bin, 0x004e4942), // 'BIN'
]);

const dest = path.join(process.cwd(), "public", "models");
await mkdir(dest, { recursive: true });
await writeFile(path.join(dest, "satellite.glb"), glb);
console.log(`[models] satellite.glb written (${glb.byteLength} bytes)`);
