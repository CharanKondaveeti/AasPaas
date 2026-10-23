import type { StyleSpecification } from "maplibre-gl";

// Keep the original style URL as a URL so MapLibre can correctly resolve
// relative glyph, sprite, source, and tile URLs against the remote style.
// Supplying a fetched JSON object removes that base URL and can blank the map.
export async function loadCityStyle(_signal?: AbortSignal): Promise<string | StyleSpecification> {
  return "https://tiles.openfreemap.org/styles/liberty";
}
