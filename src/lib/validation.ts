import { z } from "zod";
import { categories, dishes } from "./types";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((v) => !/[<>\x00-\x08]/.test(v), "Please use plain text.");
export const suggestionSchema = z
  .object({
    name: text(2, 100),
    famous_for: text(5, 400),
    latitude: z.number().finite().min(17.15).max(17.65),
    longitude: z.number().finite().min(78.15).max(78.85),
    website: z.string().max(0).optional(),
  })
  .strict();
export const editSchema = suggestionSchema
  .omit({ website: true })
  .extend({
    category: z.enum(
      categories.slice(1) as [
        "Food",
        "Places",
        "Nature",
        "Shopping",
        "Fun & Activities",
      ],
    ),
    dish: z.enum(dishes).nullable(),
    description: text(0, 1000),
    area: text(0, 150),
    hours: text(0, 150).nullable(),
    price: text(0, 100).nullable(),
    source_url: z
      .string()
      .url()
      .max(500)
      .refine((v) => v.startsWith("https://"))
      .nullable(),
    photo_credit: text(0, 200).nullable(),
    discovery_group: z.enum(["food", "experiences", "specialty_shops"]).optional(),
    is_hidden_gem: z.boolean().optional(),
    hidden_gem_reason: text(0, 300).nullable().optional(),
    verification_notes: text(0, 700).nullable().optional(),
    // A decision, not a caller-supplied timestamp. Server sets verified_at.
    listing_verified: z.boolean().optional(),
    status: z.enum(["pending", "approved", "rejected"]),
  })
  .strict();
export function parseBounds(
  value: string | null,
): [number, number, number, number] {
  if (!value) return [78.15, 17.15, 78.85, 17.65];
  const b = value.split(",").map(Number);
  if (
    b.length !== 4 ||
    b.some((n) => !Number.isFinite(n)) ||
    b[0] >= b[2] ||
    b[1] >= b[3] ||
    b[0] < -180 ||
    b[2] > 180 ||
    b[1] < -90 ||
    b[3] > 90
  )
    throw new Error("Invalid map bounds.");
  return b as [number, number, number, number];
}
export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/biriyani|biriani/g, "biryani")
    .replace(/golconda/g, "golkonda")
    .replace(/chai/g, "tea")
    .replace(/char minar/g, "charminar");
}
