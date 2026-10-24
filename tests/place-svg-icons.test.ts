import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { iconNames, iconFor, iconPath } from "../src/features/map/layers/icons.ts";

test("every category and food dish maps to a real lightweight SVG file", () => {
  assert.equal(new Set(iconNames).size, iconNames.length);
  for (const name of iconNames) {
    const path = "public" + iconPath(name);
    const svg = readFileSync(path, "utf8");
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox="0 0 80 80"/);
    assert.ok(!/<script|onload=|foreignObject/i.test(svg));
    assert.ok(svg.length < 10000, name + " should remain lightweight");
  }
  const dishes = ["Biryani", "Punugulu", "Samosa", "Mandi", "Chaat", "Dosa", "Vada", "Tea", "Sweets"];
  for (const dish of dishes) assert.equal(iconFor("Food",dish),dish.toLowerCase());
  assert.equal(iconFor("Food",null),"food");
  assert.equal(iconFor("Food","other"),"food");
  assert.equal(iconFor("Places",null),"places");
  assert.equal(iconFor("Nature",null),"nature");
  assert.equal(iconFor("Shopping",null),"shopping");
  assert.equal(iconFor("Fun & Activities",null),"fun");
});

test("MapLibre renders real-place SVGs with no clusters, no numbers and clickable selection", () => {
  const code = readFileSync("src/features/map/components/CityMap.tsx","utf8");
  assert.ok(code.includes('instance.addSource("aaspaas-places"'));
  assert.ok(code.includes('id: PLACE_ICON_LAYER'));
  assert.ok(code.includes('minzoom: PLACE_ICON_MIN_ZOOM'));
  assert.ok(code.includes('"icon-allow-overlap": false'));
  assert.ok(code.includes('"icon-size": 0.80'));
  assert.ok(code.includes('instance.on("click", PLACE_ICON_LAYER'));
  assert.ok(code.includes('latest.current.onSelect(place)'));
  assert.ok(code.includes('getSource("aaspaas-places")'));
  assert.ok(code.includes('iconFor(p.category, p.dish)'));
  assert.ok(!code.includes('"cluster": true'));
  assert.ok(!code.includes('cluster-count'));
});

test("place list and details use the same SVG resolver", () => {
  const list=readFileSync("src/features/explore/components/ExplorePage.tsx","utf8");
  const detail=readFileSync("src/features/explore/components/PlaceDetails.tsx","utf8");
  assert.ok(list.includes('iconPath(iconFor(p.category, p.dish))'));
  assert.ok(detail.includes('iconPath(iconFor(place.category, place.dish))'));
});
