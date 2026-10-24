import { useEffect, useState } from "react";
import { SlidersHorizontal, X, Clock, Leaf, Moon, Sunrise, RotateCcw, Check, FlaskConical } from "lucide-react";
import { foodArtwork, foodBudgets, foodCategories, foodStyleFilters } from "../data/foodCatalog";
import { emptyFoodFilters, type FoodFiltersState } from "../foodService";

export default function FoodFilters({value,onChange,resultCount,loading,sampleMode,onSampleModeChange}:{
 value:FoodFiltersState;onChange:(value:FoodFiltersState)=>void;resultCount:number;loading:boolean;
 sampleMode:boolean;onSampleModeChange:(next:boolean)=>void;
}) {
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false);};
  window.addEventListener("keydown",key);
  return ()=>window.removeEventListener("keydown",key);
 },[open]);
 const update=(key:keyof FoodFiltersState,next:string|number|null)=>onChange({...value,[key]:value[key]===next?(key==="budget"?null:key==="dish"?"":"any"):next});
 const selected=Number(Boolean(value.dish))+Number(value.budget!==null)+Number(value.hours!=="any")+Number(value.diet!=="any")+Number(value.style!=="any");
 return <>
  <div className="food-quickbar" aria-label="Discover by famous dish">
   <button className="food-drawer-trigger" onClick={()=>setOpen(true)} aria-label="All famous food filters">
     <SlidersHorizontal size={16}/> Filters{selected>0&&<b>{selected}</b>}
   </button>
   <button className={sampleMode?"food-preview-toggle active":"food-preview-toggle"}
     aria-pressed={sampleMode}
     title="Fictional places for testing, not real shops"
     onClick={()=>onSampleModeChange(!sampleMode)}>
     <FlaskConical size={14}/>{sampleMode?"Demo · fictional":"Try demo"}
   </button>
   <button className={!value.dish?"selected all-foods-chip":"all-foods-chip"}
      aria-pressed={!value.dish} onClick={()=>onChange({...value,dish:""})}>
     All dishes
   </button>
   {foodCategories.slice(0,10).map(item=><button key={item.key}
    className={value.dish===item.key?"selected":""} aria-pressed={value.dish===item.key}
    onClick={()=>update("dish",item.key)}>
    <img src={foodArtwork(item.icon)} alt=""/><span>{item.label}</span>
   </button>)}
   <button className={value.budget===100?"selected":""} onClick={()=>update("budget",100)}>₹ Under 100</button>
   <button className={value.hours==="open_now"?"selected":""} onClick={()=>update("hours","open_now")}>
    <Clock size={14}/> Open now
   </button>
  </div>
  {open&&<>
   <div className="food-filter-backdrop" onClick={()=>setOpen(false)} aria-hidden="true"/>
   <section className="food-filter-sheet" role="dialog" aria-modal="true" aria-label="Famous Food filters">
    <header className="food-filter-heading">
     <div><strong>Find your craving</strong><p>Explore food Hyderabad is famous for</p></div>
     <button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close food filters"><X size={20}/></button>
    </header>
    <div className="food-filter-scroll">
     <h3>Famous dishes</h3>
     <div className="food-dish-grid">
      <button className={!value.dish?"selected all-foods-tile":"all-foods-tile"}
        aria-pressed={!value.dish}
        onClick={()=>onChange({...value,dish:""})}>
        <span className="all-foods-symbol">🍽️</span>
        <span>All dishes</span>
        {!value.dish&&<Check className="food-checked" size={14}/>}
      </button>
      {foodCategories.map(item=><button key={item.key}
       className={value.dish===item.key?"selected":""} aria-pressed={value.dish===item.key}
       onClick={()=>update("dish",item.key)}>
       <img src={foodArtwork(item.icon)} alt="" loading="lazy"/>
       <span>{item.label}</span>
       {value.dish===item.key&&<Check className="food-checked" size={14}/>}
      </button>)}
     </div>
     <h3>Your budget <small>Only confirmed dish prices</small></h3>
     <div className="food-chip-row">
      {[null,...foodBudgets].map(price=><button key={price??"any"}
       className={value.budget===price?"selected":""} onClick={()=>onChange({...value,budget:price})}>
        {price===null?"Any budget":`Under ₹${price}`}
      </button>)}
     </div>
     <h3>When to eat <small>Only verified opening hours</small></h3>
     <div className="food-chip-row">
      {([{value:"any",label:"Any time",Icon:Clock},{value:"open_now",label:"Open now",Icon:Clock},
       {value:"late_night",label:"After 11 PM",Icon:Moon},{value:"early_morning",label:"Early morning",Icon:Sunrise}] as const).map(t=><button
        key={t.value} className={value.hours===t.value?"selected":""}
        onClick={()=>onChange({...value,hours:t.value})}><t.Icon size={15}/>{t.label}</button>)}
     </div>
     <h3>Food preference <small>Only verified dishes</small></h3>
     <div className="food-chip-row">
      {([{value:"any",label:"All foods"},{value:"veg",label:"Vegetarian"},
       {value:"non_veg",label:"Non-veg"},{value:"egg",label:"Egg"}] as const).map(o=><button
        key={o.value} className={value.diet===o.value?"selected":""}
        onClick={()=>onChange({...value,diet:o.value})}>{o.value==="veg"&&<Leaf size={15}/>}
        {o.label}</button>)}
     </div>
     <h3>Known for</h3>
     <div className="food-chip-row">
      <button className={value.style==="any"?"selected":""} onClick={()=>onChange({...value,style:"any"})}>All styles</button>
      {foodStyleFilters.map(s=><button key={s.key} className={value.style===s.key?"selected":""}
       onClick={()=>onChange({...value,style:s.key})}>{s.label}</button>)}
     </div>
     <p className="food-verification-notice">Prices, opening hours and food preferences appear only when a curator has verified their sources. Missing details are never guessed.</p>
    </div>
    <footer className="food-filter-footer">
     <button onClick={()=>onChange({...emptyFoodFilters})}><RotateCcw size={15}/> Clear filters</button>
     <button className="food-apply" onClick={()=>setOpen(false)}>
       {loading?"Finding places…":`Show ${resultCount} ${resultCount===1?"place":"places"}`}
     </button>
    </footer>
   </section>
  </>}
 </>;
}
