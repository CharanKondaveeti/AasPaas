import type { Place } from "../../../lib/types";

/** Display prominence is an editorial map priority, not a public rating. */
export function prominenceScore(place: Pick<Place, "prominence_score">): number {
  const score = place.prominence_score;
  return typeof score === "number" && Number.isFinite(score)
    ? Math.max(0, Math.min(100, score)) : 45;
}

/** Initial reveal happens earlier for iconic destinations. */
export function revealZoom(place: Pick<Place, "prominence_score">): number {
  const score = prominenceScore(place);
  if (score >= 90) return 9.3;
  if (score >= 80) return 10.7;
  if (score >= 65) return 12;
  if (score >= 50) return 12.8;
  return 14;
}

/** Important places always carry their name + speciality, even at overview zoom. */
export function fullNameCard(place: Pick<Place, "prominence_score">, zoom: number): boolean {
  return prominenceScore(place) >= 80 || zoom >= 13.6;
}

/** Minimum on-screen separation for full illustrated cards (CSS pixels).
 * Recalculated at every zoom: wide city views are deliberately sparse.
 */
export function minMarkerDistance(zoom: number): number {
  if (zoom >= 16) return 90;
  if (zoom >= 14.5) return 125;
  if (zoom >= 13.6) return 165;
  if (zoom >= 12) return 200;
  return 250;
}
