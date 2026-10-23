import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizePhoto } from "../src/lib/photos";
test("valid photos are resized and re-encoded without metadata", async () => {
  const input = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: "#176750" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const output = await sanitizePhoto(
    new File([input], "photo.jpg", { type: "image/jpeg" }),
  );
  assert.ok(output);
  const info = await sharp(output).metadata();
  assert.equal(info.format, "webp");
  assert.ok(info.width! <= 1400 && info.height! <= 1000);
  assert.equal(info.exif, undefined);
});
test("MIME-spoofed SVG and corrupted image bytes are rejected", async () => {
  for (const data of [
    "not an image",
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
  ])
    await assert.rejects(
      () => sanitizePhoto(new File([data], "fake.jpg", { type: "image/jpeg" })),
      /could not be read/,
    );
});
test("oversized photos fail before decode", async () => {
  await assert.rejects(
    () =>
      sanitizePhoto(
        new File([new Uint8Array(3 * 1024 * 1024 + 1)], "big.png", {
          type: "image/png",
        }),
      ),
    /under 3 MB/,
  );
});
