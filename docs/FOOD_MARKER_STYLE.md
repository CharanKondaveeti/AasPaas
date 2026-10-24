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
- Zooming out immediately removes lower-priority markers as soon as their reveal threshold is crossed. No marker memory or sticky reveal.
- At every zoom and pan, visible places are re-ranked and spaced on screen: city overview uses ~250 CSS-pixel separation, relaxing progressively toward street zoom. A crowded area shows only the highest-ranked eligible places.
- Changing discovery filters recalculates markers from the new results; there is no previously-revealed cache.
- Selecting a place draws its highlighted card above all other markers.

Signature items use the place's existing short `famous_for` value or `dish` category.
Long descriptions are never substituted with invented menu items.

## Prominence ranking (2026-10)
- Every place has an editorial prominence score from 0–100 in the canonical Supabase places table.
- 90+ starts at zoom 9.3; 80+ at 10.7; 65+ at 12; 50+ at 12.8; other places at 14.
- Marker visibility is determined only by current zoom, viewport, rank, and available screen space; previously revealed places do not persist when zooming out.
- Scores 80+ ALWAYS render full illustrated name + signature dish cards from their first reveal, including city overview. Lower-ranked places use compact illustrations until zoom 13.6.
- All visible cards respect viewport-based spacing, chosen by score on every zoom; less important cards are hidden when space becomes limited.
- All records use identical priority logic, including food preview records. Admins can adjust prominence scores and add a rationale.
- Supabase RPCs sort public places by priority before the limit; food preview ranks within each dish to retain category balance.

## Smooth map dragging
- MapLibre keeps the same GPU markers while a user drags. A camera pan does not call `source.setData` or rebuild the icons.
- Place queries fetch a padded region and refresh only when the viewport approaches its edge, preventing repeated disappearing/reappearing cards on short drags.
- New RPC results merge into a bounded geographic candidate pool; a replaced viewport response does not wipe the still-nearby places.
- The candidate pool is **not** a sticky-reveal feature. Every zoom uses current priority thresholds and spacing, so zooming out still declutters.
- Changing filters clears the candidate pool immediately. Panning to a distant area prunes out-of-range candidates.
