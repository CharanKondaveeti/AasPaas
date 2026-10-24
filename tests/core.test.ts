import { test } from "node:test";
import assert from "node:assert/strict";
import {
  suggestionSchema,
  editSchema,
  parseBounds,
  normalizeSearch,
} from "../src/lib/validation";
import { seedPlaces } from "../src/features/explore/data/places";
const valid = {
  name: "A local cafe",
  famous_for: "Fresh tea and snacks",
  latitude: 17.4,
  longitude: 78.4,
};
test("public submissions reject client-supplied approval and identity fields", () => {
  assert.equal(
    suggestionSchema.safeParse({ ...valid, status: "approved" }).success,
    false,
  );
  assert.equal(
    suggestionSchema.safeParse({ ...valid, user_id: "admin" }).success,
    false,
  );
});
test("submission validates text, coordinates and honeypot", () => {
  assert.equal(suggestionSchema.safeParse(valid).success, true);
  for (const data of [
    { ...valid, name: "<script>alert(1)</script>" },
    { ...valid, latitude: NaN },
    { ...valid, longitude: 180 },
    { ...valid, latitude: 0 },
    { ...valid, website: "spam" },
    { ...valid, name: "x" },
    { ...valid, famous_for: "a".repeat(401) },
  ])
    assert.equal(suggestionSchema.safeParse(data).success, false);
});
test("invalid and reversed bounds are rejected", () => {
  assert.deepEqual(parseBounds("78,17,79,18"), [78, 17, 79, 18]);
  for (const b of [
    "a,17,79,18",
    "79,17,78,18",
    "78,18,79,17",
    "78,17,79",
    "-181,17,79,18",
  ])
    assert.throws(() => parseBounds(b));
});
test("search normalizes common spellings", () => {
  assert.equal(normalizeSearch("  CHAR MINAR "), "charminar");
  assert.equal(normalizeSearch("Golconda"), "golkonda");
  assert.equal(normalizeSearch("Irani Chai"), "irani tea");
  assert.equal(normalizeSearch("Biriyani"), "biryani");
});
test("curated data has source URLs, valid positions and no fabricated commercial metadata", () => {
  assert.equal(new Set(seedPlaces.map((p) => p.id)).size, seedPlaces.length);
  for (const p of seedPlaces) {
    assert.ok(p.source_url?.startsWith("https://"));
    assert.equal(
      suggestionSchema.safeParse({
        name: p.name,
        famous_for: p.famous_for,
        latitude: p.latitude,
        longitude: p.longitude,
      }).success,
      true,
    );
    assert.equal(p.hours, null);
    assert.equal(p.price, null);
  }
});
test("admin edits reject javascript URLs and invalid categories", () => {
  const p = {
    ...valid,
    description: "",
    area: "",
    category: "Food",
    dish: "Tea",
    hours: null,
    price: null,
    source_url: "https://example.com",
    photo_credit: null,
    status: "pending",
  };
  assert.equal(editSchema.safeParse(p).success, true);
  assert.equal(
    editSchema.safeParse({ ...p, source_url: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(
    editSchema.safeParse({ ...p, category: "admin" }).success,
    false,
  );
});

test("Mandi is a valid Food dish without changing safe admin validation", () => {
  const data = {
    ...valid,
    description: "Arabian-style mandi rice",
    area: "Attapur",
    category: "Food",
    dish: "Mandi",
    hours: null,
    price: null,
    source_url: "https://pistahouse.in/pages/store-locator-1",
    photo_credit: null,
    status: "approved",
  };
  assert.equal(editSchema.safeParse(data).success, true);
  assert.equal(editSchema.safeParse({ ...data, dish: "Unknown" }).success, false);
});
