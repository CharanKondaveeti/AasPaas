import type { StyleSpecification } from "maplibre-gl";
export async function loadCityStyle(
  signal?: AbortSignal,
): Promise<StyleSpecification> {
  const response = await fetch("https://tiles.openfreemap.org/styles/liberty", {
    signal,
  });
  if (!response.ok) throw new Error("Map style could not be loaded.");
  const style = (await response.json()) as StyleSpecification;
  style.layers = style.layers.filter(
    (layer) =>
      !["building", "poi", "aerodrome_label"].includes(
        "source-layer" in layer ? layer["source-layer"] || "" : "",
      ) && !/natural_earth|landuse_residential|shield|one_way/.test(layer.id),
  );
  for (const layer of style.layers) {
    if (layer.type === "background")
      layer.paint = { ...layer.paint, "background-color": "#FAFAF7" };
    if (layer.type === "fill") {
      const water = layer.id === "water",
        green = /park|wood|grass|cemetery/.test(layer.id);
      layer.paint = {
        ...layer.paint,
        "fill-color": water ? "#a6d9e8" : green ? "#d8e7cf" : "#f1f0e9",
        "fill-opacity": 1,
      };
    }
    if (layer.type === "line" && /road|bridge|tunnel/.test(layer.id))
      layer.paint = {
        ...layer.paint,
        "line-color": /casing/.test(layer.id)
          ? "#dedfd8"
          : /rail/.test(layer.id)
            ? "#d4d7d0"
            : "#ffffff",
      };
    if (layer.type === "symbol") {
      layer.paint = {
        ...layer.paint,
        "text-color": "#68786f",
        "text-halo-color": "#fafaf7",
        "text-halo-width": 2,
      };
      if (/highway-name/.test(layer.id)) layer.minzoom = 14;
    }
  }
  return style;
}
