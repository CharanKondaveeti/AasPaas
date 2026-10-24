import { seedPlaces } from "../../features/explore/data/places";
import { isVerifiedGem, placeDiscoveryGroup } from "../../lib/types";
import { normalizeSearch, parseBounds } from "../../lib/validation";
import { backendReady, db, failure, ApiError } from "../../lib/server";
export async function GET(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    let bounds;
    try {
      bounds = parseBounds(p.get("bounds"));
    } catch {
      throw new ApiError(400, "Invalid map bounds.");
    }
    const q = normalizeSearch((p.get("q") || "").slice(0, 100)),
      category = p.get("category") || "All",
      dish = p.get("dish") || "",
      group = p.get("group") || "all",
      hiddenOnly = p.get("hidden") === "1";
    if (!["all", "food", "experiences", "specialty_shops"].includes(group))
      throw new ApiError(400, "Invalid discovery group.");
    if (!backendReady()) {
      const places = seedPlaces.filter(
        (v) =>
          (q ||
            (v.longitude >= bounds[0] &&
              v.longitude <= bounds[2] &&
              v.latitude >= bounds[1] &&
              v.latitude <= bounds[3])) &&
          (category === "All" || v.category === category) &&
          (!dish || v.dish === dish) &&
          (group === "all" || placeDiscoveryGroup(v) === group) &&
          (!hiddenOnly || isVerifiedGem(v)) &&
          (!q ||
            normalizeSearch(
              [v.name, v.area, v.category, v.dish, v.famous_for].join(" "),
            ).includes(q)),
      );
      return Response.json({ places, mode: "curated", truncated: false });
    }
    const { data, error } = await db().rpc("explore_discoveries", {
      west: bounds[0],
      south: bounds[1],
      east: bounds[2],
      north: bounds[3],
      search_text: q,
      filter_category: category,
      filter_dish: dish,
      filter_group: group,
      only_hidden_gems: hiddenOnly,
    });
    if (error) throw error;
    return Response.json({
      places: data.slice(0, 300),
      mode: "live",
      truncated: data.length > 300,
    });
  } catch (error) {
    return failure(error);
  }
}
