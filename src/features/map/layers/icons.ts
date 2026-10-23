export const iconNames = [
  "places",
  "nature",
  "shopping",
  "fun",
  "biryani",
  "punugulu",
  "samosa",
  "chaat",
  "dosa",
  "vada",
  "tea",
  "sweets",
  "food",
];

const categoryIcons: Record<string, string> = {
  Places: "places",
  Nature: "nature",
  Shopping: "shopping",
  "Fun & Activities": "fun",
  Food: "food",
};

/** Use a real registered sprite for every place, including uncommon dishes. */
export function iconFor(category: string, dish: string | null) {
  const dishIcon = dish?.trim().toLowerCase();
  if (dishIcon && iconNames.includes(dishIcon)) return dishIcon;
  return categoryIcons[category] || "places";
}
