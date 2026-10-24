import type { Place } from "@/lib/types";

/** New illustrated WebP icons only. All old SVG assets were removed. */
export const iconNames = [
  "biryani", "chaat", "chai", "dosa", "idli", "jalebi",
  "kebab", "pani-puri", "punugulu", "samosa",
] as const;

export type FoodIllustration = (typeof iconNames)[number];

const aliases: Record<string, FoodIllustration> = {
  biryani: "biryani",
  chaat: "chaat",
  chai: "chai",
  tea: "chai",
  dosa: "dosa",
  idli: "idli",
  jalebi: "jalebi",
  jilebi: "jalebi",
  jilabi: "jalebi",
  kebab: "kebab",
  kabab: "kebab",
  kababs: "kebab",
  "pani puri": "pani-puri",
  "pani-puri": "pani-puri",
  golgappa: "pani-puri",
  "gol gappa": "pani-puri",
  punugulu: "punugulu",
  punukulu: "punugulu",
  samosa: "samosa",
};

/** Only use illustrations when the food actually matches the dish.
 * Never portray Mandi, generic Sweets, or an unknown business as Biryani.
 */
export function iconFor(
  category: Place["category"],
  dish: string | null,
  name = "",
  famousFor = "",
): FoodIllustration | null {
  if (category !== "Food") return null;
  const source = [dish, name, famousFor].filter(Boolean).join(" ").toLowerCase();
  // Prefer a specific menu-item match before a broad dish description.
  for (const [word, icon] of Object.entries(aliases)) {
    if (new RegExp(`(?:^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z])`, "i").test(source)) {
      return icon;
    }
  }
  return null;
}

/** Vite's base path works on GitHub Pages and on the original domain. */
export function iconPath(name: FoodIllustration): string {
  return `${import.meta.env?.BASE_URL ?? "/"}food-illustrations/${name}.webp`;
}
