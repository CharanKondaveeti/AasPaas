import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Clock, Wallet, X, Gem, BadgeCheck, Bookmark, Share2, Utensils } from "lucide-react";
import { isVerifiedGem, type Place } from "@/lib/types";
import { iconFor, iconPath } from "@/features/map/layers/icons";
import { foodCategories, foodArtwork } from "@/features/food/data/foodCatalog";
import { foodOpenNow, emptyFoodDetails, type CuratedFoodDetails } from "@/features/food/foodService";
import { getFoodDetails } from "@/services/placeService";
/** Fall back gracefully when a photo or an illustration is unavailable. */
function DetailPhoto({ id, name }: { id: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span>Discover Hyderabad</span>
  ) : (
    <img
      src={`/api/photos?id=${encodeURIComponent(id)}`}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
function DetailFoodIcon({ icon }: { icon: NonNullable<ReturnType<typeof iconFor>> }) {
  const [failed, setFailed] = useState(false);
  // Only display the new high-definition illustration. Never fall back
  // to obsolete 128px artwork, which made detail views appear blurry.
  if (failed) return null;
  return (
    <img
      className="detail-place-icon"
      src={iconPath(icon)}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
export default function PlaceDetails({
  place,
  onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  const [food,setFood]=useState<CuratedFoodDetails>(emptyFoodDetails);
  const [saved,setSaved]=useState(false);
  const [saveIssue,setSaveIssue]=useState("");
  useEffect(()=>{
    setFood(emptyFoodDetails);
    let active=true;
    if(place.category==="Food" && !place.is_demo)getFoodDetails(place.id).then((details)=>{if(active)setFood(details);});
    return ()=>{active=false;};
  },[place.id,place.category]);
  useEffect(()=>{
    try {const ids:unknown=JSON.parse(localStorage.getItem("aaspaas:saved:places")||"[]");
     setSaved(Array.isArray(ids)&&ids.includes(place.id));}
    catch {setSaved(false);}
  },[place.id]);
  function toggleSaved(){
    try {
     const data:unknown=JSON.parse(localStorage.getItem("aaspaas:saved:places")||"[]");
     const list=Array.isArray(data)?data.filter((x):x is string=>typeof x==="string").slice(0,499):[];
     const next=list.includes(place.id)?list.filter(id=>id!==place.id):[...list,place.id];
     localStorage.setItem("aaspaas:saved:places",JSON.stringify(next));
     setSaved(next.includes(place.id));setSaveIssue("");
    }catch {setSaveIssue("Saving is unavailable in this browser.");}
  }
  const openNow=place.category==="Food"?foodOpenNow(food.hours):null;
  const weekdayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const imageForDish=(key:string)=>foodCategories.find(item=>item.key.toLowerCase().replaceAll(" ","-")===key)?.icon;
  return (
    <section className="place-details" aria-label={`${place.name} details`}>
      <button
        className="detail-close icon-button"
        aria-label="Close place details"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <div
        className={`place-cover ${place.category === "Nature" ? "nature-cover" : ""}`}
      >
        {place.is_demo ? (
          <div className="demo-detail-cover">
            <img src={foodArtwork(foodCategories.find(c=>c.key===place.dish)?.icon??"biryani")} alt="Illustrative food artwork"/>
            <strong>PREVIEW ONLY</strong>
          </div>
        ) : place.photo_path ? (
          <DetailPhoto key={place.id} id={place.id} name={place.name} />
        ) : (
          <span>Discover Hyderabad</span>
        )}
      </div>
      <div className="detail-body">
        {(() => {
          const icon = iconFor(place.category, place.dish, place.name, place.famous_for);
          return icon ? <DetailFoodIcon key={place.id + icon} icon={icon} /> : null;
        })()}
        <span className="eyebrow">
          {place.category} {place.dish && ` / ${place.dish}`}
        </span>
        <h2>{place.name}</h2>
        {place.is_demo&&(
          <div className="demo-detail-notice" role="note">
            <strong>Preview listing — unverified location</strong>
            <span>This fictional listing is for testing the interface. Its location, price and hours are examples only.</span>
          </div>
        )}
        <div className="detail-discovery-badges">
          {isVerifiedGem(place) && <span className="detail-gem-badge"><Gem size={14} /> Hidden Gem</span>}
          {place.listing_verified_at && <span className="detail-verified-badge"><BadgeCheck size={14} /> Curator verified</span>}
        </div>
        <p className="famous">{place.famous_for}</p>
        {isVerifiedGem(place) && place.hidden_gem_reason && (
          <p className="detail-gem-reason">{place.hidden_gem_reason}</p>
        )}
        <p className="description">{place.description}</p>
        <div className="detail-facts">
          <p>
            <MapPin size={17} />
            {place.area || "Hyderabad"}
          </p>
          {place.category!=="Food"&&place.hours&&(
            <p><Clock size={17}/>{place.hours}</p>
          )}
          {place.category!=="Food"&&place.price&&(
            <p><Wallet size={17}/>{place.price}</p>
          )}
        </div>
        {place.is_demo&&(
          <div className="demo-food-facts">
            <strong>Example dish: {place.dish}</strong>
            <span>Sample price: ₹{place.demo_price_inr}</span>
            <span>Sample diet: {place.demo_diet==="veg"?"Veg":"Non-veg"}</span>
            <span>Example hours: {place.demo_opens_at}–{place.demo_closes_at}{place.demo_overnight?" (next day)":""}</span>
            <span>Illustrative type: {place.demo_style?.replaceAll("_"," ")}</span>
          </div>
        )}
        {place.category==="Food"&&!place.is_demo&&(
          <div className="food-verified-menu">
            <h3>Famous for what?</h3>
            {food.dishes.length>0?food.dishes.map(d=>{
              const art=imageForDish(d.dish_key);
              return <div className="food-dish-row" key={d.dish_key}>
               {art?<img src={foodArtwork(art)} alt=""/>:<Utensils size={24} color="#9D7953"/>}
               <span>{d.dish_name}<small>{d.is_signature?"Signature dish · ":""}{d.diet==="veg"?"Vegetarian":d.diet==="non_veg"?"Non-veg":d.diet==="egg"?"Contains egg":"Diet not confirmed"}</small></span>
               {d.price_inr!==null&&<strong>₹{Number(d.price_inr).toLocaleString("en-IN")}</strong>}
              </div>;
            }):<p className="quiet">Signature dishes are being curated. Prices are not yet verified.</p>}
            {openNow!==null&&(
             <p className="food-hours-label"><span className={openNow?"food-open-status":"food-closed-status"}>{openNow?"Open now":"Closed now"}</span> Based on curator-verified Hyderabad opening hours</p>
            )}
            {food.hours.length>0?<details className="food-weekly-hours"><summary><Clock size={15}/> View verified weekly hours</summary>
             {food.hours.map((h,i)=><p key={i}>{weekdayNames[h.weekday]}: {h.opens_at.slice(0,5)}–{h.closes_at.slice(0,5)}{h.overnight?" (next day)":""}</p>)}
            </details>:<p className="quiet">Opening hours not verified yet.</p>}
          </div>
        )}
        {!place.is_demo&&<div className="food-detail-actions">
          <button type="button" className={saved?"food-saved":""} aria-pressed={saved}
            onClick={toggleSaved}><Bookmark size={16}/>{saved?"Saved":"Save place"}</button>
          <a target="_blank" rel="noopener noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(`Found ${place.name} on AasPaas! ${place.famous_for}. Directions: https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`)}`}>
             <Share2 size={16}/> WhatsApp
          </a>
        </div>
        }
        {saveIssue&&<p className="quiet" role="status">{saveIssue}</p>}
        {place.is_demo ? (
          <p className="demo-no-directions">Directions disabled — fictional sample location</p>
        ) : <a
          className="primary directions"
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions <ArrowUpRight size={18} />
        </a>}
        <p className="quiet">
          {place.is_demo?"No real location, verified price or opening hours are associated with this sample.":
          place.listing_verified_at
            ? `Listing checked ${new Date(place.listing_verified_at).toLocaleDateString("en-IN")}. Confirm opening hours before visiting.`
            : "Details are source-listed but not recently verified. Check hours and access before visiting."}
        </p>
        {place.source_url && (
          <a
            className="source-link"
            href={place.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Location source ↗
          </a>
        )}
        {place.photo_path && place.photo_credit && (
          <p className="quiet">Photo: {place.photo_credit}</p>
        )}
      </div>
    </section>
  );
}
