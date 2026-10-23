# Architecture

The browser owns map gestures and display state. Search/category changes update the discovery layer without reconstructing the map. Requests are debounced and aborted when obsolete. MapLibre owns clustering and collision avoidance. Three.js and the GLB load only after close zoom and are disposed when the map unmounts.

`GET /api/places` uses source-checked bundled data until all backend keys are present. Once configured, it only queries the database and never silently substitutes stale seed data on database failure. Normal browsing uses a PostGIS bounding box; search intentionally spans the Hyderabad collection so off-screen results can be selected. Responses are capped at 300 results; zoom in when the cap is reached.

`POST /api/suggestions` enforces same-origin submission, a durable HMAC-address rate limit, bounded multipart parsing, plain-text validation, Hyderabad bounds, photo consent, image decoding and pending status. Database duplicate checks serialize canonicalized names with an advisory lock. The service-role-only function cannot be called from a public client.

Admin authentication runs through Supabase Auth. Tokens stay in memory. Server routes validate the token online and check a private admin-membership table on every request. Public RLS only permits approved place reads; no browser role has write access. This avoids relying on UI guards or user-editable claims.

Photos are stored in a private bucket. A server endpoint checks place publication or admin authentication before returning bytes. Re-encoding strips metadata and discards active input formats. Photo rights still require human review; technical validation does not establish ownership.

Known boundaries: no full-text multilingual search, no semantic spam classifier, no surveyed 3D replicas, no navigation engine. The city field and spatial data model allow additional cities, but the public submission bounds and current UI intentionally support Hyderabad only. Expanding requires city configuration and new verified seed data.
