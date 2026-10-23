// Official OpenFreeMap style. Its URL keeps relative glyph, sprite and tile
// paths correct. Positron also avoids Liberty's nullable shield-filter warnings.
export async function loadCityStyle(_signal?: AbortSignal): Promise<string> {
  return "https://tiles.openfreemap.org/styles/positron";
}
