# Galli / AasPaas geographic illustration automation

This is the **first automation stage** for matching the illustrated Hyderabad reference in the existing Vite + MapLibre application. The map keeps real coordinates; the artwork is not a fixed screenshot.

## Existing assets reused

- Existing OpenFreeMap vector tiles, restyled by `src/features/map/layers/style.ts`.
- Existing hand-authored landmark and food SVGs in `public/map-art/`.
- Existing Supabase places, search, user submissions and moderation.
- Existing illustrated markers in `src/features/map/layers/illustrations.ts`.

## Generate trees from geographic green areas

Run locally with Node 22+ after `npm install`:

```bash
npm run map:scenery
npm run test
npm run build
```

The generator `scripts/generate-map-scenery.mjs` obtains OSM **closed way** polygons for parks, gardens, forest, grass, meadows and woods around Hyderabad using the public Overpass API. It also uses mapped water ways to exclude water-covered coordinates.

The script:
1. Rejects incomplete or unclosed polygons and very small green areas.
2. Samples stable points **inside** each green polygon, at least 6 metres from its mapped edge.
3. Rejects candidates inside mapped water polygons and spaces same-grove trees by about 24 metres.
4. Enforces a city bound and a maximum of 1,600 decorative trees.
5. Writes reproducible GeoJSON to `public/map-data/trees.geojson`.

Commit the generated `trees.geojson` after visual review. This is a deliberate, reviewed data update, **not** a deployment-time network dependency. Don't rely on free Overpass APIs at runtime in users' browsers. If Overpass is overloaded, retry later or change the provider URL in the script to an approved Overpass instance.

`npm run map:scenery -- --input local-overpass.json --output /tmp/trees.geojson` supports reproducible offline input.

The React map loads the generated file if it exists. It falls back to a small, old-style decorative grove near known nature POIs otherwise. The generated layer stays stable when the user changes Food / Places / Nature category filters.

**Important limitations:** OSM geometry represents green *areas*, not the position of individual trees. This first generator handles closed OSM ways, not multipolygon relations or park interior holes, and a location's green-area tag may be incomplete or out of date. Check actual geography and adjust incorrect scenery before publishing. Water exclusions depend on mapped water ways. Trees are illustrative, not surveyed facts.

## Reproduce the screenshot more closely

The map now uses warmer cream land, brighter blue water, white roads, light-green parks, and hides generic building polygons. The supplied miniature illustrations are still simple SVGs; they cannot match the detailed miniature buildings in the reference image yet.

Next design steps:
1. Approve an art guide: consistent three-quarter miniature perspective, soft upper-left lighting, transparent background, soft contact shadow and 3:4 image bounds.
2. Replace the main `/map-art/charminar.svg`, `fort.svg`, `tomb.svg` etc. with **reviewed** high-detail transparent WebP/PNG drawings. Reuse the same filenames or update `illustrationFor` and asset paths.
3. Add multiple coordinated tree sprites and test sizes at zoom 12–16.
4. Test Charminar, Golconda and Hussain Sagar on real phone-size viewports. Confirm marker overlaps and tap behaviour.
5. If needed, add georeferenced scenic raster overlays in a later phase, after vetting their source and alignment.

The database, security policies and existing place-submission process are untouched. No additional API keys are required for the map generator.

## Attribution and safety

OpenStreetMap data: © OpenStreetMap contributors, subject to ODbL. Keep the provider attribution control visible. Check Overpass API usage guidance and avoid frequent full-city regeneration. All generated trees are **decorative illustrations**, not surveyed tree locations.
