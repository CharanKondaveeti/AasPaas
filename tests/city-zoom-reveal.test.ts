import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CITY_CENTER } from "../src/lib/types.ts";
import { containsHyderabad, INDIA_MIN_ZOOM, HYDERABAD_OVERVIEW_ZOOM } from "../src/features/map/layers/indiaRegions.ts";
import type { MultiPolygon } from "geojson";
import { keepRevealedPlaces } from "../src/features/map/layers/markerPersistence.ts";
import { fullNameCard, hideZoom, prominenceScore, revealZoom } from "../src/features/map/layers/prominence.ts";

test("India map keeps navigation and reveals only actual place icons at close zoom", () => {
  assert.ok(INDIA_MIN_ZOOM < 5);
  assert.ok(HYDERABAD_OVERVIEW_ZOOM > INDIA_MIN_ZOOM);
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.match(map, /minZoom: INDIA_MIN_ZOOM/);
  assert.match(map, /renderWorldCopies: false/);
  assert.ok(map.includes('loadIndiaRegions(abort.signal)'));
  assert.ok(map.includes('minzoom: 7.8'));
  assert.ok(map.includes('symbol-sort-key'));
  assert.ok(map.includes('fullCard: fullNameCard(p, zoom)'));
  assert.ok(map.includes('fadeDuration: 0'));
  assert.ok(map.includes('"icon-allow-overlap": true'));
  assert.ok(map.includes('type: "symbol"'));
  for (const artwork of ["galli-greenery-base", "cluster-icon-left", "cluster-icon-middle",
    "cluster-icon-right", "bushy-green-pattern", "loadGeneratedScenery", "GREENERY_ASSETS"]) {
    assert.ok(!map.includes(artwork), "map has no unused scenery: " + artwork);
  }
});

test("Hyderabad's mapped municipal polygon contains its centre and excludes distant India", () => {
  const geo = JSON.parse(readFileSync("public/map-data/hyderabad-ghmc.geojson", "utf8"));
  const geometry = geo.features[0].geometry as MultiPolygon;
  assert.equal(geometry.type, "MultiPolygon");
  assert.ok(geometry.coordinates.length);
  assert.ok(containsHyderabad(CITY_CENTER, geometry));
  assert.ok(containsHyderabad([78.4747,17.3616], geometry)); // Charminar
  assert.ok(!containsHyderabad([77.5946,12.9716], geometry)); // Bengaluru
  assert.ok(!containsHyderabad([78.6224,17.65], geometry));
});

test("state and district Coming soon locations are geographic rather than fixed overlay text",()=>{
  const data=JSON.parse(readFileSync("public/map-data/india-launch-regions.geojson","utf8"));
  assert.equal(data.type,"FeatureCollection");
  assert.ok(data.features.filter((f: any)=>f.properties.level==="state").length>=30);
  assert.ok(data.features.filter((f: any)=>f.properties.level==="district").length>=550);
  for (const feature of data.features) {
    const [lng,lat]=feature.geometry.coordinates;
    assert.ok(lng>=68 && lng<=98 && lat>=6 && lat<=38);
  }
  const map=readFileSync("src/features/map/layers/indiaRegions.ts","utf8");
  assert.match(map, /id: "ghmc-solid-border"/);
  assert.match(map, /id: "hyderabad-moving-title"/);
  assert.match(map, /id: "india-state-availability"/);
  assert.match(map, /id: "india-district-availability"/);
  assert.doesNotMatch(readFileSync("src/features/map/components/CityMap.tsx","utf8"),/className="city-map-intro"/);
});

test("municipal boundary uses cool blue and fades completely at street zoom", () => {
  const style = readFileSync("src/features/map/layers/indiaRegions.ts","utf8");
  assert.ok(style.includes('"fill-color": "#70C9E6"'));
  assert.ok(style.includes('"line-color": "#48A8CB"'));
  for (const layerId of ["ghmc-active-city","ghmc-boundary-halo","ghmc-solid-border"]) {
    const at = style.indexOf('id: "' + layerId + '"');
    assert.ok(at >= 0, "missing " + layerId);
    const following = style.slice(at, at + 750);
    assert.ok(following.includes("12.6, 0"), "highlight must fade completely at zoom 12.6: " + layerId);
  }
  const basemap = readFileSync("src/features/map/layers/style.ts","utf8");
  assert.ok(basemap.includes('safeLayout(map, id, "icon-image", "")'));
});

test("high priority food keeps its name and speciality at the city overview", () => {
  const famous = { prominence_score: 98 };
  const neighbourhood = { prominence_score: 60 };
  assert.equal(prominenceScore(famous), 98);
  assert.equal(revealZoom(famous), 9.3);
  assert.equal(hideZoom(famous), 7.8);
  assert.equal(fullNameCard(famous, 9.9), true);
  assert.equal(fullNameCard(neighbourhood, 12.8), false);
  assert.equal(fullNameCard(neighbourhood, 13.6), true);
});

test("newly revealed locations are ranked and persist until their own hide zoom", () => {
  type Spot = { id: string; latitude: number; longitude: number; prominence_score: number };
  const seen = new Map<string, Spot>();
  const icon = { id: "icon", latitude: 17.36, longitude: 78.47, prominence_score: 98 };
  const local = { id: "local", latitude: 17.37, longitude: 78.48, prominence_score: 45 };
  const inside = (_p: Spot) => true;
  assert.deepEqual(keepRevealedPlaces(seen, [local, icon], 9.9, inside), [icon]);
  assert.deepEqual(keepRevealedPlaces(seen, [local], 14, inside), [local, icon]);
  assert.deepEqual(keepRevealedPlaces(seen, [], 12.6, inside), [local, icon]);
  assert.deepEqual(keepRevealedPlaces(seen, [], 12.4, inside), [icon]);
  assert.deepEqual(keepRevealedPlaces(seen, [], 7.7, inside), []);
});

test("density rules prevent NEW cards overlapping, but never remove seen ones", () => {
  const seen = new Map();
  const a = { id: "a", latitude: 17.36, longitude: 78.47, prominence_score: 99 };
  const b = { id: "b", latitude: 17.361, longitude: 78.471, prominence_score: 98 };
  const always = () => true;
  const rejectNext = (_candidate: typeof a, existing: readonly typeof a[]) => existing.length === 0;
  assert.deepEqual(keepRevealedPlaces(seen, [b, a], 9.9, always, rejectNext), [a]);
  assert.deepEqual(keepRevealedPlaces(seen, [b], 10, always, () => true), [b, a]);
  assert.deepEqual(keepRevealedPlaces(seen, [], 9, always, rejectNext), [b, a]);
});

test("only places inside the viewport can first be revealed", () => {
  const seen = new Map();
  const a = { id: "near", latitude: 17.36, longitude: 78.47, prominence_score: 95 };
  const b = { id: "outside", latitude: 17.43, longitude: 78.52, prominence_score: 95 };
  assert.deepEqual(keepRevealedPlaces(seen, [a,b], 9.9, p => p.id === "near"), [a]);
});
