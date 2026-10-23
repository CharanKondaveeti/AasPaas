import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("tree placements stay fixed; tile-based repeating park symbols are removed", () => {
  const style = readFileSync("src/features/map/layers/style.ts", "utf8");
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.doesNotMatch(style, /addNativeParkBorderTrees|symbol-placement": "line"/);
  assert.doesNotMatch(map, /addNativeParkBorderTrees|makeIllustratedMarker|tree-sprite-a/);
  assert.match(map, /source: "aaspaas-scenery"/);
  assert.match(map, /minzoom: PLACES_REVEAL_ZOOM/);
  assert.match(style, /"fill-opacity": 0\\.54/);
  assert.doesNotMatch(style, /"interpolate"[^\\n]*\\["zoom"\\][\\s\\S]*?0\\.72/);
});
