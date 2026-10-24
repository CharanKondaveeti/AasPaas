import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { iconNames, iconFor, iconPath } from "../src/features/map/layers/icons.ts";

test("the ten new food illustrations are valid small transparent-capable WebP files", () => {
  assert.equal(iconNames.length, 10);
  assert.equal(new Set(iconNames).size, 10);
  assert.equal(existsSync("public/icons"), false, "old SVG illustration folder is removed");
  for (const name of iconNames) {
    const data = readFileSync("public" + iconPath(name));
    assert.equal(data.toString("ascii",0,4), "RIFF");
    assert.equal(data.toString("ascii",8,12), "WEBP");
    assert.ok(data.byteLength > 1000 && data.byteLength < 12000);
  }
});

test("dish matches the correct miniature, without inventing food identities", () => {
  for(const dish of ["Biryani","Punugulu","Samosa","Chaat","Dosa"])
    assert.equal(iconFor("Food",dish),dish.toLowerCase());
  assert.equal(iconFor("Food","Tea"),"chai");
  assert.equal(iconFor("Food","Sweets","Jalebi House"),"jalebi");
  assert.equal(iconFor("Food",null,"Pani Puri Stop"),"pani-puri");
  assert.equal(iconFor("Food",null,"","Hot Idli Breakfast"),"idli");
  assert.equal(iconFor("Food",null,"Kebab Corner"),"kebab");
  assert.equal(iconFor("Food","Mandi","Wah Mandi"),null);
  assert.equal(iconFor("Food","Sweets","Sweet Shop"),null);
  assert.equal(iconFor("Places","Biryani"),null);
  assert.equal(iconFor("Nature",null),null);
});

test("map puts shop names beneath WebP illustrations and retains click navigation", () => {
  const code=readFileSync("src/features/map/components/CityMap.tsx","utf8");
  for(const needle of [
    'source: "aaspaas-places"',
    'minzoom: PLACE_ICON_MIN_ZOOM',
    '"icon-image": ["get", "icon"]',
    '"text-field": ["get", "name"]',
    '"text-anchor": "top"',
    '"text-offset": [0, 0.35]',
    '"icon-allow-overlap": false',
    'instance.on("click", PLACE_ICON_LAYER',
    'latest.current.onSelect(place)',
    'name: p.name',
    'iconFor(p.category, p.dish, p.name, p.famous_for)',
  ]) assert.ok(code.includes(needle),needle);
  assert.ok(!code.includes("cluster-count"));
  assert.ok(!code.includes('"cluster": true'));
});

test("place list and details use new illustrations without broken nonfood images", () => {
  const list=readFileSync("src/features/explore/components/ExplorePage.tsx","utf8");
  const detail=readFileSync("src/features/explore/components/PlaceDetails.tsx","utf8");
  assert.ok(list.includes("iconPath(iconFor(p.category, p.dish, p.name, p.famous_for)!)"));
  assert.ok(list.includes('<MapPin size={19}'));
  assert.ok(detail.includes("iconPath(iconFor(place.category, place.dish, place.name, place.famous_for)!)"));
});
