export type FoodTime="any"|"open_now"|"late_night"|"early_morning";
export type FoodDiet="any"|"veg"|"non_veg"|"egg";
export type FoodFiltersState={dish:string;budget:number|null;hours:FoodTime;diet:FoodDiet;style:string};
export const emptyFoodFilters:FoodFiltersState={dish:"",budget:null,hours:"any",diet:"any",style:"any"};
export type CuratedDish={dish_key:string;dish_name:string;price_inr:number|null;diet:string;is_signature:boolean;verified_at:string};
export type CuratedHours={weekday:number;opens_at:string;closes_at:string;overnight:boolean};
export type CuratedFoodDetails={dishes:CuratedDish[];hours:CuratedHours[];tags:string[]};
export const emptyFoodDetails:CuratedFoodDetails={dishes:[],hours:[],tags:[]};
export function cleanFoodDetails(value:unknown):CuratedFoodDetails {
 if(!value||typeof value!=="object")return emptyFoodDetails;
 const v=value as Record<string,unknown>;
 return {dishes:Array.isArray(v.dishes)?v.dishes.filter((x):x is CuratedDish=>!!x&&typeof x==="object"&&typeof x.dish_name==="string"):[],
 hours:Array.isArray(v.hours)?v.hours.filter((x):x is CuratedHours=>!!x&&typeof x==="object"&&typeof x.weekday==="number"):[],
 tags:Array.isArray(v.tags)?v.tags.filter((x):x is string=>typeof x==="string"):[]};
}
export function foodOpenNow(rows:CuratedHours[],instant:Date=new Date()):boolean|null {
 if(!rows.length)return null;
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(instant);
 const day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(parts.find(p=>p.type==="weekday")?.value??"");
 const hm=Number(parts.find(p=>p.type==="hour")?.value)*60+Number(parts.find(p=>p.type==="minute")?.value);
 if(day<0||!Number.isFinite(hm))return null;
 const minutes=(s:string)=>{const [h,m]=s.split(":").map(Number);return h*60+m;};
 return rows.some(h=>(h.weekday===day&&hm>=minutes(h.opens_at)&&(h.overnight||hm<minutes(h.closes_at)))
 ||(h.overnight&&(h.weekday+1)%7===day&&hm<minutes(h.closes_at)));
}
