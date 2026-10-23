# Data and assets

Coordinate checks performed 23 October 2026. Coordinate precision reflects the cited source; points identify attractions, not guaranteed accessible entrances. No hours, prices, ratings or photographs were invented.

| Place                      | Latitude  | Longitude  | Coordinate source                                                                                                                                                                                                      |
| -------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charminar                  | 17.361425 | 78.474444  | [UNESCO tentative list, DMS converted to decimal](https://whc.unesco.org/en/tentativelists/5573/)                                                                                                                      |
| Golconda Fort              | 17.385381 | 78.404131  | [UNESCO](https://whc.unesco.org/en/tentativelists/5573/)                                                                                                                                                               |
| Qutb Shahi Tombs           | 17.395481 | 78.396608  | [UNESCO](https://whc.unesco.org/en/tentativelists/5573/)                                                                                                                                                               |
| Nimrah Cafe                | 17.361389 | 78.4742856 | [OSM node 2710929650](https://www.openstreetmap.org/node/2710929650), cross-checked through [LatLong](https://www.latlong.net/poi/nimrah-471312) and [Mapcarta](https://mapcarta.com/N2710929650)                      |
| Salar Jung Museum          | 17.37143  | 78.48035   | [Wikidata-derived record](https://world-art-galleries.com/en/galeries/salar-jung-museum/), cross-checked against [Wikimedia institution coordinates](https://commons.wikimedia.org/wiki/Institution:Salar_Jung_Museum) |
| Hussain Sagar              | 17.42477  | 78.47332   | [Wikipedia](https://en.wikipedia.org/wiki/Hussain_Sagar), [DBpedia coordinate record](https://dbpedia.org/page/Hussain_Sagar)                                                                                          |
| Ameerpet locality shortcut | 17.437462 | 78.448288  | [LatLong](https://www.latlong.net/place/ameerpet-hyderabad-telangana-india-15716.html)                                                                                                                                 |

The lake marker is a feature center, not a shoreline entrance. Confirm practical destination access in Google Maps before travelling. Live crowd suggestions remain pending until a curator checks the location.

The other example venues in the brief are not preloaded because their branch-level coordinates and metadata have not been checked in this implementation. Empty food filters display an honest empty state. Add them through the reviewed contribution workflow after verification.

Map geography: OpenStreetMap via OpenFreeMap/OpenMapTiles. Consult [OpenFreeMap](https://openfreemap.org/) and [OSM copyright](https://www.openstreetmap.org/copyright) for terms. Coordinate-source text is not copied into the app; descriptions are short original summaries. No scraped venue photos are bundled.

All SVG illustrations and the low-poly Charminar model were created for this project. The model is a stylized visual symbol, not an architectural measurement or reconstruction. It does not alter roads or footprints. Generate it with `node scripts/create-landmark.mjs`; generate seed SQL with `node --import tsx scripts/seed-sql.ts`.

Lucide UI icons: ISC license. Three.js, MapLibre and other dependency licenses remain with their packages. The OpenFreeMap style is loaded with its source metadata retained; presentation overrides live separately in the code.
