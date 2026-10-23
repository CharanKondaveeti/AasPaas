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

const BUSH_PATTERN_ID = "galli-bushy-green-pattern";

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

/**
 * A transparent, repeating leafy texture is rendered BY MapLibre, clipped to
 * real mapped parks and vegetation. Existing vector roads and lakes still draw
 * above it. Never create a React DOM marker for each bush.
 *
 * Call only after registering the BUSH_PATTERN_ID image.
 */
export function applyBushyGreenTexture(map: Map): void {
  if (!map.hasImage(BUSH_PATTERN_ID)) return;
  const originalLayers = map.getStyle().layers ?? [];
  for (let i = 0; i < originalLayers.length; i++) {
    const layer = originalLayers[i];
    if (layer.type !== "fill" || !isGreenLayer(layer.id.toLowerCase())) continue;
    if (!layer.source || !layer["source-layer"]) continue;
    if (layer.maxzoom !== undefined && layer.maxzoom <= 11) continue;
    const id = "galli-bush-" + layer.id;
    if (map.getLayer(id)) continue;
    const nextId = originalLayers[i + 1]?.id;
    // Match the original geometry, filter and zoom range, so texture never
    // spills into water, streets, or outside the mapped green polygon.
    map.addLayer({
      id,
      type: "fill",
      source: layer.source,
      "source-layer": layer["source-layer"],
      ...(layer.filter ? { filter: layer.filter } : {}),
      minzoom: Math.max(11, layer.minzoom ?? 0),
      ...(layer.maxzoom === undefined ? {} : { maxzoom: layer.maxzoom }),
      paint: {
        "fill-pattern": BUSH_PATTERN_ID,
        "fill-opacity": [
          "interpolate", ["linear"], ["zoom"],
          11, 0.18,
          13, 0.48,
          15, 0.72,
        ],
      },
    }, nextId);
  }
}

export const GALLI_BUSH_PATTERN_ID = BUSH_PATTERN_ID;

/**
 * Draw repeated WebP trees along the boundaries of the basemap's own park
 * polygons. This works without any external OSM/Overpass request, includes
 * parks absent from our generated GeoJSON and moves with the GPU map.
 * Polygon + symbol-placement=line is supported by MapLibre's style spec.
 */
export function addNativeParkBorderTrees(map: Map): number {
  const layers = map.getStyle().layers ?? [];
  const parkLayer = layers.find(layer =>
    layer.type === "fill" && layer["source-layer"] === "park" && !!layer.source
  );
  if (!parkLayer || !parkLayer.source) return 0;
  const labelLayer = layers.find(layer => layer.type === "symbol")?.id;
  let added = 0;
  const configurations = [
    {
      id: "galli-park-boundary-canopies",
      minzoom: 12,
      spacing: 115,
      sprite: ["match", ["get", "class"],
        "national_park", "tree-dark-detailed",
        "nature_reserve", "tree-bright-detailed",
        "tree-canopy-detailed"],
      sizes: [12, 0.42, 14, 0.70, 16, 1.03],
    },
    {
      id: "galli-park-boundary-shrubs",
      minzoom: 14,
      spacing: 250,
      sprite: "bush-dense-detailed",
      sizes: [12, 0.24, 14, 0.42, 16, 0.70],
    },
  ] as const;
  for (const configuration of configurations) {
    if (map.getLayer(configuration.id)) continue;
    try {
      map.addLayer({
        id: configuration.id,
        type: "symbol",
        source: parkLayer.source,
        "source-layer": "park",
        ...(parkLayer.filter ? { filter: parkLayer.filter } : {}),
        minzoom: configuration.minzoom,
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": configuration.spacing,
          "icon-image": configuration.sprite,
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            configuration.sizes[0], configuration.sizes[1],
            configuration.sizes[2], configuration.sizes[3],
            configuration.sizes[4], configuration.sizes[5],
          ],
          "icon-rotation-alignment": "viewport",
          "icon-pitch-alignment": "viewport",
          "icon-anchor": "bottom",
          "icon-allow-overlap": false,
          "icon-ignore-placement": true,
        },
      }, labelLayer);
      added++;
    } catch (error) {
      console.warn("Could not apply native park boundary greenery:", error);
    }
  }
  return added;
}
