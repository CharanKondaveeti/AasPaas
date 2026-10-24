import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CITY_CENTER } from "../src/lib/types.ts";
import { containsHyderabad, INDIA_MIN_ZOOM, HYDERABAD_OVERVIEW_ZOOM } from "../src/features/map/layers/indiaRegions.ts";
import type { MultiPolygon } from "geojson";
import { selectVisiblePlaces } from "../src/features/map/layers/markerPersistence.ts";
import { fullNameCard, minMarkerDistance, prominenceScore, revealZoom } from "../src/features/map/layers/prominence.ts";

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
  assert.ok(map.includes('instance.on("zoomend", syncPlaces)'));
  assert.ok(map.includes('instance.on("moveend", syncPlaces)'));
  assert.ok(!map.includes('seenPlaces.current'));
  assert.ok(!map.includes('keepRevealedPlaces'));
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

test("high-priority food retains full name and signature item at city overview", () => {
  const famous = { prominence_score: 98 };
  const neighbourhood = { prominence_score: 60 };
  assert.equal(prominenceScore(famous), 98);
  assert.equal(revealZoom(famous), 9.3);
  assert.equal(fullNameCard(famous, 9.9), true);
  assert.equal(fullNameCard(neighbourhood, 12.8), false);
  assert.equal(fullNameCard(neighbourhood, 13.6), true);
  assert.ok(minMarkerDistance(9.9) > minMarkerDistance(14));
});

test("zooming out removes previously visible local places; no persistence", () => {
  type Spot = { id: string; latitude: number; longitude: number; prominence_score: number };
  const iconic: Spot = { id: "iconic", latitude: 17.36, longitude: 78.47, prominence_score: 98 };
  const local: Spot = { id: "local", latitude: 17.37, longitude: 78.48, prominence_score: 45 };
  const incoming = [local, iconic];
  const inViewport = (_p: Spot) => true;
  assert.deepEqual(selectVisiblePlaces(incoming, 14, inViewport).map(p => p.id), ["local", "iconic"]);
  assert.deepEqual(selectVisiblePlaces(incoming, 9.9, inViewport).map(p => p.id), ["iconic"]);
  assert.deepEqual(selectVisiblePlaces(incoming, 8.5, inViewport), []);
  assert.deepEqual(selectVisiblePlaces(incoming, 14, inViewport).map(p => p.id), ["local", "iconic"]);
  assert.deepEqual(incoming.map(p => p.id), ["local", "iconic"], "selection must not mutate incoming data");
});

test("dense markers are re-ranked and re-spaced on every zoom", () => {
  const first = { id: "first", latitude: 17.36, longitude: 78.47, prominence_score: 99 };
  const second = { id: "second", latitude: 17.361, longitude: 78.471, prominence_score: 98 };
  const inside = () => true;
  const keepOnlyOne = (_candidate: typeof first, visible: readonly typeof first[]) => visible.length === 0;
  assert.deepEqual(selectVisiblePlaces([second, first], 9.9, inside, keepOnlyOne), [first]);
  assert.deepEqual(selectVisiblePlaces([second, first], 14, inside), [second, first]);
  assert.deepEqual(selectVisiblePlaces([second, first], 9.9, inside, keepOnlyOne), [first]);
});

test("outside-viewport places are not rendered after moving the map", () => {
  const a = { id: "near", latitude: 17.36, longitude: 78.47, prominence_score: 95 };
  const b = { id: "outside", latitude: 17.43, longitude: 78.52, prominence_score: 95 };
  assert.deepEqual(selectVisiblePlaces([a,b], 9.9, p => p.id === "near"), [a]);
  assert.deepEqual(selectVisiblePlaces([a,b], 9.9, p => p.id === "outside"), [b]);
});
