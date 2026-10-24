# AasPaas food map marker — Nimrah reference

## Two-line illustrated food marker
A centered food icon overlaps a soft white pill. The venue name uses a bold
dark line and the signature dish a smaller muted blue-grey line. A *single*
orange map-location dot appears beneath the card. This is a MapLibre GPU
symbol, not an independently floating HTML label, so illustrations track pan,
zoom and tilt with their anchors.

Selected venues receive an orange outline and slightly larger symbol, with the
already existing place-detail sheet. Neither ratings nor verification status
is fabricated.

## Zoom behaviour
- All places use the same 0–100 editorial map-priority rules.
- Citywide icons (90+) appear at zoom 9.3, with **full names and signature items**.
- Scores 80–89 also show full name cards from their first appearance at zoom 10.7.
- Scores 65–79 appear at zoom 12, 50–64 at 12.8, and others at zoom 14.
- Lower-ranked food illustrations remain compact until zoom 13.6, then show full name cards.
- Once a marker has appeared, it persists down to its own hide zoom (reveal minus 1.5).
- Higher-ranked new places take precedence in crowded areas, while existing visible markers
  are never removed just because another marker is nearby.
- Changing discovery filters resets the session's remembered places.
- Selecting a place draws its highlighted card above all other markers.

Signature items use the place's existing short `famous_for` value or `dish` category.
Long descriptions are never substituted with invented menu items.

## Prominence ranking (2026-10)
- Every place has an editorial prominence score from 0–100 in the canonical Supabase places table.
- 90+ starts at zoom 9.3; 80+ at 10.7; 65+ at 12; 50+ at 12.8; other places at 14.
- Every revealed marker persists until zoom falls 1.5 below its initial threshold.
- Scores 80+ ALWAYS render full illustrated name + signature dish cards from their first reveal, including city overview. Lower-ranked places use compact illustrations until zoom 13.6.
- New cards respect viewport-based spacing, chosen by score. Existing revealed cards never vanish because of a collision or a new RPC response.
- All records use identical priority logic, including food preview records. Admins can adjust prominence scores and add a rationale.
- Supabase RPCs sort public places by priority before the limit; food preview ranks within each dish to retain category balance.
