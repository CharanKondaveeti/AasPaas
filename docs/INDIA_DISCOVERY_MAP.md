# India-wide discovery map

AasPaas is **live for Hyderabad**, with the rest of India marked *Coming soon*.

## Geographic display

- Users can pan and zoom across India, no longer restricted to a small Hyderabad camera rectangle.
- The green highlighted polygon and continuous emerald border represent the **Greater Hyderabad Municipal Corporation (GHMC) municipal boundary**, not Hyderabad district or the wider HMDA metropolitan planning area. This polygon was contributed to Datameet from OpenStreetMap in 2018. It is a display reference, **not an up-to-date official or survey-grade legal boundary**.
- `HYDERABAD` is a native MapLibre symbol, anchored at Hyderabad coordinates. It moves with the geographic map while dragging and disappears at close zoom when place markers reveal.
- Other Indian states/districts are native MapLibre symbol layers with geographic coordinates: `<name>\nCOMING SOON`. State labels are enabled at country-scale zoom, districts at regional zoom. MapLibre's collision detection may hide some labels; this is intentional.
- Zooming close to Hyderabad reveals the same curated Supabase places as before. The app retains search and selected-place flyTo.
- The left panel shows a Coming soon message when the map's center is outside the municipal polygon and offers a return-to-Hyderabad action.

## Static datasets

`public/map-data/hyderabad-ghmc.geojson`

- Source: [Datameet Municipal Spatial Data](https://github.com/datameet/Municipal_Spatial_Data/blob/master/Hyderabad/ghmc-area.geojson)
- Original: © OpenStreetMap contributors, Open Database License (ODbL), 2018.
- Use for geographic illustration only. Check newer GHMC jurisdiction changes before using this for official service availability.

`public/map-data/india-launch-regions.geojson`

- State and district points derived from [Open Admin Data](https://github.com/open-admin-data/india-administrative-divisions), CC BY 4.0.
- Provides 36 state/UT label points and 634 district label points outside GHMC. This version omits the older separate Daman and Diu state record to avoid double representation.
- These are **representative reference points**, not polygon centroids validated against all current administrative updates. Smaller or newly created districts may be absent. Source refresh should be reviewed before publication.

## Technical behaviour

The basemap stays on OpenFreeMap/MapLibre. Sources are loaded once from the same Vercel deployment; there is no external API request on map drag. All titles/boundaries remain GPU-rendered, not floating React HTML markers.

The app has not expanded the database or submission approval process outside Hyderabad. This is a map exploration preview, not a launch of AasPaas in other Indian regions.

Check: `npm test && npm run typecheck && npm run build`.
