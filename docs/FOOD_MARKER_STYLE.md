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
- At 12.8 and above: first reveal places within the current map viewport.
- Once revealed, places remain on the map even after a viewport refresh, and
  their markers don't fade out when neighbouring markers overlap.
- From 10.8 to 13.6: compact food illustrations keep those seen places visible.
- At 13.6 and above: name + signature dish on full markers. In dense streets,
  the full cards may overlap rather than silently hiding some destinations.
- Below 10.8 (wide city overview): hide markers and reset this visit's seen places.
- Changing search, category or demo filters also resets remembered places.
- On tap: the selected marker remains highlighted over other symbols.

Signature dish is drawn from the food entry's existing short `famous_for` value
or its `dish` category. Long editorial descriptions are never displayed as
made-up menu items.

The optional 600-place preview still uses its separate unverified fictional
data. It does **not** become verified by showing natural-looking shop names.
