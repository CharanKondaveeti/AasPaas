import type { Bounds } from "../../../lib/types";

/** Fetch a little outside the visible screen to prevent marker pop-in on drag. */
export function paddedBounds(view: Bounds, margin = 0.65): Bounds {
  const dx = (view[2] - view[0]) * margin;
  const dy = (view[3] - view[1]) * margin;
  return [view[0] - dx, view[1] - dy, view[2] + dx, view[3] + dy];
}

/** Refetch only when the camera approaches the edge of the loaded region. */
export function needsViewportFetch(view: Bounds, loaded: Bounds): boolean {
  const dx = (loaded[2] - loaded[0]) * 0.14;
  const dy = (loaded[3] - loaded[1]) * 0.14;
  return view[0] < loaded[0] + dx || view[1] < loaded[1] + dy
    || view[2] > loaded[2] - dx || view[3] > loaded[3] - dy;
}
