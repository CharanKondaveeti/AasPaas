import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isParkPlace } from "../src/features/map/layers/scenery.ts";
import type { Place } from "../src/lib/types.ts";

const place = (name: string, category: string): Place => ({
  id: name, name, category, longitude: 78.47, latitude: 17.36,
} as Place);

test("hide only map pins for parks; keep lakes and other POIs", () => {
  assert.equal(isParkPlace(place("Adarsh Nagar Park", "Nature")), true);
  assert.equal(isParkPlace(place("Botanical Garden", "Nature")), true);
  assert.equal(isParkPlace(place("Hussain Sagar", "Nature")), false);
  assert.equal(isParkPlace(place("Durgam Cheruvu", "Nature")), false);
  assert.equal(isParkPlace(place("Park View Cafe", "Food")), false);
  const mapCode = readFileSync("src/features/map/components/CityMap.tsx","utf8");
  assert.match(mapCode,/props\.places\.filter\(place => !isParkPlace\(place\)\)/);
  assert.doesNotMatch(mapCode,/\/map-art\/tree\.svg|tree-sprite-a/);
  assert.ok(mapCode.includes('"galli-greenery-base"'));
});
