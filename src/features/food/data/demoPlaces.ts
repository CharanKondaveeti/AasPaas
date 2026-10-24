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
/** Natural-looking test copy. These are fictional brands, never verified shops. */
const sampleBrands=[
 "Deccan","Safa","Mehfil","Shahi","Royal","Zaiqa","Dil Se","Nawab's",
 "Masti","Mitti","Charminar Lane","Gully","Zaika","Spice Route","Tadka",
 "Dawat","Chatori","Swaad","Dum","Nukkad","Masala","Riwaayat",
 "Mehmaan","Nimaani","Purani Gali","Angithi","Tandoor","Ruchi","Aangan","Sultani"
] as const;
const sampleSuffixes=["Kitchen","Corner","House","Point","Café","Adda","Express","Bites","Centre","Junction"] as const;
const signatureVariants:Record<string,string[]>={
 Biryani:["Hyderabadi Chicken Dum Biryani","Mutton Dum Biryani","Veg Dum Biryani"],
 Punugulu:["Crispy Punugulu","Onion Punugulu","Punugulu with Ginger Chutney"],
 Tea:["Irani Chai","Dum Chai","Irani Chai with Osmania Biscuit"],
 Dosa:["Masala Dosa","Ghee Dosa","Pesarattu Dosa"],
 Mandi:["Chicken Mandi","Mutton Mandi","Mixed Mandi"],
 Samosa:["Aloo Samosa","Onion Samosa","Samosa Chaat"],
 Chaat:["Papdi Chaat","Dahi Puri","Aloo Tikki Chaat"],
 Vada:["Medu Vada","Sambar Vada","Masala Vada"],
 Sweets:["Kaju Katli","Motichoor Laddu","Double Ka Meetha"],
 Idli:["Ghee Karam Idli","Steamed Idli","Sambar Idli"],
 Haleem:["Hyderabadi Haleem","Chicken Haleem","Mutton Haleem"],
 Kebab:["Seekh Kebab","Shami Kebab","Chicken Tikka"],
 "Pani Puri":["Pani Puri","Dahi Puri","Masala Puri"],
 Jalebi:["Hot Jalebi","Rabri Jalebi","Jalebi with Milk"],
 "Mirchi Bajji":["Mirchi Bajji","Stuffed Mirchi Bajji","Cut Mirchi"],
 "Osmania Biscuits":["Osmania Biscuits","Butter Biscuits","Tea and Osmania Biscuits"],
 Juice:["Mosambi Juice","Fresh Watermelon Juice","Mango Shake"],
 Tiffins:["Poori with Curry","Upma","Pesarattu"],
 Rolls:["Chicken Kathi Roll","Paneer Roll","Egg Roll"],
 "Ice Cream":["Kulfi","Falooda Ice Cream","Fruit Sundae"]
};


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
   const sampleName=`${sampleBrands[index]} ${cat.label} ${sampleSuffixes[(categoryIndex+n)%sampleSuffixes.length]}`;
   const signature=(signatureVariants[cat.key]||[cat.label])[index%3];
   return {
    id:`demo-food-${cat.icon}-${String(n).padStart(2,"0")}`,
    name:sampleName,category:"Food" as const,dish:cat.key,discovery_group:"food" as const,
    famous_for:`Known for ${signature}`,
    description:`A local-style food discovery card featuring ${signature}. This is a demo listing with an invented shop name and test location, not a verified business.`,
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
 limit=180,now:Date=new Date()
):{places:SampleFoodPlace[];mode:"sample";truncated:boolean}{
 const normalized=normalizeSearch(query);
 const rows=hiddenOnly?[]:sampleFoodPlaces.filter(p=>{
   // Every filter acts within the visible map. No dish searches outside this area.
   if(p.longitude<bounds[0]||p.longitude>bounds[2]||
      p.latitude<bounds[1]||p.latitude>bounds[3])return false;
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
 // Results in the 600-row fixture are stored category-by-category.
 // Interleave matching categories so broad views display all types fairly.
 // Prefer points near the viewport center when capped, never hide entire food types.
 const centerLng=(bounds[0]+bounds[2])/2,centerLat=(bounds[1]+bounds[3])/2;
 const distance=(p:SampleFoodPlace)=>(
  Math.pow((p.longitude-centerLng)*Math.cos(centerLat*Math.PI/180),2)+
  Math.pow(p.latitude-centerLat,2)
 );
 const byDish=foodCategories.map(cat=>
   rows.filter(p=>p.dish===cat.key).sort((a,b)=>distance(a)-distance(b)));
 const balanced:SampleFoodPlace[]=[];
 let position=0;
 while(balanced.length<Math.min(rows.length,limit)){
  let added=false;
  for(const category of byDish){
   if(category[position]){
    balanced.push(category[position]);
    added=true;
    if(balanced.length>=limit)break;
   }
  }
  if(!added)break;
  position++;
 }
 return {places:balanced,mode:"sample",truncated:rows.length>limit};
}
