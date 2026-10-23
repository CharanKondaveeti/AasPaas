/**
 * Hyderabad is a city-first map: users initially see the city name over a
 * softly blurred base map. Local places appear only after zooming closer.
 */
export const INITIAL_CITY_ZOOM = 11.0;
export const PLACES_REVEAL_ZOOM = 12.6;
export const INTRO_FADE_START_ZOOM = 11.7;
export const PLACES_FULLY_VISIBLE_ZOOM = 13.2;

export function cityIntroOpacity(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= INTRO_FADE_START_ZOOM) return 1;
  if (zoom >= PLACES_REVEAL_ZOOM) return 0;
  return (PLACES_REVEAL_ZOOM - zoom) / (PLACES_REVEAL_ZOOM - INTRO_FADE_START_ZOOM);
}
