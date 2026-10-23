import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as places } from "../src/app/api/places/route";
import { GET as admin, PATCH as edit } from "../src/app/api/admin/places/route";
import { POST as suggest } from "../src/app/api/suggestions/route";
import { GET as photo } from "../src/app/api/photos/route";
import { readForm, ApiError } from "../src/lib/server";
// Isolated fixture mode: never depend on a developer's real database or credentials.
delete process.env.SUPABASE_SECRET_KEY;
process.env.APP_ORIGIN = "http://localhost:3000";
test("browse endpoint filters by category and normalizes search", async () => {
  const r = await places(
    new Request("http://localhost:3000/api/places?category=Food&q=chai"),
  );
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.mode, "curated");
  assert.equal(d.places.length, 1);
  assert.equal(d.places[0].name, "Nimrah Cafe");
});
test("browse endpoint rejects invalid bounds and respects valid bounds", async () => {
  assert.equal(
    (await places(new Request("http://localhost:3000/api/places?bounds=x")))
      .status,
    400,
  );
  const r = await places(
    new Request("http://localhost:3000/api/places?bounds=78.1,17.1,78.2,17.2"),
  );
  assert.deepEqual((await r.json()).places, []);
});
test("admin reads and writes reject unauthenticated requests", async () => {
  assert.equal(
    (await admin(new Request("http://localhost:3000/api/admin/places"))).status,
    401,
  );
  assert.equal(
    (
      await edit(
        new Request("http://localhost:3000/api/admin/places", {
          method: "PATCH",
          headers: { origin: "http://localhost:3000" },
        }),
      )
    ).status,
    401,
  );
});
test("cross-origin submissions are rejected", async () => {
  assert.equal(
    (
      await suggest(
        new Request("http://localhost:3000/api/suggestions", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      )
    ).status,
    403,
  );
});
test("unconfigured backend fails explicitly instead of pretending to save", async () => {
  assert.equal(
    (
      await suggest(
        new Request("http://localhost:3000/api/suggestions", {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
      )
    ).status,
    503,
  );
  assert.equal(
    (await photo(new Request("http://localhost:3000/api/photos?id=unknown")))
      .status,
    404,
  );
});
test("chunked uploads cannot bypass body-size limits", async () => {
  const request = new Request("http://localhost:3000/api/suggestions", {
    method: "POST",
    body: new Uint8Array(4 * 1024 * 1024 + 1),
    headers: { "content-type": "multipart/form-data; boundary=test" },
  });
  await assert.rejects(
    () => readForm(request),
    (e: unknown) => e instanceof ApiError && e.status === 413,
  );
});
test("malformed multipart form returns a safe 400", async () => {
  const request = new Request("http://localhost:3000/api/suggestions", {
    method: "POST",
    body: "bad",
    headers: { "content-type": "multipart/form-data" },
  });
  await assert.rejects(
    () => readForm(request),
    (e: unknown) => e instanceof ApiError && e.status === 400,
  );
});
