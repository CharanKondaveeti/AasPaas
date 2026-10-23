# Galli / AasPaas geographic illustration automation

This is the **first automation stage** for matching the illustrated Hyderabad reference in the existing Vite + MapLibre application. The map keeps real coordinates; the artwork is not a fixed screenshot.

## Existing assets reused

- Existing OpenFreeMap vector tiles, restyled by `src/features/map/layers/style.ts`.
- Existing hand-authored landmark and food SVGs in `public/map-art/`.
- Existing Supabase places, search, user submissions and moderation.
- Existing illustrated markers in `src/features/map/layers/illustrations.ts`.

## Park boundary greenery (October 2026 update)

The AasPaas map no longer draws the old generic tree / garden SVG map pins for parks. Park entries remain in the searchable list and can still be opened there; non-park places continue using category icons.

The generator now places **larger, detailed WebP trees near the INSIDE edges of real mapped park polygons** (about 9–20 metres inward, with checked polygon membership and mapped-water exclusion). Eligible parks receive points in round-robin order so very large parks do not monopolize the city-wide limit. Other woodland areas are decorated after parks.

MapLibre draws three GPU symbol layers with progressive visibility around zoom 11–16. No HTML tree markers are used; other place pins appear above them. Parks need a mapped polygon to get boundary trees: the generator currently handles closed OSM ways (not all multipolygon relations, holes or unmapped parks). Any image may extend visually across the polygon edge at lower zoom even though the geographic anchor is inside.

Generation updates are done by `npm run map:scenery` or the GitHub Actions workflow, triggered when the generator script or workflow changes on main. Generated `public/map-data/trees.geojson` is then committed, deploying separately. The existing static file stays available until that run finishes. Map art remains stable between page loads.

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


## Curated illustrated greenery — live integration

The 19 transparent tree, bush, hedge, flowering and forest illustrations from the
user's ChatGPT Library are included in Git as a small versioned WebP atlas:
`assets/galli-greenery-atlas.b64`. Git uses text storage for the atlas, not
an external image service. `scripts/prepare-greenery.mjs` decodes and splits it
into `public/map-art/greens/*.webp` automatically before `npm test`,
`npm run dev` and `npm run build`.

The catalogue `src/features/map/layers/greeneryAssets.ts` deterministically picks
sprites using a fixed hash and visual weights. Actual map placement continues
to come from the OSM green-area generator (or a small park-specific fallback).
`CityMap.tsx` registers the individual WebP textures in MapLibre and draws
three native WebGL layers: base (city zoom), park (medium zoom), and detail
(close zoom). Tree art cannot take priority over place labels.

**Quality/performance notes:** These are lightweight 80px source cells designed
for small illustrated map icons, not full-screen images. They are not surveyed
individual trees. They do not require API keys, HTML markers, or additional
requests to image hosting services. The original high-resolution PNG artwork is
kept in the user's Library; this compact atlas is intended for city-scale
rendering.

### Geographic scenery data

A separate `.github/workflows/generate-greenery.yml` workflow can fetch
green-space polygons through Overpass, validate the resulting points and commit
`public/map-data/trees.geojson`. The generator intentionally avoids mapped
water areas and polygon edges. It does not yet handle relation multipolygons,
internal roads, or every park's internal footpaths: visual map QA is still
required. Should the OSM fetch fail, the application falls back to small,
approximate decorative clusters near named parks; the map itself keeps working.

You can rebuild data manually using `npm run map:scenery` and review the
generated coordinates before publishing. Do not routinely run large Overpass
requests at browser runtime.

## Attribution and safety

OpenStreetMap data: © OpenStreetMap contributors, subject to ODbL. Keep the provider attribution control visible. Check Overpass API usage guidance and avoid frequent full-city regeneration. All generated trees are **decorative illustrations**, not surveyed tree locations.
