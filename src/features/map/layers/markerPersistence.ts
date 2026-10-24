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

/**
 * Keep fetched candidates while the user pans, not "revealed" marker visibility.
 * The map still runs selectVisiblePlaces at the current zoom, so zooming out
 * cannot accumulate cards. Prune only far-off records to bound memory usage.
 */
export function mergePanCandidates<T extends LocatedPlace>(
  previous: ReadonlyMap<string, T>,
  incoming: readonly T[],
  withinBuffer: (place: T) => boolean,
  limit = 900,
): Map<string, T> {
  const merged = new Map<string, T>();
  for (const [id, place] of previous) {
    if (withinBuffer(place)) merged.set(id, place);
  }
  for (const place of incoming) {
    if (Number.isFinite(place.longitude) && Number.isFinite(place.latitude) && withinBuffer(place))
      merged.set(place.id, place);
  }
  if (merged.size <= limit) return merged;
  const top = [...merged.values()].sort(
    (a, b) => prominenceScore(b) - prominenceScore(a) || a.id.localeCompare(b.id),
  ).slice(0, limit);
  return new Map(top.map(p => [p.id, p]));
}
