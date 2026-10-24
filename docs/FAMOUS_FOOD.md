# Famous Food — AasPaas Hyderabad

## Shipped UI
- Food-first map section and 20 original illustrated SVG category icons, used in filter drawer.
- Keeps the existing 10 high-quality food WebP map illustrations; adds 10 new SVG map illustrations for dishes without WebP artwork.
- Map quick chips + full responsive bottom-sheet filters by dish, price (₹50/₹100/₹200/₹500), opening schedule, dietary preference and local food style.
- Verified dish cards, price evidence, weekly hours (overnight supported in IST), Save on this device and WhatsApp sharing.

## Data contract
- Existing `places` records and schema remain intact.
- `food_dishes`: dish name and category key, verified price or null, verified diet or unknown, source URL.
- `food_hours`: weekly day 0=Sunday to day 6=Saturday, opening/closing local Hyderabad time, explicit overnight flag and source.
- `food_tags`: validated food style and source.
- `explore_famous_food` and `famous_food_details` are invoker RPCs; public users can only see approved listings.
- `save_food_profile` is service-role only and inserts/replaces the full metadata atomically. Only the authenticated server curator API calls it after checking the admins table.
- Source links alone do not prove any fact. Curators must check the exact dish, price, hours and business identity before saving.

## Data gaps
As of launch, existing 10 food places have no published verified prices or hours. Results under a budget or Open Now can correctly show zero until curators fill the information. **Do not backfill made-up metadata to make filters appear populated.**

## Manual checks
- Food → Biryani, Irani Chai, Punugulu, Mandi and other illustrated filters
- Under ₹100, Open now, After 11 PM, Veg, Street food on an uncurated place: should be absent
- Check a curated food profile, confirm relevant filters show it
- Overnight Friday 8 PM → Saturday 2 AM and day boundaries
- Dragging/zooming map: GPU markers should stay fixed, no numbered clusters
- Mobile bottom sheet scroll, reset, close/Escape, search, map, directions, save and WhatsApp
- Admin API endpoints require login and same-origin modifications; RLS prevents browser writes
