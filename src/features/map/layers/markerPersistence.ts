import { prominenceScore, revealZoom } from "./prominence";
import type { Place } from "../../../lib/types";

type LocatedPlace = Pick<Place, "id" | "latitude" | "longitude" | "prominence_score">;

/**
 * Stateless, priority-first map selection. Every zoom recomputes the markers:
 * low-priority places disappear as soon as the user zooms below their reveal
 * threshold. Previously visited places receive NO special treatment.
 *
 * canFit receives only already accepted higher-priority markers, so a busy
 * area cannot accumulate overlapping labels as the camera zooms out.
 */
export function selectVisiblePlaces<T extends LocatedPlace>(
  incoming: readonly T[],
  zoom: number,
  inViewport: (place: T) => boolean,
  canFit: (candidate: T, visible: readonly T[]) => boolean = () => true,
): T[] {
  const ranked = [...incoming].sort(
    (a, b) => prominenceScore(b) - prominenceScore(a) || a.id.localeCompare(b.id),
  );
  const visible: T[] = [];
  for (const place of ranked) {
    if (!Number.isFinite(place.longitude) || !Number.isFinite(place.latitude)) continue;
    if (zoom < revealZoom(place) || !inViewport(place)) continue;
    if (canFit(place, visible)) visible.push(place);
  }
  // Draw less important places first; important markers win the top position.
  return visible.reverse();
}
