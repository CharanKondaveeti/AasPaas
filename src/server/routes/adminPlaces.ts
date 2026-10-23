import {
  requireAdmin,
  failure,
  checkOrigin,
  readForm,
  ApiError,
} from "@/lib/server";
import { editSchema } from "@/lib/validation";
import { uploadPhoto } from "@/lib/photos";
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
      .order("created_at", { ascending: false })
      .range(offset, offset + 49);
    if (error) throw error;
    return Response.json({ places: data });
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
      .select("photo_path")
      .eq("id", id)
      .single();
    if (readError || !old) throw new ApiError(404, "Place not found.");
    if (parsed.data.status === "approved" && !parsed.data.source_url)
      throw new ApiError(400, "Add a verification source before publishing.");
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
        ...parsed.data,
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
      const { db } = await import("@/lib/server");
      await db().storage.from("place-photos").remove([photo]);
    }
    return failure(error);
  }
}
