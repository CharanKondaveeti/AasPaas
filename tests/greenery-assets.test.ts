import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { GREENERY_ASSETS, greeneryForPoint, greeneryImagePath } from "../src/features/map/layers/greeneryAssets.ts";

test("WebP scenery catalogue has 19 distinct transparent sprite paths", () => {
  assert.equal(GREENERY_ASSETS.length, 19);
  assert.equal(new Set(GREENERY_ASSETS.map(a => a.id)).size, 19);
  for (const sprite of GREENERY_ASSETS) {
    assert.match(greeneryImagePath(sprite.id), /^\/map-art\/greens\/[a-z-]+\.webp$/);
    assert.ok(sprite.weight > 0);
  }
});

test("scenery types and zoom tiers are stable", () => {
  for (let i=0;i<500;i++) {
    const id = "openstreetmap-tree-" + i;
    const one = greeneryForPoint(id);
    assert.deepEqual(one, greeneryForPoint(id));
    assert.ok(GREENERY_ASSETS.some(asset => asset.id === one.sprite));
    assert.ok(["base", "park", "detail"].includes(one.tier));
  }
  const used = new Set(Array.from({length:500}, (_,i) => greeneryForPoint("green"+i).sprite));
  assert.ok(used.size > 12, "many greenery assets should be reused");
});

test("all 19 shipped WebP sprites are generated correctly and contain WebP headers", () => {
  for (const asset of GREENERY_ASSETS) {
    const file = resolve("public" + greeneryImagePath(asset.id));
    const buffer = readFileSync(file);
    assert.ok(buffer.byteLength > 800, `Missing sprite data: ${asset.id}`);
    assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  }
});

test("greenery icon sizes use MapLibre-compatible top-level zoom expressions", () => {
  const source = readFileSync(resolve("src/features/map/components/CityMap.tsx"), "utf8");
  const [section] = source.split("const tierLayers =").slice(1);
  assert.ok(section, "greenery symbol layers should exist");
  const iconSize = section.slice(section.indexOf('"icon-size":'), section.indexOf('"icon-allow-overlap"'));
  assert.match(iconSize, /"icon-size":\s*\[\s*/);
  assert.match(iconSize, /"interpolate",\s*\["linear"\],\s*\["zoom"\]/);
  assert.doesNotMatch(iconSize, /"icon-size":\s*\[\s*"\*"/);
});

test("generated OSM vegetation data is published with valid city coordinates", () => {
  const collection = JSON.parse(readFileSync(resolve("public/map-data/trees.geojson"), "utf8"));
  assert.equal(collection.type, "FeatureCollection");
  assert.ok(collection.features.length >= 30, "the geographic scenery build must be present");
  for (const feature of collection.features) {
    const [lng,lat] = feature.geometry.coordinates;
    assert.ok(lng >= 78.15 && lng <= 78.85 && lat >= 17.15 && lat <= 17.65);
  }
});
