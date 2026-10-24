import { hideZoom, prominenceScore, revealZoom } from "./prominence";
import type { Place } from "../../../lib/types";

type LocatedPlace = Pick<Place, "id" | "latitude" | "longitude" | "prominence_score">;

/** Remember only markers revealed within the viewport; don't drop them on RPC refresh.
 * At wide zoom, iconic places remain even when local places have disappeared.
 * Density applies to NEW reveals only, never to already-visible markers.
 */
export function keepRevealedPlaces<T extends LocatedPlace>(
  seen: Map<string, T>,
  incoming: readonly T[],
  zoom: number,
  inViewport: (place: T) => boolean,
  canReveal: (candidate: T, visible: readonly T[]) => boolean = () => true,
): T[] {
  for (const [id, place] of seen) {
    if (zoom < hideZoom(place)) seen.delete(id);
  }
  const ordered = [...incoming].sort(
    (a, b) => prominenceScore(b) - prominenceScore(a) || a.id.localeCompare(b.id),
  );
  for (const place of ordered) {
    if (!Number.isFinite(place.longitude) || !Number.isFinite(place.latitude)) continue;
    if (!inViewport(place) || zoom < revealZoom(place)) continue;
    if (seen.has(place.id) || canReveal(place, [...seen.values()])) seen.set(place.id, place);
  }
  return [...seen.values()].sort(
    (a, b) => prominenceScore(a) - prominenceScore(b) || a.id.localeCompare(b.id),
  );
}
