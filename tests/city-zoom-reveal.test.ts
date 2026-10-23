import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  INITIAL_CITY_ZOOM,
  INTRO_FADE_START_ZOOM,
  PLACES_REVEAL_ZOOM,
  PLACES_FULLY_VISIBLE_ZOOM,
  cityIntroOpacity,
} from "../src/features/map/layers/discoveryZoom.ts";

test("Hyderabad appears first and fades away before places appear", () => {
  assert.ok(INITIAL_CITY_ZOOM < INTRO_FADE_START_ZOOM);
  assert.ok(INTRO_FADE_START_ZOOM < PLACES_REVEAL_ZOOM);
  assert.ok(PLACES_REVEAL_ZOOM < PLACES_FULLY_VISIBLE_ZOOM);
  assert.equal(cityIntroOpacity(INITIAL_CITY_ZOOM), 1);
  assert.equal(cityIntroOpacity(PLACES_REVEAL_ZOOM), 0);
  assert.equal(cityIntroOpacity(PLACES_REVEAL_ZOOM + 1), 0);
  assert.equal(cityIntroOpacity(10), 1);
  const half = (INTRO_FADE_START_ZOOM + PLACES_REVEAL_ZOOM) / 2;
  assert.ok(Math.abs(cityIntroOpacity(half) - 0.5) < 0.00001);
});

test("all MapLibre POI symbol layers are hidden until the reveal zoom", () => {
  const source = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  for (const id of ["cluster-icon-left","cluster-icon-middle","cluster-icon-right","place-icons"]) {
    const marker = 'id: "' + id + '"';
    const start = source.indexOf(marker);
    assert.ok(start >= 0, "missing " + id);
    const next = source.slice(start, start + 220);
    assert.match(next,/minzoom: PLACES_REVEAL_ZOOM/);
  }
  assert.match(source,/className="city-map-intro"/);
  assert.match(source,/cityIntroOpacity\(instance\.getZoom\(\)\)/);
});

test("the blurred city title remains click-through to support pinch and drag",()=>{
  const style = readFileSync("src/styles/app.css", "utf8");
  const index = style.indexOf(".explore > .city-map-intro {");
  assert.ok(index >= 0);
  assert.match(style.slice(index, index+340), /pointer-events: none/);
  assert.match(style.slice(index, index+340), /backdrop-filter: blur\(3px\)/);
});
