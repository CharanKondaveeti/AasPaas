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
- 12.8 to 13.6: icon-only compact food symbols to reduce clutter.
- 13.6 and above: name + signature dish.
- On tap: a highlighted full selected marker is rendered above unselected symbols.
- Competing labels use MapLibre's collision detection, without numbered clusters.

Signature dish is drawn from the food entry's existing short `famous_for` value
or its `dish` category. Long editorial descriptions are never displayed as
made-up menu items.

The optional 600-place preview still uses its separate unverified fictional
data. It does **not** become verified by showing natural-looking shop names.
