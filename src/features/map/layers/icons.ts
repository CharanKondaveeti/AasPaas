import type { Place } from "@/lib/types";

/** Only place types with matching WebP illustrations receive map artwork. */
export const iconNames = ["biryani", "punugulu", "samosa", "chaat", "dosa", "chai", "jalebi", "idli", "kebab", "pani-puri"] as const;
export type PlaceIcon = (typeof iconNames)[number];
const available = new Set<string>(iconNames);

export function iconFor(
  category: Place["category"],
  dish: string | null,
  name = "",
  famousFor = "",
): PlaceIcon | null {
  if (category !== "Food") return null;
  const normalized = [dish ?? "", name, famousFor].join(" ").toLowerCase();
  const tests: Array<[RegExp, PlaceIcon]> = [
    [/punugul/, "punugulu"], [/samosa/, "samosa"], [/jalebi|jilebi/, "jalebi"],
    [/pani.?puri|golgappa|puchka/, "pani-puri"], [/kebab|kab[a-z]*b/, "kebab"],
    [/idli/, "idli"], [/biryani/, "biryani"], [/chaat|chat /, "chaat"],
    [/dosa/, "dosa"], [/chai|tea/, "chai"],
  ];
  for (const [pattern, asset] of tests) if (pattern.test(normalized) && available.has(asset)) return asset;
  return null;
}

export function iconPath(name: PlaceIcon): string {
  return `${import.meta.env?.BASE_URL ?? "/"}icons/illustrated-hd/${name}.webp`;
}
