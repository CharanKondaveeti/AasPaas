import type { Place } from "@/lib/types";

export type DecorationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { sprite: string; id: string };
};
export type SceneryCollection = {
  type: "FeatureCollection";
  features: DecorationFeature[];
};

const supportedSprites = new Set(["tree-sprite-a", "tree-sprite-b", "garden-sprite"]);

/**
 * Load the output of "npm run map:scenery" when available.
 * Trees are generated from OSM park and green-space polygons and do not
 * depend on selected search filters or on which POIs are currently fetched.
 */
export async function loadGeneratedScenery(signal: AbortSignal): Promise<SceneryCollection | null> {
  const response = await fetch("/map-data/trees.geojson", { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load generated map scenery");
  const json: unknown = await response.json();
  if (!json || typeof json !== "object") return null;
  const collection = json as Partial<SceneryCollection>;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) return null;
  const features = collection.features.filter(feature =>
    feature?.type === "Feature"
    && feature.geometry?.type === "Point"
    && Array.isArray(feature.geometry.coordinates)
    && feature.geometry.coordinates.length === 2
    && feature.geometry.coordinates.every(Number.isFinite)
    && feature.geometry.coordinates[0] >= 78.15 && feature.geometry.coordinates[0] <= 78.85
    && feature.geometry.coordinates[1] >= 17.15 && feature.geometry.coordinates[1] <= 17.65
    && supportedSprites.has(feature.properties?.sprite)
    && typeof feature.properties?.id === "string"
  ).slice(0, 2000);
  return features.length ? { type: "FeatureCollection", features } : null;
}

/**
 * Low-detail fallback while polygon-based source data is not generated yet.
 * Clusters are tiny and deliberately illustrative; they are NOT surveyed
 * individual trees and must not be used as park or road geometry.
 */
export function makeCityScenery(places: Place[]): SceneryCollection {
  const features: DecorationFeature[] = [];
  const nature = places.filter(
    p => p.category === "Nature" && !/sagar|tank|lake|bridge|cheruvu/i.test(p.name)
  );
  for (const place of nature) {
    let seed = 2166136261;
    for (const ch of place.id)
      seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
    // Avoid the old 400 m halo which could scatter trees over city roads.
    const density = 5;
    for (let i = 0; i < density; i++) {
      const theta = i * 2.3999632297 + (seed % 360) / 57.2958;
      const r = 0.00011 + Math.sqrt((i + 0.55) / density) * 0.00032;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            place.longitude + Math.cos(theta) * r,
            place.latitude + Math.sin(theta) * r * 0.9,
          ],
        },
        properties: {
          id: place.id + "-scenery-" + i,
          sprite: i % 3 === 0 ? "garden-sprite" : i % 2 === 0 ? "tree-sprite-b" : "tree-sprite-a",
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
