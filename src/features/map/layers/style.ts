import type { Map } from "maplibre-gl";

/**
 * AasPaas keeps real OpenFreeMap geographic data, with an illustrated Galli
 * palette over the basemap. Attribution and all map geometry remain intact.
 */
export async function loadCityStyle(_signal?: AbortSignal): Promise<string> {
  return "https://tiles.openfreemap.org/styles/positron";
}

export const AASPAAS_COLORS = {
  paper: "#F4F1E8",
  road: "#FFFFFF",
  roadOutline: "#D9D5C9",
  neighborhood: "#F0EDE4",
  green: "#B4E394",
  deepGreen: "#73C475",
  lake: "#5AC8EC",
  stream: "#88DCEB",
  buildings: "#F0EBE2",
  label: "#465449",
} as const;


// Only decorate actual basemap greenery, never whole neighbourhoods, roads,
// lakes, snow/ice classes, or the administrative boundary source.
function isGreenLayer(name: string): boolean {
  if (/parking|ice|glacier|snow|water/.test(name)) return false;
  return /(?:^|[-_])(park|garden|grass|wood|forest|meadow|scrub|shrub|nature|green|cemetery|recreation)(?:$|[-_])/.test(name)
    || name === "landcover";
}
function isAdminBoundary(layer: { id: string; type: string; "source-layer"?: string }): boolean {
  const name = layer.id.toLowerCase();
  return layer["source-layer"] === "boundary"
    || /(?:^|[-_])(boundary|boundaries|admin|administrative|disputed|province|state-border|country-border)(?:$|[-_])/.test(name);
}

function safePaint(map: Map, id: string, property: string, value: unknown) {
  try {
    map.setPaintProperty(id, property as Parameters<Map["setPaintProperty"]>[1], value as Parameters<Map["setPaintProperty"]>[2]);
  } catch {
    // Provider styles change. Optional cosmetic edits must not break the map.
  }
}
function safeLayout(map: Map, id: string, property: string, value: unknown) {
  try {
    map.setLayoutProperty(id, property as Parameters<Map["setLayoutProperty"]>[1], value as Parameters<Map["setLayoutProperty"]>[2]);
  } catch {
    // Avoid breaking the map when an upstream layer changes.
  }
}

export function applyCityPalette(map: Map): void {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    const name = id.toLowerCase();
    // Positron draws state, country, and administrative borders as dotted /
    // dashed lines. They are purely decorative for a local discovery app.
    if (layer.type === "line" && isAdminBoundary(layer)) {
      safeLayout(map, id, "visibility", "none");
      continue;
    }
    if (layer.type === "background") {
      safePaint(map, id, "background-color", AASPAAS_COLORS.paper);
    }
    if (layer.type === "fill") {
      if (/water|lake|reservoir|river/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.lake);
        safePaint(map, id, "fill-opacity", 1);
        safePaint(map, id, "fill-outline-color", "#9CE5F2");
      } else if (isGreenLayer(name)) {
        safePaint(map, id, "fill-color", /forest|wood|scrub|shrub/.test(name)
          ? AASPAAS_COLORS.deepGreen : AASPAAS_COLORS.green);
        safePaint(map, id, "fill-opacity", 0.98);
        safePaint(map, id, "fill-outline-color", "#A4DB90");
      } else if (/building/.test(name)) {
        safeLayout(map, id, "visibility", "none");
      } else if (/landuse|residential|industrial|commercial/.test(name)) {
        safePaint(map, id, "fill-color", AASPAAS_COLORS.neighborhood);
        safePaint(map, id, "fill-opacity", 0.68);
      }
    }
    if (layer.type === "fill-extrusion" && /building/.test(name)) {
      safeLayout(map, id, "visibility", "none");
    }
    if (layer.type === "line") {
      if (/water|river|stream|canal/.test(name)) {
        safePaint(map, id, "line-color", AASPAAS_COLORS.stream);
        safePaint(map, id, "line-opacity", 0.95);
      } else if (/road|street|bridge|tunnel|highway|motorway|trunk|path/.test(name)) {
        safePaint(map, id, "line-color", /casing|outline|border/.test(name)
          ? AASPAAS_COLORS.roadOutline : AASPAAS_COLORS.road);
        safePaint(map, id, "line-opacity", 1);
      } else if (/rail/.test(name)) {
        safePaint(map, id, "line-color", "#c8cfc4");
      }
    }
    if (layer.type === "symbol") {
      // Keep geographic text labels but strip artwork icons from the
      // basemap too. Category/filter buttons remain untouched.
      safeLayout(map, id, "icon-image", "");
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
