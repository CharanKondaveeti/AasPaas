import type { Place } from "@/lib/types";

/** Only place types with matching WebP illustrations receive map artwork. */
export const iconNames = ["biryani", "punugulu", "samosa", "chaat", "dosa", "chai", "jalebi", "idli", "kebab", "pani-puri"] as const;
export const extraFoodIcons = ["mandi","vada","sweets","haleem","mirchi-bajji","osmania-biscuits","juice","tiffins","rolls","ice-cream"] as const;
export type PlaceIcon=(typeof iconNames)[number] | (typeof extraFoodIcons)[number];
const available=new Set<string>([...iconNames,...extraFoodIcons]);
const svgArt=new Set<string>(extraFoodIcons);

export function iconFor(
  category: Place["category"],
  dish: string | null,
  name = "",
  famousFor = "",
): PlaceIcon | null {
  if (category !== "Food") return null;
  const normalized = [dish ?? "", name, famousFor].join(" ").toLowerCase();
  const tests: Array<[RegExp, PlaceIcon]> = [
    [/punugul/, "punugulu"], [/mandi/, "mandi"], [/haleem/, "haleem"],
    [/mirchi.?bajji/, "mirchi-bajji"], [/osmania|biscuit/, "osmania-biscuits"],
    [/ice.?cream|kulfi/, "ice-cream"], [/vada|wada/, "vada"],
    [/fresh juice|juice|shake/, "juice"], [/roll|wrap/, "rolls"], [/tiffin/, "tiffins"], [/samosa/, "samosa"], [/jalebi|jilebi/, "jalebi"],
    [/pani.?puri|golgappa|puchka/, "pani-puri"], [/kebab|kab[a-z]*b/, "kebab"],
    [/idli/, "idli"], [/biryani/, "biryani"], [/chaat|chat /, "chaat"],
    [/dosa/, "dosa"], [/chai|tea/, "chai"], [/sweets|sweet shop|mithai|laddu/, "sweets"],
  ];
  for (const [pattern, asset] of tests) if (pattern.test(normalized) && available.has(asset)) return asset;
  return null;
}

export function iconPath(name: PlaceIcon): string {
  return svgArt.has(name)
    ? `${import.meta.env?.BASE_URL ?? "/"}food-art/${name}.svg`
    : `${import.meta.env?.BASE_URL ?? "/"}icons/illustrated-hd/${name}.webp`;
}
