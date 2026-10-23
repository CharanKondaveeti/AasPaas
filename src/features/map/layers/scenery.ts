import type { Place } from "@/lib/types";

export type DecorationFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { sprite: string; id: string };
};

/**
 * Scenery is a deterministic artistic overlay. Every grove starts from a
 * mapped green-space location, but individual tree locations are decorative
 * and must not be interpreted as a survey of trees or public paths.
 *
 * No DOM nodes are created for scenery: MapLibre renders the GeoJSON symbols
 * in a single GPU-backed layer. This also runs on lower-power phones.
 */
export function makeCityScenery(places: Place[]) {
  const features: DecorationFeature[] = [];
  const nature = places.filter(
    p => p.category === "Nature" && !/sagar|tank|lake|bridge/i.test(p.name)
  );
  for (const place of nature) {
    let seed = 2166136261;
    for (const ch of place.id) {
      seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
    }
    // Each grove has one anchor and a handful of individually drawn trees.
    const density = 12;
    for (let i = 0; i < density; i++) {
      const theta = (i * 2.3999632297 + (seed % 360) / 57.2958);
      const r = 0.00055 + Math.sqrt((i + 0.55) / density) * 0.0036;
      const dx = Math.cos(theta) * r;
      const dy = Math.sin(theta) * r * 0.85;
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [place.longitude + dx, place.latitude + dy],
        },
        properties: {
          id: `${place.id}-scenery-${i}`,
          sprite: i % 7 === 0 ? "garden-sprite" : i % 3 === 0 ? "tree-sprite-b" : "tree-sprite-a",
        },
      });
    }
  }

  const lakes = places.filter(p => /sagar|cheruvu|lake|tank/i.test(p.name));
  for (const place of lakes) {
    for (let i = 0; i < 3; i++) {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            place.longitude + (i - 1) * 0.0015,
            place.latitude + ((i % 2) ? 0.0007 : -0.0005),
          ],
        },
        properties: { id: `${place.id}-ripple-${i}`, sprite: "wave-sprite" },
      });
    }
  }
  return { type: "FeatureCollection" as const, features };
}
