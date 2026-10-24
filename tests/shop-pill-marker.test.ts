import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shopNameLines, shopMarkerId, markerDishLabel } from "../src/features/map/layers/shopPillMarker.ts";

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

test("Nimrah style includes white rounded capsule, two text lines and a single orange anchor", () => {
  const source = readFileSync("src/features/map/layers/shopPillMarker.ts", "utf8");
  for (const token of [
    'ctx.drawImage(art',
    'ctx.fillStyle="#FA8123"',
    'ctx.fillStyle="#FFFFFF"',
    'ctx.fillStyle="#17211D"',
    'ctx.shadowBlur=selected?15:11',
    'roundedPill(ctx',
    'ctx.getImageData(',
  ]) assert.ok(source.includes(token), token);
  assert.ok(source.includes('ctx.arc(width/2,middleY,5.7'));
  assert.ok(source.includes('ctx.fillText(title'));
  assert.ok(source.includes('ctx.fillText(subtitle'));
  assert.ok(!source.includes('document.body.appendChild'));
});

test("food artwork is high-DPI, cropped, and overlaps the name pill", () => {
  const marker = readFileSync("src/features/map/layers/shopPillMarker.ts", "utf8");
  const map = readFileSync("src/features/map/components/CityMap.tsx", "utf8");
  assert.ok(marker.includes("const SCALE=3"));
  assert.ok(marker.includes("const ART_SIZE=77"));
  assert.ok(marker.includes("const PILL_TOP=63"));
  assert.ok(marker.includes("PILL_TOP-ART_SIZE/2+11"));
  assert.ok(marker.includes("ctx.getImageData"));
  assert.ok(marker.includes('ctx.imageSmoothingQuality="high"'));
  assert.ok(map.includes("pixelRatio:3"));
});

test("illustration is painted over the pill, not hidden behind it",()=>{
 const marker=readFileSync("src/features/map/layers/shopPillMarker.ts","utf8");
 const card=marker.indexOf("roundedPill(ctx,left,PILL_TOP");
 const art=marker.indexOf("foodArt(ctx,art,width/2");
 const label=marker.indexOf("ctx.fillText(title");
 const subtitle=marker.indexOf("ctx.fillText(subtitle");
 assert.ok(card>=0 && art>card && label>art && subtitle>label);
 assert.ok(marker.includes("pixels[(y*canvas.width+x)*4+3]<72"));
});

test("a short verified food name renders as a real dish, without making up menu items",()=>{
 assert.equal(markerDishLabel("Tea","Known for Irani Chai"),"Irani Chai");
 assert.equal(markerDishLabel("Biryani","Known for Chicken Dum Biryani"),"Chicken Dum Biryani");
 assert.equal(markerDishLabel("Biryani","Long and interesting history of food that has no specific verified dish mentioned"),"Biryani");
 assert.equal(markerDishLabel("Tea","Traditional Irani chai and local biscuits served in the old city"),"Irani Chai");
 assert.equal(markerDishLabel(null,""),"Local favourite");
});
test("one icon-only sprite is shared per food dish and selected cards get orange outlines",()=>{
 const marker=readFileSync("src/features/map/layers/shopPillMarker.ts","utf8");
 const map=readFileSync("src/features/map/components/CityMap.tsx","utf8");
 assert.ok(marker.includes("export function drawCompactShopMarker"));
 assert.ok(marker.includes('ctx.strokeStyle=selected?"#F28A33"'));
 assert.ok(map.includes('"icon-image": ["get", "iconCompact"]'));
 assert.ok(map.includes('const COMPACT_ICON_LAYER = "aaspaas-compact-food-icons"'));
 assert.ok(map.includes('const SELECTED_ICON_LAYER = "aaspaas-selected-food-icon"'));
 assert.ok(map.includes('instance.setFilter(COMPACT_ICON_LAYER,["all",filter,["==",["get","fullCard"],false]])'));
 assert.ok(map.includes('drawShopMarker(image,p.name,signature,{selected:true,verifiedGem:gem})'));
});
