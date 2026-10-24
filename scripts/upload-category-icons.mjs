/**
 * Upload the user-approved transparent WebPs to AasPaas Supabase Storage.
 * Keep SUPABASE_SERVICE_ROLE_KEY in the local environment, never in Vite/public source.
 *
 * Usage:
 *   SUPABASE_URL=https://besbdmgryvwaqdyolmej.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/upload-category-icons.mjs ./aaspaas_20_individual_icons/webp
 */
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const directory = process.argv[2] && resolve(process.argv[2]);
if (!url || !key || !directory) {
  console.error("Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables, plus the extracted WebP directory.");
  process.exit(1);
}
const storage = createClient(url, key, { auth: { persistSession: false } }).storage.from("category-icons");
// Supabase food category key => exact supplied image basename.
// 'Sweets' has no matching picture in the approved 20-image sheet; leave the
// old local SVG fallback in place until the proper image has been approved.
const iconFiles = {
  biryani: "biryani.webp",
  punugulu: "punugulu.webp",
  chai: "irani-chai.webp",
  dosa: "dosa.webp",
  mandi: "mandi.webp",
  samosa: "samosa.webp",
  chaat: "chaat.webp",
  vada: "vada.webp",
  idli: "idli.webp",
  haleem: "haleem.webp",
  kebab: "kebab.webp",
  "pani-puri": "pani-puri.webp",
  jalebi: "jalebi.webp",
  "mirchi-bajji": "mirchi-bajji.webp",
  "osmania-biscuits": "osmania-biscuits.webp",
  juice: "juice.webp",
  tiffins: "tiffins.webp",
  rolls: "rolls.webp",
  "ice-cream": "ice-cream.webp",
};
let failures = 0;
for (const [icon, basename] of Object.entries(iconFiles)) {
  const source = join(directory, basename);
  try {
    const bytes = await readFile(source);
    if (bytes.byteLength > 1_048_576) throw new Error("Image exceeds 1 MB limit");
    if (bytes.subarray(0, 4).toString("ascii") !== "RIFF"
      || bytes.subarray(8, 12).toString("ascii") !== "WEBP")
      throw new Error("Not a WebP image");
    const { error } = await storage.upload(`v1/${icon}.webp`, bytes, {
      contentType: "image/webp", cacheControl: "3600", upsert: true,
    });
    if (error) throw error;
    console.log("Uploaded:", icon);
  } catch (error) {
    failures++;
    console.error("FAILED:", icon, error instanceof Error ? error.message : error);
  }
}
console.log(`${Object.keys(iconFiles).length - failures}/${Object.keys(iconFiles).length} original category images uploaded.`);
console.log("Sweets remains on the existing SVG until its correct illustration is approved.");
if (failures) process.exitCode = 1;
