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
