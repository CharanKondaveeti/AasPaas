import {z} from "zod";
import {requireAdmin,checkOrigin,readForm,failure,ApiError} from "../../lib/server";

const source=z.string().url().max(500).refine(s=>s.startsWith("https://"),"Use an HTTPS source.");
const dish=z.object({
 dish_key:z.string().regex(/^[a-z0-9_-]{2,50}$/),
 dish_name:z.string().trim().min(2).max(80),
 is_signature:z.boolean(),
 diet:z.enum(["veg","non_veg","egg","unknown"]),
 price_inr:z.number().finite().positive().max(999999).nullable(),
 source_url:source
}).strict();
const hour=z.object({
 weekday:z.number().int().min(0).max(6),
 opens_at:z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
 closes_at:z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
 overnight:z.boolean(),
 source_url:source
}).strict().refine(h=>h.overnight?h.closes_at<=h.opens_at:h.closes_at>h.opens_at,"Check overnight hours.");
const tag=z.object({
 tag:z.enum(["street_food","tiffins","breakfast","midnight","iconic","old_favourite","desserts","cafes"]),source_url:source
}).strict();
const payload=z.object({
 place_id:z.string().uuid(),
 dishes:z.array(dish).max(30),hours:z.array(hour).max(30),tags:z.array(tag).max(8)
}).strict().refine(p=>new Set(p.dishes.map(d=>d.dish_key)).size===p.dishes.length,"Duplicate dish.")
.refine(p=>new Set(p.hours.map(h=>h.weekday+"-"+h.opens_at)).size===p.hours.length,"Duplicate opening time.")
.refine(p=>new Set(p.tags.map(t=>t.tag)).size===p.tags.length,"Duplicate tag.");

export async function GET(request:Request){
 try{
  const client=await requireAdmin(request);
  const id=new URL(request.url).searchParams.get("place_id")||"";
  if(!z.string().uuid().safeParse(id).success)throw new ApiError(400,"Invalid place.");
  const [d,h,t]=await Promise.all([
    client.from("food_dishes").select("dish_key,dish_name,is_signature,diet,price_inr,source_url").eq("place_id",id).order("dish_name"),
    client.from("food_hours").select("weekday,opens_at,closes_at,overnight,source_url").eq("place_id",id).order("weekday"),
    client.from("food_tags").select("tag,source_url").eq("place_id",id).order("tag")]);
  if(d.error||h.error||t.error)throw d.error||h.error||t.error;
  return Response.json({dishes:d.data??[],hours:h.data??[],tags:t.data??[]});
 }catch(e){return failure(e);}
}
export async function PATCH(request:Request){
 try{
  checkOrigin(request);
  const client=await requireAdmin(request);
  const form=await readForm(request);
  let raw:unknown;
  try{raw=JSON.parse(String(form.get("profile")||""));}
  catch{throw new ApiError(400,"Invalid food profile.");}
  const parsed=payload.safeParse(raw);
  if(!parsed.success)throw new ApiError(400,parsed.error.issues[0]?.message||"Invalid food profile.");
  const {error}=await client.rpc("save_food_profile",{
    place_uuid:parsed.data.place_id,
    dish_rows:parsed.data.dishes,
    hour_rows:parsed.data.hours,
    tag_rows:parsed.data.tags
  });
  if(error)throw new ApiError(400,"Could not save: check unique dishes, hours and evidence URLs.");
  return Response.json({ok:true});
 }catch(e){return failure(e);}
}
