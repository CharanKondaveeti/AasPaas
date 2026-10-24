import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {foodCategories} from "../src/features/food/data/foodCatalog";

const migration=readFileSync("supabase/migrations/20261024210000_unify_places_scattered_food_testing.sql","utf8");
const source=readFileSync("src/services/placeService.ts","utf8");
const page=readFileSync("src/features/explore/components/ExplorePage.tsx","utf8");
const details=readFileSync("src/features/explore/components/PlaceDetails.tsx","utf8");

test("single canonical places source, no client-generated food duplicates",()=>{
 assert.equal(foodCategories.length,20);
 assert.equal(new Set(foodCategories.map(x=>x.key)).size,20);
 assert.equal(readdirSync("public/food-art").filter(f=>f.endsWith(".svg")).length,20);
 assert.ok(!readdirSync("src/features/food/data").includes("demoPlaces.ts"));
 assert.ok(source.includes('browserDb().rpc("explore_demo_food"'));
 assert.ok(!source.includes("getSampleFoodPlaces"));
 assert.ok(source.includes('mode:"sample"'));
 assert.ok(source.includes("if(signal?.aborted)"));
});

test("stored test venues are unverified and ordinary pending submissions remain hidden",()=>{
 assert.ok(migration.includes("insert into public.places"));
 assert.ok(migration.includes("drop table public.food_demo_places"));
 assert.ok(migration.includes("is_demo and status='pending'"));
 assert.ok(migration.includes("status='pending' and category='Food'"));
 assert.ok(migration.includes("places_demo_unpublished"));
 assert.ok(migration.includes("not p.is_demo"));
 assert.ok(migration.includes("security invoker"));
 assert.ok(migration.includes("places_demo_coordinates_unique"));
 assert.ok(migration.includes("st_dwithin"));
 assert.ok(migration.includes("120"));
 assert.ok(details.includes("Directions disabled — fictional sample location"));
 assert.ok(page.includes("setSampleMode(true)"));
});

test("dish-first preview filters real database viewport to 180 balanced results",()=>{
 assert.ok(migration.includes("partition by p.dish"));
 assert.ok(migration.includes("extensions.st_makeenvelope"));
 assert.ok(migration.includes("limit 180"));
 assert.ok(source.includes("filter_dish:dish"));
 assert.ok(source.includes("filter_budget:food?.budget"));
 assert.ok(source.includes("filter_hours:food?.hours"));
 assert.ok(source.includes("filter_style:food?.style"));
 assert.ok(page.includes('setDish("");setFoodFilters({...emptyFoodFilters});'));
});
