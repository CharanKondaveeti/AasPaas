import type { Map } from "maplibre-gl";

/**
 * AasPaas keeps a real geographic basemap but supplies its own illustrated
 * palette. The OpenFreeMap URL preserves glyph/sprite/tile resolution; there
 * are no extra API keys or server services.
 */
export async function loadCityStyle(_signal?: AbortSignal): Promise<string> {
  return "https://tiles.openfreemap.org/styles/positron";
}

export const AASPAAS_COLORS = {
  paper: "#f8f6ec",
  road: "#fffdf7",
  roadOutline: "#dbdccd",
  neighborhood: "#f4f1e4",
  green: "#c9e6ba",
  deepGreen: "#8ec78d",
  lake: "#8fd7ee",
  stream: "#8acfe9",
  buildings: "#e8ddc8",
  label: "#4b5d53",
} as const;

function safePaint(map: Map, id: string, property: string, value: unknown) {
  try { map.setPaintProperty(id, property, value); }
  catch { /* Different map-style layers may not support every paint property. */ }
}

function safeLayout(map: Map, id: string, property: string, value: unknown) {
  try { map.setLayoutProperty(id, property, value); }
  catch { /* Keep optional edits from breaking the geographic map. */ }
}

export function applyCityPalette(map: Map): void {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    const name = id.toLowerCase();
    if (layer.type === "background") {
      safePaint(map, id, "background-color", AASPAAS_COLORS.paper);
    }
    if (layer.type === "fill") {
      if (/water|lake|reservoir|river/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.lake);
        safePaint(map, id, "fill-opacity", 1);
      } else if (/park|grass|forest|wood|garden|cemetery|nature|landcover/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.green);
        safePaint(map, id, "fill-opacity", 0.9);
      } else if (/building/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.buildings);
        safePaint(map, id, "fill-opacity", 0.52);
      } else if (/landuse|residential|industrial|commercial/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.neighborhood);
        safePaint(map, id, "fill-opacity", 0.68);
      }
    }
    if (layer.type === "line") {
      if (/water|river|stream|canal/.test(name)) {
        safePaint(map, id, "line-color", AASPAAS_COLORS.stream);
        safePaint(map, id, "line-opacity", 0.95);
      } else if (/road|street|bridge|tunnel|highway|motorway|trunk|path/.test(name)) {
        safePaint(map, id, "line-color", /casing|outline|border/.test(name)
          ? AASPAAS_COLORS.roadOutline
          : AASPAAS_COLORS.road);
        safePaint(map, id, "line-opacity", 1);
      } else if (/rail/.test(name)) {
        safePaint(map, id, "line-color", "#c8cfc4");
      }
    }
    if (layer.type === "symbol") {
      // Our own place markers are the focus. Keep road and neighbourhood
      // labels, remove redundant provider POIs and motorway shield graphics.
      if (/poi|shield|housenumber|house-number|aerodrome|airport-label|transit/.test(name)) {
        safeLayout(map, id, "visibility", "none");
      } else {
        safePaint(map, id, "text-color", AASPAAS_COLORS.label);
        safePaint(map, id, "text-halo-color", "#fffdf7");
        safePaint(map, id, "text-halo-width", 1.45);
      }
    }
  }
}
