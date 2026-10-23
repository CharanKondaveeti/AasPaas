# Setup and deployment

## 1. Map

The default map needs no account or key. It reads `https://tiles.openfreemap.org/styles/liberty`, keeps its real geography, and changes presentation in `src/features/map/layers/style.ts`.

OpenFreeMap public hosting permits commercial use and currently requires no API key. It offers no SLA. For an uptime guarantee, arrange a licensed provider or self-host OpenMapTiles. If changing provider, adapt the style schema and update the `connect-src`, `img-src` and font restrictions in `next.config.ts`. Do not remove attribution. Do not replace map geometry with generated images.

Credits: OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors. MapLibre reads attribution from the provider TileJSON. Keep its attribution control visible on all screen sizes.

## 2. Dedicated Supabase project

Create an AasPaas project. Do not apply this schema to Qualify or another existing application without a separate migration review. The migration expects a clean project with PostGIS in the `extensions` schema.

In the Supabase SQL editor run:

1. `supabase/migrations/20261023090337_city_discovery.sql`
2. `supabase/seed.sql`

Alternatively, use a current Supabase CLI: inspect `supabase link --help` and `supabase db push --help`, link the dedicated project, and apply migrations. Run seed SQL explicitly on hosted projects; do not assume `db push` seeds them.

The migration creates `places`, `admins`, `submission_limits`, private `place-photos` Storage, and narrowly granted RPCs. It enables RLS on every application table. Public clients only have SELECT access to approved places. Admins mutate through server routes; their session alone never grants a privileged database key.

## 3. Environment

Copy `.env.example` to `.env.local` locally. Add the same values to the hosting provider for production.

| Variable                             | Value                                                                         | Browser visible? |
| ------------------------------------ | ----------------------------------------------------------------------------- | ---------------- |
| NEXT_PUBLIC_SUPABASE_URL             | Project URL                                                                   | Yes              |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable API key (legacy anon key is compatible)                           | Yes              |
| SUPABASE_SECRET_KEY                  | Project secret API key (legacy service_role key is compatible)                | **No**           |
| APP_ORIGIN                           | Exact origin, e.g. https://your-domain.example, no trailing slash             | No               |
| RATE_LIMIT_SECRET                    | At least 32 random characters; generate with `openssl rand -hex 32`           | No               |
| TRUSTED_IP_HEADER                    | `x-vercel-forwarded-for` on Vercel; otherwise a proxy-overwritten header only | No               |

Never put secret keys in `NEXT_PUBLIC_*`, commits, screenshots, URLs or client storage. Restart the dev server after changing variables. Next public variables are embedded during build, so set them before deployment.

Rate limiting is stored in PostgreSQL and shared between server instances: five attempts per hour per HMAC-hashed client address. If no trusted header is configured, submissions use a conservative shared bucket. Do not trust arbitrary client-supplied forwarding headers. Configure a body limit of 4 MB at the hosting edge as well as the application limit. On Vercel the platform has its own request-size limit.

## 4. First admin

Create a user in Supabase Authentication through the dashboard (do not expose public admin signup). Copy that user's UUID. In the SQL editor:

```sql
insert into public.admins(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
```

Visit `/admin` and sign in. Sessions are memory-only and cleared on reload; access tokens are checked with Supabase `getUser` for each admin request, then membership is looked up live. Remove the `admins` row to revoke moderation access immediately. Do not use user-editable metadata for admin roles.

Verify the location and metadata before approving. A verification URL is required to publish. If a photo is included, add its owner and license/permission in Photo credit. Reject/unpublish removes it from the public map; rows remain for review. Uploaded originals are decoded, resized and re-encoded to WebP with metadata stripped.

Enable Supabase Auth's own sign-in rate protections and use strong admin credentials. The application does not create or set a default admin password.

## 5. Deployment

Use a Node-capable Next.js host. This app has server routes and is **not** a static GitHub Pages export.

For Vercel: import `CharanKondaveeti/AasPaas`, choose Next.js, set environment variables, use `npm ci` and `npm run build`, and deploy. Configure `APP_ORIGIN` to the actual domain. Set `TRUSTED_IP_HEADER=x-vercel-forwarded-for`. Configure each preview origin separately if testing submissions on preview deployments.

For a Node host: run `npm ci`, `npm run build`, then `npm start` behind HTTPS and a reverse proxy with a 4 MB body limit. Set a proxy-overwritten IP header or leave the shared bucket enabled. Do not cache admin or private-photo responses.

After deployment run the manual browser and database checks in TESTING.md. Inspect Supabase security/performance advisors. A compiled application is not a substitute for live RLS and Storage verification.
