import {test} from "node:test";
import assert from "node:assert/strict";
import {sampleFoodPlaces,SAMPLES_PER_CATEGORY,EXPECTED_SAMPLE_TOTAL,getSampleFoodPlaces} from "../src/features/food/data/demoPlaces";
import {foodCategories} from "../src/features/food/data/foodCatalog";
import {emptyFoodFilters} from "../src/features/food/foodService";
import {CITY_BOUNDS} from "../src/lib/types";
import {readFileSync} from "node:fs";

test("600 fictional food fixtures exist: exactly 30 for each of 20 illustrated dishes",()=>{
 assert.equal(foodCategories.length,20);
 assert.equal(SAMPLES_PER_CATEGORY,30);
 assert.equal(EXPECTED_SAMPLE_TOTAL,600);
 assert.equal(sampleFoodPlaces.length,600);
 assert.equal(new Set(sampleFoodPlaces.map(p=>p.id)).size,600);
 for(const category of foodCategories){
  assert.equal(sampleFoodPlaces.filter(p=>p.dish===category.key).length,30,category.key);
 }
 for(const p of sampleFoodPlaces){
  assert.ok(p.is_demo);
  assert.equal(p.status,"approved");
  assert.equal(p.listing_verified_at,null);
  assert.equal(p.source_url,null);
  assert.equal(p.photo_path,null);
  assert.equal(p.is_hidden_gem,false);
  assert.ok(p.name.startsWith("SAMPLE "));
  assert.ok(p.latitude>=CITY_BOUNDS[1]&&p.latitude<=CITY_BOUNDS[3]);
  assert.ok(p.longitude>=CITY_BOUNDS[0]&&p.longitude<=CITY_BOUNDS[2]);
  assert.ok(p.demo_price_inr>0&&p.demo_price_inr<500);
 }
});
test("every selected dish shows all 30 examples without mixing real venues",()=>{
 for(const category of foodCategories){
  const rows=getSampleFoodPlaces(CITY_BOUNDS,"",{...emptyFoodFilters,dish:category.key},false);
  assert.equal(rows.mode,"sample");
  assert.equal(rows.truncated,false);
  assert.equal(rows.places.length,30,category.key);
  assert.ok(rows.places.every(p=>p.is_demo&&p.dish===category.key));
 }
});
test("sample prices, diet, opening hours, and styles are filters, not production facts",()=>{
 const base={...emptyFoodFilters,dish:"Biryani"};
 const all=getSampleFoodPlaces(CITY_BOUNDS,"",base,false);
 const budget=getSampleFoodPlaces(CITY_BOUNDS,"",{...base,budget:100},false);
 assert.ok(budget.places.length>0&&budget.places.length<all.places.length);
 assert.ok(budget.places.every(p=>p.demo_price_inr<=100));
 const nonveg=getSampleFoodPlaces(CITY_BOUNDS,"",{...base,diet:"non_veg"},false);
 assert.equal(nonveg.places.length,30);
 const veg=getSampleFoodPlaces(CITY_BOUNDS,"",{...base,diet:"veg"},false);
 assert.equal(veg.places.length,0);
 const night=getSampleFoodPlaces(CITY_BOUNDS,"",{...base,hours:"late_night"},false);
 assert.equal(night.places.length,5);
 const early=getSampleFoodPlaces(CITY_BOUNDS,"",{...base,hours:"early_morning"},false);
 assert.equal(early.places.length,5);
 const restricted=getSampleFoodPlaces(CITY_BOUNDS,"",base,true);
 assert.equal(restricted.places.length,0);
 const searched=getSampleFoodPlaces(CITY_BOUNDS,"Irani Chai",{...emptyFoodFilters,dish:"Tea"},false);
 assert.equal(searched.places.length,30);
 const limited=getSampleFoodPlaces(CITY_BOUNDS,"",emptyFoodFilters,false);
 assert.equal(limited.places.length,90);
 assert.equal(limited.truncated,true);
});
test("production place search remains separate and directions are disabled in demo details",()=>{
 const placeService=readFileSync("src/services/placeService.ts","utf8");
 const details=readFileSync("src/features/explore/components/PlaceDetails.tsx","utf8");
 const migration=readFileSync("supabase/migrations/20261024132000_food_600_isolated_sample_fixtures.sql","utf8");
 assert.ok(placeService.includes('if(sampleMode && group==="food")'));
 assert.ok(details.includes("Directions disabled — fictional sample location"));
 assert.ok(details.includes("!place.is_demo"));
 assert.ok(migration.includes("public.food_demo_places"));
 assert.ok(!migration.includes("insert into public.places"));
 assert.ok(migration.includes("revoke all on public.food_demo_places from anon,authenticated"));
});
