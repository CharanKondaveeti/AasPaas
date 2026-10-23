import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("illustrated park boundaries use native polygon-line symbols without DOM markers", () => {
  const style = readFileSync("src/features/map/layers/style.ts", "utf8");
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.match(style, /"source-layer": "park"/);
  assert.match(style, /"symbol-placement": "line"/);
  assert.match(style, /"symbol-spacing": configuration\.spacing/);
  assert.match(style, /"icon-rotation-alignment": "viewport"/);
  assert.match(style, /"icon-image": configuration\.id/);
  assert.match(map, /addNativeParkBorderTrees\(instance\)/);
  assert.doesNotMatch(map, /makeIllustratedMarker|tree-sprite-a/);
});
