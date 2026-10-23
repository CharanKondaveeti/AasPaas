import { copyFile, mkdir } from "node:fs/promises";
await mkdir("public/vendor", { recursive: true });
await copyFile(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/vendor/maplibre-worker.mjs",
);
