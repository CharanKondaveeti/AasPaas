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
      hiddenOnly = p.get("hidden") === "1",
      budgetText = p.get("budget") || "", budget=budgetText?Number(budgetText):null,
      hours=p.get("hours")||"any",diet=p.get("diet")||"any",style=p.get("style")||"any";
    if(budget!==null&&![50,100,200,500].includes(budget))throw new ApiError(400,"Invalid budget.");
    if(!["any","open_now","late_night","early_morning"].includes(hours))throw new ApiError(400,"Invalid hour filter.");
    if(!["any","veg","non_veg","egg"].includes(diet))throw new ApiError(400,"Invalid diet filter.");
    if(!["any","street_food","tiffins","breakfast","midnight","iconic","old_favourite","desserts","cafes"].includes(style))throw new ApiError(400,"Invalid style.");
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
          (group!=="food" || (budget===null && hours==="any" && diet==="any" && style==="any")) &&
          (group === "all" || placeDiscoveryGroup(v) === group) &&
          (!hiddenOnly || isVerifiedGem(v)) &&
          (!q ||
            normalizeSearch(
              [v.name, v.area, v.category, v.dish, v.famous_for].join(" "),
            ).includes(q)),
      );
      return Response.json({ places, mode: "curated", truncated: false });
    }
    const location={west:bounds[0],south:bounds[1],east:bounds[2],north:bounds[3],search_text:q};
    const {data,error}=group==="food"
      ? await db().rpc("explore_famous_food",{...location,filter_dish:dish,filter_budget:budget,
         filter_hours:hours,filter_diet:diet,filter_style:style,only_hidden_gems:hiddenOnly})
      : await db().rpc("explore_discoveries",{...location,filter_category:category,filter_dish:dish,
         filter_group:group,only_hidden_gems:hiddenOnly});
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
