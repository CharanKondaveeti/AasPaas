import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

test("food-first catalog respects verified-only Hidden Gems and public RLS", async () => {
  const pg = new PGlite({ extensions: { postgis, pg_trgm } });
  try {
    await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema storage; create table storage.buckets(id text primary key,name text,
      public boolean,file_size_limit bigint,allowed_mime_types text[]);
      grant usage on schema public to anon,authenticated,service_role;`);
    for (const file of [
      "supabase/migrations/20261023090337_city_discovery.sql",
      "supabase/seed.sql",
      "supabase/migrations/20261024105037_hyderabad_food_first_curated_discovery.sql",
    ]) await pg.exec(readFileSync(file, "utf8"));
    let r = await pg.query<{ name: string }>(
      `select name from public.explore_discoveries(
        78.15,17.15,78.85,17.65,'','All','','food',false)`,
    );
    assert.ok(r.rows.some((p) => p.name === "Nimrah Cafe"));
    r = await pg.query<{ name: string }>(
      `select name from public.explore_discoveries(
        78.15,17.15,78.85,17.65,'','All','','all',true)`,
    );
    assert.equal(r.rows.length, 0, "existing approved rows are not silently verified");
    await assert.rejects(
      () => pg.exec(`update public.places set is_hidden_gem=true where name='Nimrah Cafe'`),
      /places_hidden_gem_evidence/,
    );
    await pg.exec(`update public.places set
      listing_verified_at=now(),
      verification_notes='Checked shop listing and coordinates against primary map source',
      is_hidden_gem=true,
      hidden_gem_reason='A neighbourhood favourite recommended for distinctive tea'
      where name='Nimrah Cafe'`);
    r = await pg.query<{ name: string }>(
      `select name from public.explore_discoveries(
        78.15,17.15,78.85,17.65,'','All','','food',true)`,
    );
    assert.deepEqual(r.rows.map((p) => p.name), ["Nimrah Cafe"]);
    await pg.exec("set role anon");
    await assert.rejects(
      () => pg.exec("update public.places set is_hidden_gem=false"),
      /permission denied/,
    );
    r = await pg.query<{ name: string }>(
      `select name from public.explore_discoveries(
        78.15,17.15,78.85,17.65,'','All','','food',true)`,
    );
    assert.deepEqual(r.rows.map((p) => p.name), ["Nimrah Cafe"]);
    await pg.exec("reset role");
  } finally {
    await pg.close();
  }
});
