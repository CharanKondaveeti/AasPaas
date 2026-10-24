# AasPaas Hyderabad — 300-place launch collection

## Product promise

**Discover what's special around you, recommended by people who know the area.**
Not a generic business directory, not a copy of Google Maps.

Targets are **verified publishable places, not inserted rows**:

| Discovery group | Launch target | Priority examples |
|---|---:|---|
| Famous Food | 210 | signature dishes, traditional breakfasts, late-night snacks, chai, small stalls |
| Scenic & Culture | 60 | publicly accessible viewpoints, meaningful local heritage, quiet walks, photogenic spots |
| Specialty Shops | 30 | unusual makers, old bookstores, traditional market specialists and local crafts |
| **Total** | **300** | |

**Hidden Gem is a curator-reviewed badge** that can apply to any of these three groups. It is **not** a fourth group and cannot be created simply because a place is unpopular.

## Current baseline (24 October 2026)

Before launch migration: 105 approved records: 10 Food, 85 Nature/Places/Fun & Activities, 10 Shopping. All 105 have source URLs, but **none had hours, prices or uploaded photos**, and approval historically did not mean a full AasPaas verification. None was automatically marked verified.

The new curator dashboard counts **verified** entries separately from **approved** entries. It will read 0/210, 0/60 and 0/30 until curators actually check each record. The existing app remains usable; approved records still show on the map, with missing data explicitly handled.

## A curator checks each record before marking verified

1. **Reason to visit:** specific signature dish, interesting local story, beautiful public view, or specialty product. Reject generic shops without a clear differentiator.
2. **Identity and location:** business name and exact entry coordinates checked against an official listing, recent reliable source or an actual on-site confirmation.
3. **Independent evidence:** attach a source URL; note exactly what was checked and when in `verification_notes`. If the primary source is outdated or generic, keep the record unverified.
4. **Signature and category:** fill `famous_for` truthfully; assign exactly one `discovery_group`. Food categories may have dishes.
5. **Hours and budgets:** enter only current sourced/confirmed information. Empty is safer than made-up hours, prices or open-now claims.
6. **Photos:** upload only images owned by the contributor or licensed for reuse; retain credit/licence. Never scrape Instagram or Google Photos to populate the map.
7. **Hidden Gem:** only mark after the listing itself is verified, with a meaningful local explanation in `hidden_gem_reason`; favour independent/local operators over popular chains.
8. **Duplication:** check name variants, near-identical coordinates, different names for one entrance and venue relocations before publish.

When evidence is inadequate, keep `listing_verified_at = null`. When a business closes or its location moves, revise/reverify or unpublish. A source link alone is **not** certification.

## Launch sequencing

- **Wave A — food (70 verified):** Old City, Charminar, Abids, Koti, Secunderabad. Prioritize local specialties and meals under ₹100.
- **Wave B — 70 more food + 25 experiences:** Himayatnagar, Banjara Hills, Jubilee Hills, Lakdikapul, Begumpet.
- **Wave C — 70 food + 35 experiences + 30 shops:** Madhapur, Gachibowli, Kondapur, Khairatabad, residential neighborhoods.
- Measure geographic coverage, actual recommendation quality, freshness and duplicate rate after every wave.

## Data and safety rules

- `status='approved'` controls current public listing access; `listing_verified_at` is an independent evidence gate.
- Database check constraints prevent verified Hidden Gems without a reason and verification evidence.
- The public discovery RPC runs `security invoker` and inherits RLS; public users cannot set verified flags or modify curation.
- Incoming suggestions remain pending until an admin reviews them.
- There is no automatic open-now, price, popularity or Hidden Gem claim without reliable data.
- Existing Food miniatures are kept, and local attractions/shops use compact GPU vector pins rather than floating HTML markers.

## Launch acceptance gates

- [ ] 210 verified Food
- [ ] 60 verified Scenic & Culture
- [ ] 30 verified Specialty Shops
- [ ] No duplicate venues; correct entrance coordinates
- [ ] The food budget and opening-hour filters only reflect sourced data
- [ ] Every featured Hidden Gem has evidence notes and a locally relevant explanation
- [ ] Regression tests, mobile map gestures and RLS checks pass
