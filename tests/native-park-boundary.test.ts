import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("tree placements stay fixed; tile-based repeating park symbols are removed", () => {
  const style = readFileSync("src/features/map/layers/style.ts", "utf8");
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  for (const removed of ["addNativeParkBorderTrees", '"symbol-placement": "line"'])
    assert.ok(!style.includes(removed));
  for (const removed of ["addNativeParkBorderTrees", "makeIllustratedMarker", "tree-sprite-a"])
    assert.ok(!map.includes(removed));
  assert.ok(map.includes('source: "aaspaas-scenery"'));
  assert.ok(map.includes("minzoom: PLACES_REVEAL_ZOOM"));
  assert.ok(style.includes('"fill-opacity": 0.54'));
  assert.ok(!style.includes('15, 0.72'));
});
