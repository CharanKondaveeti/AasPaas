import type { Bounds, Place } from "@/lib/types";
export async function getPlaces(
  bounds: Bounds,
  query: string,
  category: string,
  dish: string,
  signal?: AbortSignal,
): Promise<{ places: Place[]; mode: string; truncated: boolean }> {
  const params = new URLSearchParams({
    bounds: bounds.join(","),
    q: query,
    category,
    dish,
  });
  const response = await fetch(`/api/places?${params}`, { signal });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Places could not be loaded.");
  return data;
}
export async function adminRequest(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const response = await fetch(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
