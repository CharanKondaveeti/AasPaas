import {useEffect,useState} from "react";
import type {Place} from "@/lib/types";
import {adminRequest} from "@/services/placeService";
import {foodCategories,foodStyleFilters} from "../data/foodCatalog";
import {Plus,Trash2,Save} from "lucide-react";

type Dish={dish_key:string;dish_name:string;diet:"veg"|"non_veg"|"egg"|"unknown";price_inr:number|null;is_signature:boolean;source_url:string};
type Hours={weekday:number;opens_at:string;closes_at:string;overnight:boolean;source_url:string};
type FoodTag={tag:string;source_url:string};
const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export default function FoodCurator({place,token}:{place:Place;token:string}) {
 const [dishes,setDishes]=useState<Dish[]>([]),[hours,setHours]=useState<Hours[]>([]),
 [tags,setTags]=useState<FoodTag[]>([]),[tagSource,setTagSource]=useState(""),
 [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  setNotice("");setBusy(true);
  adminRequest(`/api/admin/food?place_id=${encodeURIComponent(place.id)}`,token)
   .then((r)=>{
     if(!active)return;
     setDishes(r.dishes||[]);setHours((r.hours||[]).map((h:Hours)=>({...h,opens_at:h.opens_at.slice(0,5),closes_at:h.closes_at.slice(0,5)})));
     setTags(r.tags||[]);setTagSource(r.tags?.[0]?.source_url||"");
   }).catch((e)=>{if(active)setNotice(e.message);})
   .finally(()=>{if(active)setBusy(false);});
  return()=>{active=false;};
 },[place.id,token]);
 const addDish=()=>setDishes(v=>[...v,{dish_key:"",dish_name:"",diet:"unknown",price_inr:null,is_signature:true,source_url:""}]);
 const addHours=()=>setHours(v=>[...v,{weekday:0,opens_at:"09:00",closes_at:"21:00",overnight:false,source_url:""}]);
 function updateDish(index:number,patch:Partial<Dish>){setDishes(v=>v.map((d,i)=>i===index?{...d,...patch}:d));}
 function updateHours(index:number,patch:Partial<Hours>){setHours(v=>v.map((h,i)=>i===index?{...h,...patch}:h));}
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setNotice("");
  try{
   const safeDishes=dishes.map(d=>({...d,dish_key:d.dish_key.trim().toLowerCase(),dish_name:d.dish_name.trim(),source_url:d.source_url.trim()}));
   const safeHours=hours.map(h=>({...h,source_url:h.source_url.trim()}));
   const safeTags=tags.map(t=>({tag:t.tag,source_url:(tagSource||t.source_url).trim()}));
   const data=new FormData();
   data.set("profile",JSON.stringify({place_id:place.id,dishes:safeDishes,hours:safeHours,tags:safeTags}));
   await adminRequest("/api/admin/food",token,{method:"PATCH",body:data});
   setNotice("Food profile saved. Dish prices and hours are now backed by your submitted sources.");
  }catch(error){setNotice((error as Error).message);}
  finally{setBusy(false);}
 }
 return <form className="food-curator" onSubmit={save}>
  <h3>Famous Food · curator details</h3>
  <p>Only save independently checked facts. Each dish and opening interval requires its own HTTPS evidence source.</p>
  <div className="food-curator-heading"><strong>Signature dishes and prices</strong><button type="button" onClick={addDish}><Plus size={15}/> Add dish</button></div>
  {dishes.map((d,i)=><div className="food-curator-card" key={i}>
   <div className="food-curator-grid">
    <label>Dish
     <select value={d.dish_key} required onChange={e=>{const o=foodCategories.find(o=>o.key.toLowerCase().replaceAll(" ","-")===e.target.value);updateDish(i,{dish_key:e.target.value,dish_name:o?.label||d.dish_name});}}>
      <option value="">Choose dish</option>
      {foodCategories.map(o=><option value={o.key.toLowerCase().replaceAll(" ","-")} key={o.key}>{o.label}</option>)}
     </select>
    </label>
    <label>Public dish name<input required minLength={2} maxLength={80} value={d.dish_name} onChange={e=>updateDish(i,{dish_name:e.target.value})}/></label>
    <label>Verified price ₹<input type="number" step=".01" min="1" placeholder="Unknown" value={d.price_inr??""} onChange={e=>updateDish(i,{price_inr:e.target.value?Number(e.target.value):null})}/></label>
    <label>Diet
      <select value={d.diet} onChange={e=>updateDish(i,{diet:e.target.value as Dish["diet"]})}>
       <option value="unknown">Unverified</option><option value="veg">Veg</option>
       <option value="non_veg">Non-veg</option><option value="egg">Egg</option>
      </select>
    </label>
   </div>
   <label>Dish/price source URL<input type="url" placeholder="https://..." required value={d.source_url} onChange={e=>updateDish(i,{source_url:e.target.value})}/></label>
   <div className="food-curator-row"><label><input type="checkbox" checked={d.is_signature} onChange={e=>updateDish(i,{is_signature:e.target.checked})}/> Signature dish</label>
     <button type="button" onClick={()=>setDishes(v=>v.filter((_,n)=>i!==n))}><Trash2 size={14}/> Remove</button></div>
  </div>)}
  <div className="food-curator-heading"><strong>Verified weekly opening hours</strong><button type="button" onClick={addHours}><Plus size={15}/> Add interval</button></div>
  {hours.map((h,i)=><div className="food-curator-card" key={i}>
   <div className="food-curator-grid">
    <label>Day<select value={h.weekday} onChange={e=>updateHours(i,{weekday:Number(e.target.value)})}>{dayNames.map((v,n)=><option value={n} key={v}>{v}</option>)}</select></label>
    <label>Open<input type="time" required value={h.opens_at} onChange={e=>updateHours(i,{opens_at:e.target.value})}/></label>
    <label>Close<input type="time" required value={h.closes_at} onChange={e=>updateHours(i,{closes_at:e.target.value})}/></label>
    <label className="food-curator-check"><input type="checkbox" checked={h.overnight} onChange={e=>updateHours(i,{overnight:e.target.checked})}/> Next day</label>
   </div>
   <label>Opening-hours source URL<input type="url" required placeholder="https://..." value={h.source_url} onChange={e=>updateHours(i,{source_url:e.target.value})}/></label>
   <button type="button" onClick={()=>setHours(v=>v.filter((_,n)=>n!==i))}><Trash2 size={14}/> Remove interval</button>
  </div>)}
  <div className="food-curator-heading"><strong>Food styles</strong></div>
  <div className="food-curator-tags">
   {foodStyleFilters.map(o=><label key={o.key}>
    <input type="checkbox" checked={tags.some(t=>t.tag===o.key)} onChange={e=>setTags(v=>e.target.checked?[...v,{tag:o.key,source_url:tagSource}]:v.filter(t=>t.tag!==o.key))}/>
    {o.label}
   </label>)}
  </div>
  {tags.length>0&&<label>Food-style verification source URL<input type="url" required placeholder="https://..." value={tagSource} onChange={e=>setTagSource(e.target.value)}/></label>}
  {notice&&<p role="status" className="food-curator-notice">{notice}</p>}
  <button className="primary" disabled={busy} type="submit"><Save size={16}/>{busy?"Saving…":"Save verified food information"}</button>
 </form>;
}
