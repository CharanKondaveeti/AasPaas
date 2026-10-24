import {foodCategories,foodStyleFilters} from "./foodCatalog";
import type {Place,Bounds} from "@/lib/types";
import type {FoodFiltersState} from "../foodService";
import {foodOpenNow} from "../foodService";
import {normalizeSearch} from "@/lib/validation";

/** Fixed, deliberately fictional UI test records. Real places are never overwritten. */
export const SAMPLES_PER_CATEGORY=30;
export const EXPECTED_SAMPLE_TOTAL=foodCategories.length*SAMPLES_PER_CATEGORY;
const demoAreas=[["Charminar",17.3614,78.4744],["Abids",17.3906,78.475],["Koti",17.3865,78.4876],["Secunderabad",17.4399,78.4983],["Himayatnagar",17.405,78.483],["Banjara Hills",17.4122,78.4481],["Jubilee Hills",17.4322,78.4071],["Madhapur",17.4486,78.3908],["Gachibowli",17.4401,78.3489],["Kondapur",17.4608,78.3674],["Mehdipatnam",17.394,78.439],["Tolichowki",17.4056,78.4119],["Begumpet",17.444,78.4624],["Dilsukhnagar",17.3688,78.5247],["Ameerpet",17.4375,78.4483]] as const;
const demoStyles=foodStyleFilters.map(s=>s.key);

export type SampleFoodPlace=Place&{
 is_demo:true;
 demo_price_inr:number;
 demo_diet:"veg"|"non_veg";
 demo_style:string;
 demo_opens_at:string;
 demo_closes_at:string;
 demo_overnight:boolean;
};
function createSamples():SampleFoodPlace[]{
 return foodCategories.flatMap((cat,categoryIndex)=>
  Array.from({length:SAMPLES_PER_CATEGORY},(_,index)=>{
   const n=index+1;
   const area=demoAreas[(categoryIndex*5+n-1)%demoAreas.length];
   const overnight=n%6===0;
   const early=!overnight&&n%5===0;
   const sampleName=`SAMPLE ${cat.key} Spot ${String(n).padStart(2,"0")}`;
   return {
    id:`demo-food-${cat.icon}-${String(n).padStart(2,"0")}`,
    name:sampleName,category:"Food" as const,dish:cat.key,discovery_group:"food" as const,
    famous_for:`Fictional example: ${cat.label} category demo — not a real business`,
    description:"Sample data for testing the AasPaas map and discovery filters. This place does not exist as a verified recommendation.",
    area:area[0],latitude:area[1]+((n%5)-2)*0.00175,
    longitude:area[2]+(((n*3+categoryIndex)%7)-3)*0.0021,
    source_url:null,photo_path:null,photo_credit:null,hours:null,price:null,
    status:"approved" as const,listing_verified_at:null,is_hidden_gem:false,
    is_demo:true as const,
    demo_price_inr:25+((categoryIndex*13+n*17)%345),
    demo_diet:(["Biryani","Mandi","Haleem","Kebab"].includes(cat.key)?"non_veg":"veg") as "veg"|"non_veg",
    demo_style:demoStyles[(categoryIndex+n)%demoStyles.length],
    demo_opens_at:overnight?"18:00":early?"06:30":"10:00",
    demo_closes_at:overnight?"02:00":early?"11:30":"22:00",
    demo_overnight:overnight
   };
  }));
}
export const sampleFoodPlaces:readonly SampleFoodPlace[]=Object.freeze(createSamples());

/** Preview uses these alone; it never combines sample rows with production results. */
export function getSampleFoodPlaces(
 bounds:Bounds,query:string,filters:FoodFiltersState,hiddenOnly:boolean,
 limit=90,now:Date=new Date()
):{places:SampleFoodPlace[];mode:"sample";truncated:boolean}{
 const normalized=normalizeSearch(query);
 const rows=hiddenOnly?[]:sampleFoodPlaces.filter(p=>{
   // A selected dish shows all 30 examples; zooming/panning can still reveal individual map pins.
   const areaMatch=Boolean(filters.dish||normalized)||
     (p.longitude>=bounds[0]&&p.longitude<=bounds[2]&&p.latitude>=bounds[1]&&p.latitude<=bounds[3]);
   if(!areaMatch)return false;
   if(filters.dish&&p.dish!==filters.dish)return false;
   if(normalized&&!normalizeSearch([p.name,p.area,p.dish,p.famous_for].join(" ")).includes(normalized))return false;
   if(filters.budget!==null&&p.demo_price_inr>filters.budget)return false;
   if(filters.diet!=="any"&&p.demo_diet!==filters.diet)return false;
   if(filters.style!=="any"&&p.demo_style!==filters.style)return false;
   if(filters.hours==="late_night"&&!p.demo_overnight)return false;
   if(filters.hours==="early_morning"&&!(Number(p.demo_opens_at.slice(0,2))<8))return false;
   if(filters.hours==="open_now"){
      const weekly=Array.from({length:7},(_,weekday)=>({weekday,
        opens_at:p.demo_opens_at,closes_at:p.demo_closes_at,overnight:p.demo_overnight}));
      if(foodOpenNow(weekly,now)!==true)return false;
   }
   return true;
 });
 return {places:rows.slice(0,limit),mode:"sample",truncated:rows.length>limit};
}
