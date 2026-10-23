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
export function iconFor(category: string, dish: string | null) {
  if (dish) return dish.toLowerCase();
  return (
    (
      {
        Places: "places",
        Nature: "nature",
        Shopping: "shopping",
        "Fun & Activities": "fun",
        Food: "food",
      } as Record<string, string>
    )[category] || "places"
  );
}
