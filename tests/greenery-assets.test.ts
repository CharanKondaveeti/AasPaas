import assert from "node:assert/strict";
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
