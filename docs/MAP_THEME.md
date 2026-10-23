# AasPaas Illustrated Hyderabad — MapLibre theme

This is a **real geographic and interactive map**. It is NOT a fixed screenshot,
not a fake illustrated tile and does not move places away from their coordinates.

## How the theme is implemented

- `src/features/map/layers/style.ts`: style palette applied to live
  OpenFreeMap Positron vector layers. Roads are cream, parks soft green,
  lakes turquoise, and most generic third-party POI symbols are suppressed
  so the curated AasPaas spots stand out.
- `src/features/map/layers/scenery.ts`: deterministic, GPU-rendered decorative
  groves near mapped green-space POIs and small ornamental water ripples.
  They are **illustrative, not actual tree or lake surveying**.
- `src/features/map/layers/illustrations.ts`: hand-authored landmark/food/art
  picker and accessible clickable markers attached to real coordinates.
- `public/map-art/*.svg`: original miniature-style SVG assets.
- `src/features/map/components/CityMap.tsx`: MapLibre camera, map layers,
  source data, markers and position picker.
- `src/styles/app.css`: responsive illustrated map UI and right-side
  selected-place panel on desktop.

The original React application, location suggestion flow, Supabase RLS and
100 curated place records are unchanged.

## Important limitations

This is a first production-friendly **illustrated vector map theme**, not a
pixel-perfect reproduction of the user-supplied fantasy map. The reference
has exaggerated landmark geography, custom modelled assets, hand-drawn
nongeographic lakes, and marketing-style place ratings that may be fictitious.
AasPaas preserves actual location coordinates and does not invent ratings,
travel distances, opening hours, or photographs.

For even closer artwork fidelity, create commissioned or licensed high-detail
isometric transparent WebP assets for each main landmark (same viewing
angle, light source, color palette and 3:4 asset bounds). Replace the
`/map-art/` asset files without changing app architecture.

## Attribution

OpenFreeMap uses OpenStreetMap-derived map data and the attributions must
remain visible. Respect provider and ODbL attribution requirements.
