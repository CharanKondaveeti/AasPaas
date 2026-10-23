import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
export const backendReady = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SECRET_KEY,
  );
export function db() {
  if (!backendReady()) throw new Error("Backend is not configured.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new ApiError(401, "Please sign in.");
  const client = db();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user)
    throw new ApiError(401, "Your session expired. Please sign in again.");
  const { data: admin, error: roleError } = await client
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError || !admin) throw new ApiError(403, "Admin access is required.");
  return client;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new ApiError(403, "This request is not allowed.");
}
export async function limitSubmission(request: Request) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new ApiError(503, "Suggestions are temporarily unavailable.");
  // Only trust a header overwritten by the deployment proxy. Without one, use a shared conservative bucket.
  const header = process.env.TRUSTED_IP_HEADER;
  const ip = header
    ? request.headers.get(header)?.split(",")[0]?.trim() || "shared"
    : "shared";
  const key = createHmac("sha256", secret).update(ip).digest("hex");
  const { data, error } = await db().rpc("consume_submission_limit", {
    bucket_key: key,
  });
  if (error)
    throw new ApiError(503, "Suggestions are temporarily unavailable.");
  if (!data)
    throw new ApiError(
      429,
      "Too many suggestions. Please try again in an hour.",
    );
}
export async function readForm(request: Request) {
  const max = 4 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(413, "Please use a photo smaller than 3 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Missing form data.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new ApiError(413, "Please use a photo smaller than 3 MB.");
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new ApiError(400, "Invalid form data.");
  }
}
