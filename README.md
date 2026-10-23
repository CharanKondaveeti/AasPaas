# AasPaas

Simple Hyderabad discovery map built with **Vite + React + TypeScript**, MapLibre, Supabase, and Vercel Functions.

## Development

Run `npm install`, then configure public Supabase values in `.env.local` (see `.env.example`). `npm run dev` serves the Vite frontend only; use `npx vercel dev` for the frontend and `/api/*` functions together after linking to the Vercel project.

## Production

Vercel: Framework Vite, install `npm install`, build `npm run build`, output `dist`.

Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public), `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SECRET`, `APP_ORIGIN` (server only). Generate RATE_LIMIT_SECRET with a cryptographically secure random secret, >=32 characters. The service key and rate limit secret must NOT use the VITE_ prefix.

Supabase migration: `supabase/migrations/20261023090337_city_discovery.sql`. Seed: `supabase/seed.sql`. Existing Supabase project `besbdmgryvwaqdyolmej` has both applied. Create an admin user in Supabase Auth and insert its UUID into `public.admins` using a trusted administration session. Never insert admin records using a browser or expose service credentials.

Public places are approved only. Suggestions are private until approved by the curator. Photo uploads use private Storage. No gamification.
