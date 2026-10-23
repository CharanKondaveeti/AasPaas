import { writeFileSync } from "node:fs";
import { seedPlaces } from "../src/features/explore/data/places";
const quote = (v: string | null) =>
  v === null ? "null" : "'" + v.replaceAll("'", "''") + "'";
const statements = seedPlaces.map(
  (p, i) =>
    `insert into public.places (id,name,category,dish,famous_for,description,area,latitude,longitude,source_url,status) values ('00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}',${quote(p.name)},${quote(p.category)},${quote(p.dish)},${quote(p.famous_for)},${quote(p.description)},${quote(p.area)},${p.latitude},${p.longitude},${quote(p.source_url)},'approved') on conflict(id) do nothing;`,
);
writeFileSync(
  "supabase/seed.sql",
  "-- Generated from the source-checked curated collection.\n" +
    statements.join("\n") +
    "\n",
);
