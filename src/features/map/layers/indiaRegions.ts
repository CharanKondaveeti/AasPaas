import type { FeatureCollection, MultiPolygon } from "geojson";
import { CITY_CENTER } from "@/lib/types";

export const INDIA_VIEW_BOUNDS: [[number,number],[number,number]] = [
  [67, 5.5], [99, 38.5],
];
export const INDIA_MIN_ZOOM = 3.4;
export const HYDERABAD_OVERVIEW_ZOOM = 9.9;

export const HYDERABAD_TITLE = {
  type: "FeatureCollection" as const,
  features: [{
    type: "Feature" as const,
    properties: { name: "HYDERABAD", status: "Explore now" },
    geometry: { type: "Point" as const, coordinates: CITY_CENTER },
  }],
};

/**
 * The GHMC outline is a sourced municipal boundary, NOT the district or
 * HMDA metropolitan planning boundary. Multiple polygons/holes are supported.
 */
export function containsHyderabad(
  point: readonly [number, number],
  geometry: MultiPolygon | null,
): boolean {
  if (!geometry) return false;
  const inRing = (ring: number[][]) => {
    let inside = false;
    const [x,y] = point;
    for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const [ax,ay]=ring[i], [bx,by]=ring[j];
      if ((ay>y)!==(by>y) && x < (bx-ax)*(y-ay)/(by-ay)+ax)
        inside = !inside;
    }
    return inside;
  };
  return geometry.coordinates.some(polygon =>
    inRing(polygon[0]) && !polygon.slice(1).some(inRing)
  );
}
export async function loadIndiaRegions(signal: AbortSignal): Promise<{
  hyderabad: FeatureCollection;
  regions: FeatureCollection;
}> {
  const [hyderabadResponse, regionsResponse] = await Promise.all([
    fetch("/map-data/hyderabad-ghmc.geojson", {signal}),
    fetch("/map-data/india-launch-regions.geojson", {signal}),
  ]);
  if (!hyderabadResponse.ok || !regionsResponse.ok)
    throw new Error("India map boundaries are unavailable");
  const [hyderabad, regions] = await Promise.all([
    hyderabadResponse.json(), regionsResponse.json()
  ]);
  if (hyderabad?.type !== "FeatureCollection" || !hyderabad.features?.length ||
      hyderabad.features[0]?.geometry?.type !== "MultiPolygon" ||
      regions?.type !== "FeatureCollection" || !Array.isArray(regions.features))
    throw new Error("Invalid India map GeoJSON");
  return {hyderabad, regions};
}

/** All labels and borders are rendered in MapLibre so they follow pan/zoom. */
export function addIndiaAvailabilityLayers(
  map: import("maplibre-gl").Map,
  data: Awaited<ReturnType<typeof loadIndiaRegions>>,
): MultiPolygon {
  const geometry = data.hyderabad.features[0].geometry as MultiPolygon;
  const firstLabels = map.getStyle().layers.find(layer => layer.type === "symbol")?.id;
  map.addSource("ghmc-boundary", { type: "geojson", data: data.hyderabad,
    attribution: "GHMC outline: © OpenStreetMap contributors (2018), Datameet" });
  map.addLayer({
    id: "ghmc-active-city",
    type: "fill",
    source: "ghmc-boundary",
    paint: { "fill-color": "#58C59D", "fill-opacity": 0.16 },
  }, firstLabels);
  map.addLayer({
    id: "ghmc-boundary-halo",
    type: "line",
    source: "ghmc-boundary",
    paint: {
      "line-color": "#C8EDDA",
      "line-opacity": 0.75,
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 7, 13, 9],
    },
  }, firstLabels);
  map.addLayer({
    id: "ghmc-solid-border",
    type: "line",
    source: "ghmc-boundary",
    paint: {
      "line-color": "#087A5A",
      "line-opacity": 0.92,
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.1, 9, 2.4, 13, 3.2],
    },
  }, firstLabels);

  map.addSource("india-coming-soon", {type:"geojson",data:data.regions,
    attribution: "State/district centres: Open Admin Data (CC BY 4.0)" });
  map.addLayer({
    id: "india-state-availability",
    type: "symbol",
    source: "india-coming-soon",
    minzoom: 4.3,
    maxzoom: 8.9,
    filter: ["==", ["get", "level"], "state"],
    layout: {
      "text-field": ["concat", ["get", "name"], "\nCOMING SOON"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 4.3, 10, 8.8, 13],
      "text-max-width": 10,
      "text-allow-overlap": false,
      "text-padding": 12,
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#677B70",
      "text-halo-color": "#FFFDF7",
      "text-halo-width": 2.5,
      "text-opacity": 0.9,
    },
  }, firstLabels);
  map.addLayer({
    id: "india-district-availability",
    type: "symbol",
    source: "india-coming-soon",
    minzoom: 8.9,
    filter: ["==", ["get", "level"], "district"],
    layout: {
      "text-field": ["concat", ["get", "name"], "\nCOMING SOON"],
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 8.9, 10, 13, 12],
      "text-max-width": 10,
      "text-allow-overlap": false,
      "text-padding": 18,
      "text-anchor": "center",
    },
    paint: {
      "text-color": "#738378",
      "text-halo-color": "#FFFDF7",
      "text-halo-width": 2,
      "text-opacity": 0.9,
    },
  }, firstLabels);
  map.addSource("hyderabad-map-title", {type:"geojson",data:HYDERABAD_TITLE});
  map.addLayer({
    id: "hyderabad-moving-title",
    type: "symbol",
    source: "hyderabad-map-title",
    minzoom: 3.5,
    maxzoom: 12.5,
    layout: {
      "text-field": "HYDERABAD",
      "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 3.5, 10, 8, 17, 10, 27, 12, 29],
      "text-letter-spacing": 0.15,
      "text-allow-overlap": true,
      "text-anchor": "center",
      "text-padding": 3,
    },
    paint: {
      "text-color": "#086A4F",
      "text-halo-color": "#F8FFF9",
      "text-halo-width": 2.6,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 11.5, 1, 12.45, 0],
    },
  });
  return geometry;
}
