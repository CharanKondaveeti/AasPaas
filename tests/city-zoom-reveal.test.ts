import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CITY_CENTER } from "../src/lib/types.ts";
import { containsHyderabad, INDIA_MIN_ZOOM, HYDERABAD_OVERVIEW_ZOOM } from "../src/features/map/layers/indiaRegions.ts";
import type { MultiPolygon } from "geojson";

test("India map keeps navigation and geographic labels without any POI sprites", () => {
  assert.ok(INDIA_MIN_ZOOM < 5);
  assert.ok(HYDERABAD_OVERVIEW_ZOOM > INDIA_MIN_ZOOM);
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.match(map, /minZoom: INDIA_MIN_ZOOM/);
  assert.match(map, /renderWorldCopies: false/);
  assert.ok(map.includes('loadIndiaRegions(abort.signal)'));
  for (const artwork of ["galli-greenery-base", "cluster-icon-left", "cluster-icon-middle",
    "cluster-icon-right", "place-icons", "bushy-green-pattern", "loadGeneratedScenery",
    'addSource("places"', "GREENERY_ASSETS"]) {
    assert.ok(!map.includes(artwork), "map has no decoration: " + artwork);
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
