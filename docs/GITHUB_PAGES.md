# GitHub Pages preview

AasPaas can be viewed directly on GitHub Pages, separate from Vercel.

**Expected website:** https://charankondaveeti.github.io/AasPaas/

**Repository:** https://github.com/CharanKondaveeti/AasPaas

## One-time activation

GitHub Pages must be enabled by a repository administrator:

1. Open [AasPaas → Settings → Pages](https://github.com/CharanKondaveeti/AasPaas/settings/pages).
2. Under **Build and deployment**, choose **GitHub Actions** as the **Source**.
3. A workflow named **AasPaas GitHub Pages preview** runs on pushes to `main`. If needed, open [Actions](https://github.com/CharanKondaveeti/AasPaas/actions/workflows/github-pages.yml) and run it manually.
4. After a successful deployment, open the website URL above.

The workflow builds with `GITHUB_PAGES=true` to set Vite's asset base to `/AasPaas/`. Assets, map GeoJSON and illustrated SVGs are served from the matching subpath. It uses a **client-side publishable Supabase key** (already public by design, never a service-role/secret key) so approved place listings can update from the existing Supabase RPC. If the key rotates, set `VITE_SUPABASE_PUBLISHABLE_KEY` in repository **Settings → Secrets and variables → Actions → Variables** to override the fallback publishable key.

## What works on GitHub Pages

- India and Hyderabad map, boundary, native MapLibre layers, SVG place icons
- Search and category/food filters
- Read-only approved places from Supabase and place information panels
- Mobile and desktop experience

## What stays on the main Vercel deployment

GitHub Pages is static hosting and does **not** execute `/api/*` Vercel functions. As a safeguard, the preview hides **Suggest a place** and **Curator access**. Admin writes, authenticated operations, and suggestion/image uploads must be used on the original full application with its server backend.

This is an additional preview site, not a replacement for Vercel. No changes to Supabase permissions, service credentials or database schema are necessary.

## Checks

The existing test suite includes `tests/github-pages.test.ts`; the deployment workflow runs `npm ci`, `npm test`, and `npm run build`. Preview artifact goes to GitHub Pages, not the repository's `gh-pages` branch.
