import type { Map } from "maplibre-gl";

/** OpenFreeMap vector tiles and relative resources stay provider-managed. */
export async function loadCityStyle(_signal?: AbortSignal): Promise<string> {
  return "https://tiles.openfreemap.org/styles/positron";
}

/** Adapt the vector basemap into AasPaas's illustrated cream/blue/green palette. */
export function applyCityPalette(map: Map): void {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#f8f7ee");
      } else if (layer.type === "fill") {
        if (/water/.test(id)) map.setPaintProperty(layer.id, "fill-color", "#9bdff2");
        else if (/park|grass|wood|forest|garden|landcover/.test(id)) {
          map.setPaintProperty(layer.id, "fill-color", "#dceccf");
          map.setPaintProperty(layer.id, "fill-opacity", 0.85);
        } else if (/building/.test(id)) {
          map.setPaintProperty(layer.id, "fill-color", "#e9dfcb");
          map.setPaintProperty(layer.id, "fill-opacity", 0.45);
        } else if (/landuse|residential/.test(id)) {
          map.setPaintProperty(layer.id, "fill-color", "#f4f2e8");
        }
      } else if (layer.type === "line") {
        if (/waterway|river|stream/.test(id)) map.setPaintProperty(layer.id, "line-color", "#8cd3eb");
        else if (/road|highway|street|bridge|tunnel|motorway/.test(id)) {
          map.setPaintProperty(layer.id, "line-color", /casing/.test(id) ? "#e1e1d8" : "#ffffff");
        }
      }
    } catch {
      // A provider-specific layer may not support this optional paint property.
    }
  }
}
