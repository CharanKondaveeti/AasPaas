import type { Place } from "@/lib/types";
import { greeneryForPoint, type GreeneryTier } from "./greeneryAssets";

export type DecorationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    sprite: string;
    id: string;
    tier: GreeneryTier;
    kind: string;
  };
};
export type SceneryCollection = {
  type: "FeatureCollection";
  features: DecorationFeature[];
};

/**
 * Accept checked geographic park/wood coordinates produced by map:scenery.
 * Normalize old static tree-sprite-a/b files to the new curated WebP sprites,
 * so upgrades do not require immediately regenerating OSM data.
 */
export async function loadGeneratedScenery(signal: AbortSignal): Promise<SceneryCollection | null> {
  const response = await fetch("/map-data/trees.geojson", { signal });
  if (response.status === 404 || !response.ok || !(response.headers.get("content-type") || "").includes("json"))
    return null;
  const json: unknown = await response.json();
  if (!json || typeof json !== "object") return null;
  const collection = json as Partial<SceneryCollection>;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) return null;
  const features: DecorationFeature[] = [];
  for (const feature of collection.features) {
    if (feature?.type !== "Feature" || feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates ?? [];
    const id = feature.properties?.id;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)
      || lng < 78.15 || lng > 78.85 || lat < 17.15 || lat > 17.65
      || typeof id !== "string" || !id) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { id, ...greeneryForPoint(id) },
    });
    if (features.length >= 1600) break;
  }
  return features.length ? { type: "FeatureCollection", features } : null;
}

/**
 * Small no-network fallback when validated geographic scenery is unavailable.
 * Restrict to recognised parks/gardens; never assume lakes or every nature POI
 * are forests. Fallback locations are decorative and approximate, not surveyed.
 * 10–30 m around known park point keeps the sample minimal at city zoom.
 */
export function makeCityScenery(places: Place[]): SceneryCollection {
  const features: DecorationFeature[] = [];
  const parks = places.filter(place =>
    place.category === "Nature"
    && /park|garden|forest|woods|botanical|nursery/i.test(place.name)
    && !/lake|cheruvu|sagar|tank|river|bridge|island/i.test(place.name)
  );

  for (const place of parks) {
    let seed = 2166136261;
    for (const char of place.id)
      seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    const count = 7;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.3999632297 + (seed % 360) / 57.2958;
      const metres = 9 + Math.sqrt((i + 0.5) / count) * 27;
      const latOffset = Math.sin(angle) * metres / 111320;
      const lngOffset = Math.cos(angle) * metres / (111320 * Math.cos(place.latitude * Math.PI / 180));
      const id = `${place.id}-scenery-${i}`;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.longitude + lngOffset, place.latitude + latOffset],
        },
        properties: { id, ...greeneryForPoint(id) },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
