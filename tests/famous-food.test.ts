import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import {postgis} from "@electric-sql/pglite-postgis";
import {pg_trgm} from "@electric-sql/pglite/contrib/pg_trgm";
import {foodOpenNow,cleanFoodDetails} from "../src/features/food/foodService";
import {foodCategories} from "../src/features/food/data/foodCatalog";

test("twenty original illustrated food category assets are available",()=>{
 assert.equal(foodCategories.length,20);
 const icons=readdirSync("public/food-art").filter(p=>p.endsWith(".svg"));
 assert.equal(icons.length,20);
 for(const c of foodCategories){
  const svg=readFileSync(`public/food-art/${c.icon}.svg`,"utf8");
  assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.ok(svg.length>400,c.icon+" has no detailed illustration");
 }
});
test("verified weekly overnight hours calculate in IST",()=>{
 const fri={weekday:5,opens_at:"20:00:00",closes_at:"02:00:00",overnight:true};
 assert.equal(foodOpenNow([],new Date("2026-10-23T18:45:00Z")),null);
 assert.equal(foodOpenNow([fri],new Date("2026-10-23T18:45:00Z")),true);
 assert.equal(foodOpenNow([fri],new Date("2026-10-23T06:00:00Z")),false);
 assert.equal(foodOpenNow([fri],new Date("2026-10-23T20:00:00Z")),true);
 assert.equal(foodOpenNow([fri],new Date("2026-10-24T02:30:00Z")),false);
 assert.deepEqual(cleanFoodDetails(null),{dishes:[],hours:[],tags:[]});
});
test("verified food budgets, local dishes, night hours, details and public RLS",async()=>{
 const pg=new PGlite({extensions:{postgis,pg_trgm}});
 try{
 await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 grant usage on schema public to anon,authenticated,service_role;`);
 for(const file of [
 "supabase/migrations/20261023090337_city_discovery.sql",
 "supabase/seed.sql",
 "supabase/migrations/20261024105037_hyderabad_food_first_curated_discovery.sql",
 "supabase/migrations/20261024124000_famous_food_dishes_hours_and_filters.sql",
 "supabase/migrations/20261024125500_admin_atomic_food_curation.sql"
 ]) await pg.exec(readFileSync(file,"utf8"));
 const q=(price:number)=>pg.query<{name:string}>(`select name from public.explore_famous_food(78.15,17.15,78.85,17.65,'','',${price},'any','any','any',false)`);
 let r=await q(100);
 assert.equal(r.rows.length,0,"no unverified or invented prices");
 await pg.exec("set role service_role");
 const cafe=await pg.query<{id:string}>("select id from public.places where name='Nimrah Cafe'");
 const id=cafe.rows[0].id;
 await pg.query(`select public.save_food_profile($1,$2::jsonb,$3::jsonb,$4::jsonb)`,[
 id,JSON.stringify([{dish_key:"tea",dish_name:"Irani Chai",price_inr:40,diet:"veg",is_signature:true,source_url:"https://example.com/tea"}]),
 JSON.stringify([{weekday:5,opens_at:"20:00",closes_at:"02:00",overnight:true,source_url:"https://example.com/hours"}]),
 JSON.stringify([{tag:"street_food",source_url:"https://example.com/style"}])
 ]);
 await pg.exec("reset role");
 r=await q(50);assert.deepEqual(r.rows.map(x=>x.name),["Nimrah Cafe"]);
 r=await q(30);assert.equal(r.rows.length,0);
 const found=await pg.query<{name:string}>(`select name from public.explore_famous_food(78.15,17.15,78.85,17.65,'','tea',null,'late_night','veg','street_food',false)`);
 assert.deepEqual(found.rows.map(x=>x.name),["Nimrah Cafe"]);
 const details=await pg.query<{data:{dishes:any[];hours:any[];tags:any[]}}>(`select public.famous_food_details($1) as data`,[id]);
 assert.equal(details.rows[0].data.dishes[0].price_inr,40);
 assert.equal(details.rows[0].data.hours[0].overnight,true);
 await pg.exec("set role anon");
 await assert.rejects(()=>pg.query(`delete from public.food_dishes where place_id=$1`,[id]),/permission denied/);
 await assert.rejects(()=>pg.query(`select public.save_food_profile($1,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`,[id]),/permission denied/);
 await pg.exec("reset role");
 }finally{await pg.close();}
});
