import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shopNameLines, shopMarkerId } from "../src/features/map/layers/shopPillMarker.ts";

const measure = (s: string) => s.length * 8;

test("short names get one pill line, and long shop names wrap neatly", () => {
  assert.deepEqual(shopNameLines("Nimrah Café", measure), ["Nimrah Café"]);
  assert.deepEqual(shopNameLines("Punugulu Point", measure), ["Punugulu Point"]);
  const long = shopNameLines("Pista House Arabian Mandi - Attapur", measure);
  assert.equal(long.length, 2);
  assert.ok(long.every((line) => measure(line) <= 187));
  assert.deepEqual(shopNameLines("  A  Good   Chai   Shop ", measure), ["A Good Chai Shop"]);
  assert.deepEqual(shopNameLines("", measure), ["Food stop"]);
  const oversized = shopNameLines("Supercalifragilisticexpialidocious", measure);
  assert.equal(oversized.length, 1);
  assert.ok(oversized[0].endsWith("…"));
  assert.ok(measure(oversized[0]) <= 187);
});

test("marker image identity is stable until the shop name or food changes", () => {
  const original = shopMarkerId("p-123", "Nimrah Café", "chai");
  assert.equal(shopMarkerId("p-123", "Nimrah Café", "chai"), original);
  assert.notEqual(shopMarkerId("p-123", "Nimrah Cafe", "chai"), original);
  assert.notEqual(shopMarkerId("p-123", "Nimrah Café", "samosa"), original);
  assert.notEqual(shopMarkerId("p-124", "Nimrah Café", "chai"), original);
  assert.ok(original.startsWith("shop-pill-p-123-"));
});

test("reference style includes white rounded capsule, dark name and orange side dots", () => {
  const source = readFileSync("src/features/map/layers/shopPillMarker.ts", "utf8");
  for (const token of [
    'ctx.drawImage(art',
    'ctx.fillStyle = "#FA8123"',
    'ctx.fillStyle = "#FFFFFF"',
    'ctx.fillStyle = "#17211D"',
    'ctx.shadowBlur = 9',
    'roundedPill(ctx',
    'ctx.getImageData(',
  ]) assert.ok(source.includes(token), token);
  assert.ok(source.includes('ctx.arc(x, middleY, 7'));
  assert.ok(!source.includes('document.body.appendChild'));
});

test("food artwork is high-DPI, cropped, and overlaps the name pill", () => {
  const marker = readFileSync("src/features/map/layers/shopPillMarker.ts", "utf8");
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.ok(marker.includes("const SCALE = 3"));
  assert.ok(marker.includes("const ART_SIZE = 86"));
  assert.ok(marker.includes("const PILL_TOP = 76"));
  assert.ok(marker.includes("PILL_TOP - drawnHeight + 10"));
  assert.ok(marker.includes("cropCtx.getImageData"));
  assert.ok(marker.includes('ctx.imageSmoothingQuality = "high"'));
  assert.ok(map.includes("pixelRatio: 3"));
});
