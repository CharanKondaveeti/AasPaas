import {
  backendReady,
  db,
  requireAdmin,
  failure,
  ApiError,
} from "../../lib/server";
export async function GET(request: Request) {
  try {
    if (!backendReady()) throw new ApiError(404, "Photo not found.");
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id))
      throw new ApiError(400, "Invalid photo.");
    const client = db();
    const { data, error } = await client
      .from("places")
      .select("photo_path,status")
      .eq("id", id)
      .single();
    if (error || !data?.photo_path) throw new ApiError(404, "Photo not found.");
    if (data.status !== "approved") await requireAdmin(request);
    const { data: file, error: photoError } = await client.storage
      .from("place-photos")
      .download(data.photo_path);
    if (photoError || !file) throw new ApiError(404, "Photo not found.");
    return new Response(file, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
