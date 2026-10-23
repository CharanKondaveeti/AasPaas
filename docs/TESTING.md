# Verification

## Recorded result — 23 October 2026

- 24 automated tests passed, including PostgreSQL/PostGIS execution and real image decoding.
- TypeScript check passed.
- Optimized Next.js production build passed.
- Customized provider style passed MapLibre style-spec validation.
- `npm audit --omit=dev` reported zero known production dependency vulnerabilities at verification time.
- Browser QA and hosted Supabase end-to-end checks remain unverified, as described below.

## Automated checks

```bash
npm ci
npm test
npm run typecheck
npm run build
```

The tests call real route handlers in isolated no-backend mode. They cover client-supplied privilege fields, validation, coordinate boundaries, spellings, source-data completeness, malicious URLs, public query filtering, unauthorized admin reads/writes, cross-origin requests, explicit unconfigured-backend behavior, malformed forms and body limits including requests without Content-Length.

The database suite runs the unmodified migration and seed against PostgreSQL/PostGIS in PGlite, with fixture Supabase roles and Auth/Storage schema shells. It checks spatial queries, normalized search, rate limiting, duplicate rejection, RLS, denied writes, denied self-promotion, and approval/rejection visibility. This is actual SQL execution, but does not verify hosted Supabase Auth, HTTP APIs, Storage or concurrent multi-connection behavior.

## Required live database checks

After configuring a dedicated test project:

1. Anonymous API reads return approved rows only. Pending/rejected rows and `admins`/`submission_limits` are inaccessible.
2. Anonymous and ordinary authenticated users cannot insert/update/delete places, call `submit_place` or `consume_submission_limit`, or directly read/upload Storage objects.
3. An ordinary signed-in user receives 403 from admin endpoints. A revoked admin is denied on the next request.
4. A valid public suggestion appears only in pending review. Direct API payloads cannot choose `approved`, `photo_path`, IDs or admin membership.
5. Six requests in an hour with the same trusted address return 429 on the sixth. Test concurrency and multiple application instances.
6. Concurrent same-name/location submissions yield one place. Different punctuation/case of the same name also conflicts within 100 m. The deduper does not promise semantic matching of unrelated spellings; curators also inspect the existing-place search.
7. Corrupt, SVG, oversized and decompression-bomb photos fail. Valid images become resized WebP with metadata removed. Pending photos are unavailable anonymously.
8. A curator edits details, adds the source and photo rights, and approves. The place appears publicly on the next fetch. Reject/unpublish hides it. Replacing a photo removes the old private object.
9. Run Supabase security/performance advisors and inspect errors. Use a staging project, not Qualify.

## Browser acceptance checks

The managed preview server started successfully, but the browser security policy blocked access. Visual layout, actual WebGL output, touch behavior and end-to-end workflows are **not verified in this environment**.

Test on desktop Chrome/Firefox/Safari and a real mid-range Android device:

- City map shows real roads, parks and water with required visible attribution.
- Search, every category, dish filters, empty states, clear search and retry.
- Click list items and map icons; click a cluster to expand; search Ameerpet to move there.
- Desktop details and mobile bottom sheet. No overflow at 360 px; controls do not cover attribution.
- Map drag, wheel/pinch/double-click zoom, keyboard focus, reduced motion and denied geolocation.
- Zoom 16+ at Charminar and tilt: model anchors correctly without hiding roads. Verify GPU cleanup and no continuous repaint while idle.
- Suggest flow: draft fields survive map picking; photo consent and server errors; success only after persistence.
- Admin login, refresh behavior, paging, edit, replacement photo, reject and approve.
- Offline/slow style and tile requests: readable error and accessible place list. Retry recreates the map cleanly.
- Check network and console for CSP errors, leaked secrets, unhandled promises and duplicate map instances.

Until these checks and live database tests pass, treat the project as an implemented release candidate, not a fully verified production launch.
