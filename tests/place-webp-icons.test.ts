import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import sharp from "sharp";
import { iconNames, iconFor, iconPath } from "../src/features/map/layers/icons.ts";

test("ten new 512px illustrated WebPs are sharp and transparent", async () => {
  assert.equal(iconNames.length, 10);
  assert.equal(new Set(iconNames).size, 10);
  assert.ok(readdirSync("public/icons", { recursive: true }).every((file) => !String(file).endsWith(".svg")), "old SVG icons have been removed");
  assert.ok(!existsSync("public/food-illustrations"), "remove old tiny duplicate art");
  assert.ok(!existsSync("public/icons/illustrated"), "remove obsolete low-resolution map art");
  for (const name of iconNames) {
    const data = readFileSync("public" + iconPath(name));
    assert.equal(data.toString("ascii",0,4), "RIFF");
    assert.equal(data.toString("ascii",8,12), "WEBP");
    assert.ok(data.byteLength >= 30_000 && data.byteLength < 180_000, name + " should be high-resolution and optimized");
    const meta = await sharp(data).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.equal(meta.hasAlpha, true);
  }
});

test("dish matches the correct miniature, without inventing food identities", () => {
  for(const dish of ["Biryani","Punugulu","Samosa","Chaat","Dosa"])
    assert.equal(iconFor("Food",dish),dish.toLowerCase());
  assert.equal(iconFor("Food","Tea"),"chai");
  assert.equal(iconFor("Food","Sweets","Jalebi House"),"jalebi");
  assert.equal(iconFor("Food",null,"Pani Puri Stop"),"pani-puri");
  assert.equal(iconFor("Food",null,"","Hot Idli Breakfast"),"idli");
  assert.equal(iconFor("Food",null,"Kebab Corner"),"kebab");
  assert.equal(iconFor("Food","Mandi","Wah Mandi"),"mandi");
  assert.equal(iconFor("Food","Sweets","Sweet Shop"),"sweets");
  assert.equal(iconFor("Places","Biryani"),null);
  assert.equal(iconFor("Nature",null),null);
});

test("map draws whole illustrated shop pills in one selectable GPU layer", () => {
  const code=readFileSync("src/features/map/components/CityMap.tsx","utf8");
  for(const needle of [
    'source: "aaspaas-places"',
    'minzoom: PLACE_HIDE_ZOOM',
    '"icon-image": ["get", "icon"]',
    '"icon-anchor": "bottom"',
    '"icon-allow-overlap": true',
    'drawShopMarker(image, mapName, signature, {verifiedGem:gem})',
    'shopMarkerId(p.id, mapName, icon + "|" + signature',
    'for (const layer of [PLACE_ICON_LAYER,COMPACT_ICON_LAYER,SELECTED_ICON_LAYER])',
    'latest.current.onSelect(place)',
    'icon: imageId',
    'name: p.name',
    'iconFor(p.category, p.dish, p.name, p.famous_for)',
  ]) assert.ok(code.includes(needle),needle);
  assert.ok(!code.includes('"text-field": ["get", "name"]'));
  assert.ok(!code.includes("cluster-count"));
  assert.ok(!code.includes('"cluster": true'));
});

test("place list and details use new illustrations without broken nonfood images", () => {
  const list=readFileSync("src/features/explore/components/ExplorePage.tsx","utf8");
  const detail=readFileSync("src/features/explore/components/PlaceDetails.tsx","utf8");
  assert.ok(list.includes("iconPath(iconFor(p.category, p.dish, p.name, p.famous_for)!)"));
  assert.ok(list.includes('<MapPin size={19}'));
  assert.ok(detail.includes("iconPath(icon)"));
  assert.ok(detail.includes("iconFor(place.category, place.dish, place.name, place.famous_for)"));
});

test("details gracefully handle missing food icon and photo URLs", () => {
  const detail = readFileSync("src/features/explore/components/PlaceDetails.tsx", "utf8");
  assert.ok(detail.includes("function DetailPhoto"));
  assert.ok(detail.includes("function DetailFoodIcon"));
  assert.ok(detail.includes('onError={() => setFailed(true)}'));
  assert.ok(detail.includes('onError={() => setFailed(true)}'));
  assert.ok(!detail.includes('food-illustrations/'));
  assert.ok(detail.includes('encodeURIComponent(id)'));
  assert.ok(detail.includes('key={place.id + icon}'));
});
