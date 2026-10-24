import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("GitHub Pages builds from the AasPaas repository path", () => {
  const vite = readFileSync("vite.config.ts", "utf8");
  assert.ok(vite.includes('process.env.GITHUB_PAGES==="true"?"/AasPaas/":"/"'));
  const workflow = readFileSync(".github/workflows/github-pages.yml", "utf8");
  assert.ok(workflow.includes('GITHUB_PAGES: "true"'));
  assert.ok(workflow.includes('VITE_GITHUB_PAGES: "true"'));
  assert.ok(workflow.includes('actions/configure-pages@v5'));
  assert.ok(workflow.includes('actions/upload-pages-artifact@v4'));
  assert.ok(workflow.includes('actions/deploy-pages@v4'));
  assert.ok(workflow.includes('VITE_SUPABASE_PUBLISHABLE_KEY:'));
  assert.ok(!workflow.includes("sb_secret_") || workflow.includes("never use sb_secret_"));
});

test("map geometry and SVG paths respect the Vite base URL", () => {
  const regions=readFileSync("src/features/map/layers/indiaRegions.ts","utf8");
  const icons=readFileSync("src/features/map/layers/icons.ts","utf8");
  assert.ok(regions.includes('import.meta.env.BASE_URL}map-data/hyderabad-ghmc.geojson'));
  assert.ok(regions.includes('import.meta.env.BASE_URL}map-data/india-launch-regions.geojson'));
  assert.ok(icons.includes('import.meta.env?.BASE_URL ?? "/"'));
  const preview=readFileSync("src/features/explore/components/ExplorePage.tsx","utf8");
  assert.ok(preview.includes('VITE_GITHUB_PAGES === "true"'));
  assert.ok(preview.includes('!githubPagesPreview && showSuggest'));
  assert.ok(preview.includes('!githubPagesPreview && ('));
});
