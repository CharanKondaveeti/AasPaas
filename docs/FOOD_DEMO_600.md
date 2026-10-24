# Food testing data now lives in one place table

AasPaas stores **600 generated food test records in public.places** alongside
105 approved, existing genuine-place records, for **705 total** at migration.

The `food_demo_places` table was dropped; the browser no longer generates 600
other records in JavaScript. The canonical place ID comes from Supabase.

## What users see
- All 20 food categories are available, with 30 stored entries each.
- Shop names are natural names without SAMPLE/DEMO prefixes.
- The **Try demo** preview control makes their test-only status visible
  outside the name.
- Users see the famous dish and illustrated food map icon for each shop.
- Locations, opening hours and prices in preview are generated **test data**.
  Directions and sharing are disabled in preview detail cards.
- The real Famous Food map continues to display only approved listings.

## Data safety
- `is_demo=true`, `status=pending`, no source or verification timestamp:
  generated shops cannot be misreported as curator verified.
- A dedicated RLS read policy permits public access to only deliberately
  flagged pending rows, **not** normal pending user submissions.
- The `explore_demo_food` RPC queries `places` directly, using invoker
  permissions and the selected viewport. Live RPCs still filter approved.
- The database CHECK constraint prevents test places from being approved
  without explicit removal of test designation and review.
- The curator's pending moderation queue hides test records.

## Scattering and geometry
- Distributed across **36 Hyderabad areas**, with random-looking, seeded
  bearing and radius from each neighbourhood centre.
- All 600 test coordinates are unique and at least **120 metres** from any
  other demo point or existing real place at migration.
- Irregular radial point distribution avoids straight-line placement.
- The coordinates are **not** claimed to match genuine store entrances or
  street addresses. They are illustrative for software testing.
- Migration creates a unique coordinate index for generated test records.

## Verification queries
```sql
select count(*) from public.places; -- 705
select count(*) from public.places where is_demo; -- 600
select count(distinct (latitude,longitude)) from public.places where is_demo; -- 600
select to_regclass('public.food_demo_places'); -- null
```

To move to genuinely sourced venues later, use verified place records with
real coordinates instead of automatically publishing these generated entries.
