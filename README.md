# AasPaas

A map-first guide to Hyderabad. Real streets, a quiet custom map, and a small collection of places worth discovering. Built from the Galli brief under the repository’s AasPaas name.

## Run locally

Use Node.js 22.12+ (Node 24 recommended).

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No map key or database is needed to browse the bundled collection. Internet and WebGL are required to render the live vector map. When the map provider fails, the accessible place list remains available.

**This is implemented application source, not a configured live service.** Connect a dedicated Supabase project before using suggestions and moderation. Without it, submission returns an explicit unavailable response; nothing is silently saved to local storage. No production deployment or live Supabase moderation test has been performed.

## Implemented

- Next.js App Router, React, strict TypeScript and Tailwind CSS.
- Real OpenStreetMap-derived OpenFreeMap vector tiles, custom warm-white roads, blue water, soft parks and locality labels. Residential buildings and business labels are hidden.
- Bounds-based place loading, clustered collision-aware SVG markers, category/dish filters, curated search and spelling normalization.
- Ameerpet locality shortcut; other area names search the curated place data.
- Desktop side panel and mobile bottom sheet, external Google Maps directions, geolocation, zoom and tilt controls.
- Original lightweight food illustrations; no emoji map markers.
- A lazy-loaded GLB Charminar illustration at its sourced coordinate, visible at zoom 16+. Tilt and zoom in to view it. This is a stylized miniature, **not a surveyed architectural replica**. Other landmark models are not included.
- Map-picked suggestions, optional decoded/re-encoded WebP photo upload, size limits, same-origin checks, atomic database rate limit and duplicate protection.
- Supabase email/password admin sign-in, live server-side admin-membership checks, review/edit/approve/reject/unpublish, photo replacement and pagination.
- PostGIS migration, spatial index, RLS, private photo bucket, source-checked seed SQL, CI and tests.

## Project structure — follows Qualify

```text
src/
  app/                      Next.js routes, layouts and API handlers
  features/
    explore/components/     Search, filters, place list and details
    explore/data/           Source-checked curated places
    map/components/         MapLibre lifecycle and controls
    map/layers/             Custom style, marker icons and 3D layer
    suggestions/components/ Contribution form
    admin/components/       Sign-in and moderation
  services/                 HTTP data services
  lib/                      Types, validation, Supabase and server security
  shared/components/        Reusable accessible dialog
  styles/                   Application and responsive styles
public/icons/               Original SVG illustrations
public/models/              Original optimized GLB illustration
supabase/migrations/        Database schema and permissions
supabase/seed.sql            Curated collection for the live database
scripts/                    Dev launcher and asset/data generation
tests/                     Validation and route security tests
 docs/                      Setup, sources, verification and architecture
```

Qualify uses Vite/JavaScript. AasPaas preserves its feature/service/shared organization while using the Next.js/TypeScript stack requested in the brief. No Qualify business code, credentials or data were copied.

## Connect the backend and deploy

Follow [docs/SETUP.md](docs/SETUP.md). Full variable names are in [.env.example](.env.example). SQL is separate in [supabase/migrations](supabase/migrations) and [supabase/seed.sql](supabase/seed.sql).

```bash
npm test
npm run typecheck
npm run build
npm start
```

See [docs/TESTING.md](docs/TESTING.md) for the exact verified scope and remaining browser/database checks. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for coordinate provenance and asset attribution.

No badges, points, chat, feeds, profiles or subscriptions.
