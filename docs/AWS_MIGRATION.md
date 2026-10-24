# AasPaas: Vercel to AWS migration

## Migration safety
- Keep Vercel production active until AWS static site, API and submissions/admin/photo flows pass smoke tests.
- Preserve the existing Supabase database, Auth, Storage and RLS. Do not export or migrate data unnecessarily.
- Do not copy Supabase secret/service keys into GitHub, frontend environment variables or this repository.
- GitHub Pages is a read-only preview, **not** a functional replacement for the private API.

## Proposed AWS services
1. **AWS Amplify Hosting**: Vite/React static build (amplify.yml at repo root), automatic deploys from GitHub main after manual GitHub authorization in AWS Console.
2. **AWS Lambda + API Gateway HTTP API**: implement /api/places, /api/suggestions, /api/admin/places and /api/photos using the existing src/server/routes modules. The Vercel api/*.ts entry points are Vercel Node adapters, not deployable Lambda handlers.
3. **Supabase**: unchanged. Browser key is public. Backend key must be accessible ONLY from Lambda, ideally stored in AWS Secrets Manager.
4. **CloudWatch**: API logs/errors; Route 53/custom domain only once the site works.

## Must-do before cutover
- Confirm AWS Amplify GitHub app authorization to CharanKondaveeti/AasPaas.
- Set Amplify build variables VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (the publishable key is designed to be public).
- Add AWS API Gateway + Lambda with production runtime, secrets, origin validation and hardened trusted client IP handling.
- Preserve *same-origin /api routing* on Amplify with an explicit API proxy rewrite or serve API on a same-site hostname and update fetch routes and origin checks. Never let SPA catch-all swallow /api.
- Configure APP_ORIGIN as the final https:// AWS hostname, not the Vercel hostname. TRUSTED_IP_HEADER must be configured only when the API integration sanitizes incoming forwarding headers. Never blindly trust caller-provided x-forwarded-for.
- Use a minimal-permission IAM deploy role. Avoid long-lived access keys.
- Build/test: npm ci; npm test; npm run build.
- Confirm routes /, /admin, /api/health, /api/places, suggestions, admin auth, photo upload/download, MapLibre tiles, fallback behavior and mobile navigation.
- Change DNS only after production verification; do not retire Vercel first.

## Why this is not a static-only copy
The app needs dynamic server routes for suggestions, admin moderation and image sanitization with sharp. Moving only dist/ to Amplify preserves some public browsing but breaks writes and moderation.

## Git integration
AWS Amplify requires an authorized GitHub app connection for automatic repo builds. An AWS account connection by itself does not grant the console the GitHub repository OAuth authorization.

## Status
Infrastructure migration plan / static Amplify build config only. Not yet a completed deployment or Vercel retirement.
