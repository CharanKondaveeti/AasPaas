import {
  requireAdmin,
  failure,
  checkOrigin,
  readForm,
  ApiError,
} from "../../lib/server";
import { editSchema } from "../../lib/validation";
import { uploadPhoto } from "../../lib/photos";
export async function GET(request: Request) {
  try {
    const client = await requireAdmin(request);
    const p = new URL(request.url).searchParams;
    const status = p.get("status") || "pending";
    const offset = Math.max(0, Math.min(100000, Number(p.get("offset")) || 0));
    if (!["pending", "approved", "rejected"].includes(status))
      throw new ApiError(400, "Invalid status.");
    const { data, error } = await client
      .from("places")
      .select("*")
      .eq("status", status)
      .eq("is_demo", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + 49);
    if (error) throw error;
    // Only admins can see the full curation pipeline.
    const { data: candidates, error: progressError } = await client
      .from("places")
      .select("discovery_group, listing_verified_at")
      .eq("status", "approved")
      .limit(1000);
    if (progressError) throw progressError;
    const progress: Record<string, { approved: number; verified: number }> = {
      food: { approved: 0, verified: 0 },
      experiences: { approved: 0, verified: 0 },
      specialty_shops: { approved: 0, verified: 0 },
    };
    for (const candidate of candidates || []) {
      const group = candidate.discovery_group as keyof typeof progress;
      if (!progress[group]) continue;
      progress[group].approved++;
      if (candidate.listing_verified_at) progress[group].verified++;
    }
    return Response.json({ places: data, progress });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  let photo: string | null = null;
  try {
    checkOrigin(request);
    const client = await requireAdmin(request);
    const form = await readForm(request);
    const id = String(form.get("id"));
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, "Invalid place.");
    let raw;
    try {
      raw = JSON.parse(String(form.get("values")));
    } catch {
      throw new ApiError(400, "Invalid details.");
    }
    const parsed = editSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    const { data: old, error: readError } = await client
      .from("places")
      .select("photo_path, listing_verified_at, verification_notes, is_demo")
      .eq("id", id)
      .single();
    if (readError || !old) throw new ApiError(404, "Place not found.");
    if (old.is_demo) throw new ApiError(403,"Generated test places cannot be approved as real businesses.");
    if (parsed.data.status === "approved" && !parsed.data.source_url)
      throw new ApiError(400, "Add a verification source before publishing.");
    if ((parsed.data.prominence_score ?? 0) >= 80 &&
        !(parsed.data.prominence_reason || "").trim()) {
      throw new ApiError(400, "Add a reason before ranking a place as city-famous.");
    }
    const { listing_verified, ...safeFields } = parsed.data;
    const verifiedAt = listing_verified === true ? new Date().toISOString()
      : listing_verified === false ? null : old.listing_verified_at;
    const notes = parsed.data.verification_notes ?? old.verification_notes;
    if (verifiedAt && (!parsed.data.source_url || (notes || "").trim().length < 15))
      throw new ApiError(400, "Verified listings require a source and specific verification notes.");
    if (parsed.data.is_hidden_gem === true &&
      (!verifiedAt || (parsed.data.hidden_gem_reason || "").trim().length < 12))
      throw new ApiError(400, "Hidden Gems need verification and a clear local reason.");
    photo = await uploadPhoto(form.get("photo"));
    if (
      parsed.data.status === "approved" &&
      (photo || old.photo_path) &&
      !parsed.data.photo_credit
    )
      throw new ApiError(
        400,
        "Add the photo owner and license before publishing.",
      );
    const { error } = await client
      .from("places")
      .update({
        ...safeFields,
        ...(listing_verified !== undefined ? { listing_verified_at: verifiedAt } : {}),
        ...(photo ? { photo_path: photo } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    if (photo && old.photo_path)
      await client.storage.from("place-photos").remove([old.photo_path]);
    return Response.json({ ok: true });
  } catch (error) {
    if (photo) {
      const { db } = await import("../../lib/server");
      await db().storage.from("place-photos").remove([photo]);
    }
    return failure(error);
  }
}
