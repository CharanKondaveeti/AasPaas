# AasPaas • Hyderabad discovery map

## Data
The initial **100 approved spots** consist of the six existing reviewed starter places and 94 newly sourced Hyderabad POIs.

New POIs use names and geographic locations from:
- [Hyderabad Atlas](https://github.com/imbhargav5/gpt-6-astra-hyderabad-osm) landmark coordinates (the repository documents coordinate verification)
- [Lakeer Hyderabad Open GIS](https://github.com/Lakeer-org/hyderabad-open-gis-data), including OSM-derived named parks, shops, and markets.

Each inserted record retains a `source_url`. OSM-based sources require OpenStreetMap attribution, supplied in the MapLibre base map. The source datasets reflect their respective collection dates and can include changed or closed businesses. Reconfirm venues, directions and access before presenting them as independently verified recommendations. No fabricated reviews, opening hours, pricing, or photos were added.

Seed script: `supabase/seed-hyderabad-100.sql`. Idempotent, with a deterministic UUID for every new POI. It does not delete or update submitted places or existing curated entries. Database moderation and RLS remain unchanged.

Current mix: 5 Food, 21 Places, 62 Nature, 10 Shopping, 2 Fun & Activities. Curation should add more verified food/activity choices later.

## Map
The map remains a **real panning/zoomable map** powered by MapLibre and OpenFreeMap Positron, with a lightweight illustrated cream/blue/green palette. Original source SVG landmarks are in `public/map-art/`; larger location art appears for a carefully selected set of landmarks, and small decorative trees are anchored near mapped green spaces. Decorative trees represent an artistic effect, **not an exact tree census**.

This is an illustrated-map **first implementation**, not a pixel-identical rendering of the user's reference illustration. Additional unique art can be expanded without changing the project architecture.

Existing responsive UI, search, location picker, user suggestion approval workflow, and backend policies are preserved.
