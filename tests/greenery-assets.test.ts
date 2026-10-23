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

test("greenery identities and asset choices never change with zoom", () => {
  for (let i=0;i<500;i++) {
    const id = "openstreetmap-tree-" + i;
    const one = greeneryForPoint(id);
    assert.deepEqual(one, greeneryForPoint(id));
    assert.ok(GREENERY_ASSETS.some(asset => asset.id === one.sprite));
    assert.equal("tier" in one, false, "no staged zoom tiers in tree data");
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

test("every tree uses a single permanent native MapLibre layer", () => {
  const source = readFileSync(resolve("src/features/map/components/CityMap.tsx"), "utf8");
  const i = source.indexOf('id: "galli-greenery-base"');
  assert.ok(i >= 0, "scenery layer exists");
  const section = source.slice(i, source.indexOf("// Keep native MapLibre clustering", i));
  assert.match(section, /minzoom: PLACES_REVEAL_ZOOM/);
  assert.match(section, /"icon-size": 0\\.60/);
  assert.match(section, /"icon-allow-overlap": true/);
  assert.match(section, /"icon-ignore-placement": true/);
  assert.doesNotMatch(section, /"interpolate"|\\["zoom"\\]|filter:|maxzoom:|"icon-opacity"/);
  assert.doesNotMatch(source, /addNativeParkBorderTrees\\(instance\\)|id: "galli-greenery-(park|detail)"/);
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
