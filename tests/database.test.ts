import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

test("migration, spatial queries, RLS, atomic limits and duplicate protection in PostgreSQL/PostGIS", async (t) => {
  const pg = new PGlite({ extensions: { postgis, pg_trgm } });
  try {
    // Supabase-owned schemas/roles are fixtures; application SQL below is unmodified.
    await pg.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to anon,authenticated,service_role;`,
    );
    await pg.exec(
      readFileSync(
        "supabase/migrations/20261023090337_city_discovery.sql",
        "utf8",
      ),
    );
    await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
    await t.test("spatial query returns only points in bounds", async () => {
      const r = await pg.query<{ name: string }>(
        `select name from public.explore_places(78.47,17.36,78.48,17.37,'','All','')`,
      );
      assert.deepEqual(r.rows.map((v) => v.name).sort(), [
        "Charminar",
        "Nimrah Cafe",
      ]);
    });
    await t.test("search matches normalized spellings", async () => {
      const r = await pg.query<{ name: string }>(
        `select name from public.explore_places(78.1,17.1,78.2,17.2,'golkonda','All','')`,
      );
      assert.equal(r.rows[0].name, "Golconda Fort");
    });
    await t.test("limit rejects the sixth request", async () => {
      await pg.exec("set role service_role");
      for (let i = 0; i < 6; i++) {
        const r = await pg.query<{ ok: boolean }>(
          `select public.consume_submission_limit($1) as ok`,
          ["a".repeat(64)],
        );
        assert.equal(r.rows[0].ok, i < 5);
      }
      await pg.exec("reset role");
    });
    let id = "";
    await t.test(
      "submissions are pending and canonical duplicate is rejected",
      async () => {
        await pg.exec("set role service_role");
        const r = await pg.query<{ id: string }>(
          `select public.submit_place('Test Cafe','Fresh tea and snacks',17.4,78.4,null) as id`,
        );
        id = r.rows[0].id;
        await assert.rejects(
          () =>
            pg.query(
              `select public.submit_place('TEST-CAFE','Fresh tea and snacks',17.4,78.4,null)`,
            ),
          /duplicate/,
        );
        await pg.exec("reset role");
      },
    );
    await t.test(
      "anonymous users cannot read pending rows or mutate/call privileged RPCs",
      async () => {
        await pg.exec("set role anon");
        const r = await pg.query<{ count: number }>(
          `select count(*)::int as count from public.places where id=$1`,
          [id],
        );
        assert.equal(r.rows[0].count, 0);
        await assert.rejects(
          () => pg.query("select * from public.admins"),
          /permission denied/,
        );
        await assert.rejects(
          () => pg.query("update public.places set status='approved'"),
          /permission denied/,
        );
        await assert.rejects(
          () =>
            pg.query(
              "select public.submit_place('Bad Cafe','Unapproved test',17.4,78.4,null)",
            ),
          /permission denied/,
        );
        await assert.rejects(
          () => pg.query("select public.consume_submission_limit('x')"),
          /permission denied/,
        );
        await pg.exec("reset role");
      },
    );
    await t.test(
      "ordinary authenticated users cannot self-promote",
      async () => {
        await pg.exec("set role authenticated");
        await assert.rejects(
          () =>
            pg.query(
              "insert into public.admins values ('00000000-0000-4000-8000-000000000001',now())",
            ),
          /permission denied/,
        );
        await assert.rejects(
          () => pg.query("update public.places set status='approved'"),
          /permission denied/,
        );
        await pg.exec("reset role");
      },
    );
    await t.test("approval publishes, rejection hides the row", async () => {
      await pg.query("update public.places set status='approved' where id=$1", [
        id,
      ]);
      await pg.exec("set role anon");
      let r = await pg.query("select id from public.places where id=$1", [id]);
      assert.equal(r.rows.length, 1);
      await pg.exec("reset role");
      await pg.query("update public.places set status='rejected' where id=$1", [
        id,
      ]);
      await pg.exec("set role anon");
      r = await pg.query("select id from public.places where id=$1", [id]);
      assert.equal(r.rows.length, 0);
      await pg.exec("reset role");
    });
  } finally {
    await pg.close();
  }
});
