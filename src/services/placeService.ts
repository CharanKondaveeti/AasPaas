import { isVerifiedGem, placeDiscoveryGroup, type Bounds, type Place } from "@/lib/types";
import { seedPlaces } from "@/features/explore/data/places";
import { browserDb } from "@/lib/supabase";
import { normalizeSearch } from "@/lib/validation";
import type { FoodFiltersState, CuratedFoodDetails } from "@/features/food/foodService";
import { cleanFoodDetails } from "@/features/food/foodService";


type Result = { places: Place[]; mode: string; truncated: boolean };

function curatedPlaces(bounds: Bounds, query: string, category: string, dish: string, group: string, hiddenOnly: boolean, food?:FoodFiltersState): Result {
  const normalized = normalizeSearch(query);
  return {
    places: seedPlaces.filter((p) =>
      (Boolean(normalized) || (p.longitude >= bounds[0] && p.longitude <= bounds[2] && p.latitude >= bounds[1] && p.latitude <= bounds[3])) &&
      (category === "All" || p.category === category) &&
      (!dish || p.dish === dish) &&
      (!food || (food.budget===null && food.hours==="any" && food.style==="any" && food.diet==="any")) &&
      (group === "all" || placeDiscoveryGroup(p) === group) &&
      (!hiddenOnly || isVerifiedGem(p)) &&
      (!normalized || normalizeSearch([p.name, p.area, p.category, p.dish || "", p.famous_for].join(" ")).includes(normalized))
    ),
    mode: "curated",
    truncated: false,
  };
}

export async function getPlaces(
  bounds: Bounds,
  query: string,
  category: string,
  dish: string,
  group: string,
  hiddenOnly: boolean,
  signal?: AbortSignal,
  food?:FoodFiltersState,
  sampleMode=false,
): Promise<Result> {
  if(sampleMode && group==="food"){
    if(signal?.aborted)throw new DOMException("Aborted","AbortError");
    const {data,error}=await browserDb().rpc("explore_demo_food",{
      west:bounds[0],south:bounds[1],east:bounds[2],north:bounds[3],
      search_text:normalizeSearch(query).slice(0,100),
      filter_dish:dish,filter_budget:food?.budget??null,
      filter_hours:food?.hours??"any",filter_diet:food?.diet??"any",
      filter_style:food?.style??"any",only_hidden_gems:hiddenOnly
    });
    if(signal?.aborted)throw new DOMException("Aborted","AbortError");
    if(error)throw new Error("Preview places could not load from Supabase.");
    const places=(data||[]) as Place[];
    return {places,mode:"sample",truncated:places.length>=180};
  }
  // Public, read-only RPC: database RLS restricts results to approved places.
  // This works even when a Vercel serverless function is temporarily unavailable.
  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const location={west:bounds[0],south:bounds[1],east:bounds[2],north:bounds[3],search_text:normalizeSearch(query).slice(0,100)};
    const {data,error}=group==="food"
      ? await browserDb().rpc("explore_famous_food",{...location,filter_dish:dish,filter_budget:food?.budget??null,
        filter_hours:food?.hours??"any",filter_diet:food?.diet??"any",filter_style:food?.style??"any",only_hidden_gems:hiddenOnly})
      : await browserDb().rpc("explore_discoveries",{...location,filter_category:category,filter_dish:dish,filter_group:group,only_hidden_gems:hiddenOnly});
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (error) throw error;
    const rows = (data || []) as Place[];
    return { places: rows.slice(0, 300), mode: "live", truncated: rows.length > 300 };
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
  }

  // Secondary path for environments with a working server API but no browser key.
  try {
    const params = new URLSearchParams({ bounds:bounds.join(","),q:query,category,dish,group,hidden:hiddenOnly?"1":"0",budget:food?.budget?.toString()??"",hours:food?.hours??"any",diet:food?.diet??"any",style:food?.style??"any" });
    const response = await fetch(`/api/places?${params}`, { signal });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Places API is unavailable");
    }
    const payload: Result = await response.json();
    if (!Array.isArray(payload.places)) throw new Error("Invalid places response");
    return payload;
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    // Source-checked demo places remain visible; never fabricate submissions.
    return curatedPlaces(bounds, query, category, dish, group, hiddenOnly, food);
  }
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
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The admin API is unavailable. Check the Vercel function configuration.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export async function getFoodDetails(placeId:string):Promise<CuratedFoodDetails> {
 try { const {data,error}=await browserDb().rpc("famous_food_details",{place_uuid:placeId});
   if(error)throw error; return cleanFoodDetails(data);
 } catch {return {dishes:[],hours:[],tags:[]};}
}
