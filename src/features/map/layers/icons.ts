import type { Place } from "@/lib/types";

/** All icons are light local SVG illustrations in public/icons. */
export const iconNames = [
  "places",
  "nature",
  "shopping",
  "fun",
  "biryani",
  "punugulu",
  "samosa",
  "mandi",
  "chaat",
  "dosa",
  "vada",
  "tea",
  "sweets",
  "food",
] as const;

export type PlaceIcon = (typeof iconNames)[number];
const knownIcons: ReadonlySet<string> = new Set(iconNames);

const categoryIcons: Record<Place["category"], PlaceIcon> = {
  Places: "places",
  Nature: "nature",
  Shopping: "shopping",
  "Fun & Activities": "fun",
  Food: "food",
};

/** A matching dish takes priority; unknown dishes get their category icon. */
export function iconFor(category: Place["category"], dish: string | null): PlaceIcon {
  const candidate = dish?.trim().toLowerCase();
  return candidate && knownIcons.has(candidate)
    ? candidate as PlaceIcon
    : categoryIcons[category];
}

/** Use one asset path across map symbols, list cards, filters and details. */
export function iconPath(name: PlaceIcon): string {
  return `${import.meta.env?.BASE_URL ?? "/"}icons/${name}.svg`;
}
