/**
 * Unpack the curated transparent WebP atlas into MapLibre sprite files.
 * The text atlas is versioned in git so binary assets can be reproduced
 * without calling any external image hosts or requiring API keys.
 */
import { readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const names = [
  "tree-round-small", "tree-round-wide", "tree-round-bright",
  "tree-flowering-simple", "tree-tall-simple", "bush-rounded-small",
  "bush-rounded-wide", "hedge-short", "bush-leafy",
  "tree-wide-detailed", "forest-island", "hedge-detailed",
  "bush-dense-detailed", "bush-decorative-detailed",
  "tree-flowering-detailed", "tree-bright-detailed",
  "tree-dark-detailed", "tree-tall-detailed", "tree-canopy-detailed"
];
const source = path.resolve("assets/galli-greenery-atlas.b64");
const target = path.resolve("public/map-art/greens");
const CELL = 80, COLS = 5;
try {
  const packed = (await readFile(source, "utf8")).replace(/\s+/g, "");
  if (!packed) throw new Error("Missing atlas content");
  const atlas = Buffer.from(packed, "base64");
  const meta = await sharp(atlas).metadata();
  if (meta.width !== CELL * COLS || meta.height !== CELL * 4)
    throw new Error(`Unexpected greenery atlas dimensions: ${meta.width}x${meta.height}`);
  await mkdir(target, { recursive: true });
  await Promise.all(names.map(async (name, index) => {
    const dest = path.join(target, name + ".webp");
    // Avoid re-encoding all 19 images during every local dev start.
    try { if ((await stat(dest)).size > 800) return; } catch {}
    await sharp(atlas)
      .extract({ left: (index % COLS) * CELL, top: Math.floor(index / COLS) * CELL,
        width: CELL, height: CELL })
      .webp({ quality: 78, effort: 3 })
      .toFile(dest);
  }));
  console.log("Prepared 19 transparent WebP greenery map sprites.");
} catch (error) {
  console.warn("Curated greenery pack not available; using existing map greenery:", error.message);
}
