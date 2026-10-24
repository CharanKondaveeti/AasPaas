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
  "Mandi",
  "Chaat",
  "Dosa",
  "Vada",
  "Tea",
  "Sweets",
] as const;
export type DiscoveryGroup = "food" | "experiences" | "specialty_shops";
export const discoveryGroups = [
  { value: "all", label: "All discoveries" },
  { value: "food", label: "Famous Food" },
  { value: "experiences", label: "Scenic & Culture" },
  { value: "specialty_shops", label: "Specialty Shops" },
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
  /** Optional on offline seed data; live Supabase records always include these. */
  discovery_group?: DiscoveryGroup;
  is_hidden_gem?: boolean;
  hidden_gem_reason?: string | null;
  listing_verified_at?: string | null;
  verification_notes?: string | null;
  created_at?: string;
  /** True for unverified test records stored in the canonical places table. */
  /** Editorial map visibility priority, 0–100; not a review rating. */
  prominence_score?: number;
  prominence_reason?: string | null;
  is_demo?: boolean;
  demo_fixture_id?: string | null;
  demo_price_inr?: number;
  demo_diet?: "veg" | "non_veg";
  demo_style?: string;
  demo_opens_at?: string;
  demo_closes_at?: string;
  demo_overnight?: boolean;
};
export function placeDiscoveryGroup(place: Place): DiscoveryGroup {
  return place.discovery_group ??
    (place.category === "Food" ? "food" :
      place.category === "Shopping" ? "specialty_shops" : "experiences");
}
export function isVerifiedGem(place: Place): boolean {
  return place.is_hidden_gem === true && Boolean(place.listing_verified_at);
}
export type Bounds = [number, number, number, number];
export const CITY_BOUNDS: Bounds = [78.15, 17.15, 78.85, 17.65];
export const CITY_CENTER: [number, number] = [78.455, 17.397];
