/**
 * A map place stays visible once it has appeared at neighbourhood zoom.
 * It only disappears when the user zooms far enough out for the city overview.
 * Retain records across viewport RPC refreshes (which can return different subsets).
 */
export const PLACE_REVEAL_ZOOM = 12.8;
export const PLACE_HIDE_ZOOM = 10.8;

type LocatedPlace = { id: string; longitude: number; latitude: number };

export function keepRevealedPlaces<T extends LocatedPlace>(
  seen: Map<string, T>,
  incoming: readonly T[],
  zoom: number,
  inViewport: (place: T) => boolean,
): T[] {
  if (zoom < PLACE_HIDE_ZOOM) {
    seen.clear();
    return [];
  }

  if (zoom >= PLACE_REVEAL_ZOOM) {
    for (const place of incoming) {
      if (
        Number.isFinite(place.longitude) &&
        Number.isFinite(place.latitude) &&
        inViewport(place)
      ) {
        seen.set(place.id, place);
      }
    }
  }

  return [...seen.values()];
}
