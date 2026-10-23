/**
 * Illustrated greenery pack from the user's approved WebP asset library.
 * These image assets are rendered as WebGL symbols, never React DOM markers.
 * 384 px files are registered at pixelRatio 4 => nominal 96 CSS px.
 */
export const GREENERY_ASSETS = [
  { id: "tree-round-small", kind: "tree", weight: 6 },
  { id: "tree-round-wide", kind: "tree", weight: 7 },
  { id: "tree-round-bright", kind: "tree", weight: 5 },
  { id: "tree-flowering-simple", kind: "flower", weight: 1 },
  { id: "tree-tall-simple", kind: "tree", weight: 3 },
  { id: "bush-rounded-small", kind: "bush", weight: 5 },
  { id: "bush-rounded-wide", kind: "bush", weight: 4 },
  { id: "hedge-short", kind: "hedge", weight: 2 },
  { id: "bush-leafy", kind: "bush", weight: 4 },
  { id: "tree-wide-detailed", kind: "tree", weight: 5 },
  { id: "forest-island", kind: "forest", weight: 1 },
  { id: "hedge-detailed", kind: "hedge", weight: 1 },
  { id: "bush-dense-detailed", kind: "bush", weight: 3 },
  { id: "bush-decorative-detailed", kind: "bush", weight: 3 },
  { id: "tree-flowering-detailed", kind: "flower", weight: 1 },
  { id: "tree-bright-detailed", kind: "tree", weight: 5 },
  { id: "tree-dark-detailed", kind: "tree", weight: 5 },
  { id: "tree-tall-detailed", kind: "tree", weight: 2 },
  { id: "tree-canopy-detailed", kind: "tree", weight: 6 },
] as const;

export type GreeneryId = (typeof GREENERY_ASSETS)[number]["id"];
export type GreeneryTier = "base" | "park" | "detail";
const weighted = GREENERY_ASSETS.flatMap(asset => Array.from({ length: asset.weight }, () => asset.id));
export const greeneryIds = GREENERY_ASSETS.map(asset => asset.id);
export const greeneryImagePath = (id: GreeneryId) => `/map-art/greens/${id}.webp`;

export function hashGreenery(value: string): number {
  let n = 2166136261;
  for (let i = 0; i < value.length; i++) n = Math.imul(n ^ value.charCodeAt(i), 16777619) >>> 0;
  return n;
}

/** Deterministic selection: same tree types and positions on each visit. */
export function greeneryForPoint(id: string): { sprite: GreeneryId; tier: GreeneryTier; kind: string } {
  const hash = hashGreenery(id);
  const sprite = weighted[hash % weighted.length];
  const asset = GREENERY_ASSETS.find(item => item.id === sprite)!;
  // Only 1/5 of placed trees is prominent in the city-wide view.
  const tier: GreeneryTier = hash % 5 === 0 ? "base" : hash % 3 === 0 ? "detail" : "park";
  return { sprite, tier, kind: asset.kind };
}
