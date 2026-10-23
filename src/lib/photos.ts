import "server-only";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db, ApiError } from "./server";
export async function sanitizePhoto(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (
    value.size > 3 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(value.type)
  )
    throw new ApiError(400, "Use a JPG, PNG or WebP photo under 3 MB.");
  let buffer: Buffer;
  try {
    const input = sharp(Buffer.from(await value.arrayBuffer()), {
      limitInputPixels: 20000000,
      animated: false,
    });
    const metadata = await input.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
      throw new Error("Unsupported actual format");
    buffer = await input
      .rotate()
      .resize(1400, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ApiError(400, "This photo could not be read.");
  }
  return buffer;
}
export async function uploadPhoto(value: FormDataEntryValue | null) {
  const buffer = await sanitizePhoto(value);
  if (!buffer) return null;
  const path = `${randomUUID()}.webp`;
  const { error } = await db()
    .storage.from("place-photos")
    .upload(path, buffer, { contentType: "image/webp", upsert: false });
  if (error) throw new ApiError(503, "Photo upload failed. Please try again.");
  return path;
}
