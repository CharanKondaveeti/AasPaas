import type { StyleSpecification } from "maplibre-gl";

/**
 * Stable baseline for city discovery.
 * A plain raster source avoids vector style expression errors and preserves
 * all custom clickable AasPaas place layers on top of the map.
 * For significant public traffic, switch to a tile provider with an
 * appropriate production usage agreement.
 */
export async function loadCityStyle(_signal?: AbortSignal): Promise<StyleSpecification> {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    },
    layers: [{ id: "city-base", type: "raster", source: "osm", minzoom: 0 }],
  };
}
