export const categories = [
  "All",
  "Food",
  "Places",
  "Nature",
  "Shopping",
  "Fun & Activities",
] as const;
export type Category = Exclude<(typeof categories)[number], "All">;
export const dishes = [
  "Biryani",
  "Punugulu",
  "Samosa",
  "Chaat",
  "Dosa",
  "Vada",
  "Tea",
  "Sweets",
] as const;
export type Place = {
  id: string;
  name: string;
  category: Category;
  dish: string | null;
  famous_for: string;
  description: string;
  area: string;
  latitude: number;
  longitude: number;
  source_url: string | null;
  photo_path: string | null;
  photo_credit: string | null;
  hours: string | null;
  price: string | null;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};
export type Bounds = [number, number, number, number];
export const CITY_BOUNDS: Bounds = [78.15, 17.15, 78.85, 17.65];
export const CITY_CENTER: [number, number] = [78.455, 17.397];
