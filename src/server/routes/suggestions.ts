import { suggestionSchema } from "@/lib/validation";
import {
  backendReady,
  db,
  checkOrigin,
  limitSubmission,
  readForm,
  failure,
  ApiError,
} from "@/lib/server";
import { uploadPhoto } from "@/lib/photos";
export async function POST(request: Request) {
  let photo: string | null = null;
  try {
    checkOrigin(request);
    if (!backendReady())
      throw new ApiError(
        503,
        "Suggestions will open once our community backend is connected.",
      );
    await limitSubmission(request);
    const form = await readForm(request);
    const parsed = suggestionSchema.safeParse({
      name: form.get("name"),
      famous_for: form.get("famous_for"),
      latitude: Number(form.get("latitude")),
      longitude: Number(form.get("longitude")),
      website: form.get("website") || "",
    });
    if (!parsed.success)
      throw new ApiError(400, parsed.error.issues[0].message);
    if (
      form.get("photo") instanceof File &&
      (form.get("photo") as File).size > 0 &&
      form.get("photo_consent") !== "yes"
    )
      throw new ApiError(
        400,
        "Please confirm you own the photo or have permission to share it.",
      );
    photo = await uploadPhoto(form.get("photo"));
    const { website, ...values } = parsed.data;
    void website;
    const { error } = await db().rpc("submit_place", {
      place_name: values.name,
      place_famous_for: values.famous_for,
      lat: values.latitude,
      lng: values.longitude,
      photo,
    });
    if (error) {
      if (error.message.includes("duplicate"))
        throw new ApiError(
          409,
          "This place is already listed or waiting for review.",
        );
      throw error;
    }
    return Response.json(
      { message: "Thank you! Your place is waiting for review." },
      { status: 201 },
    );
  } catch (error) {
    if (photo) await db().storage.from("place-photos").remove([photo]);
    return failure(error);
  }
}
