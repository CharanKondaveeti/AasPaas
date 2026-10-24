import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAX_VISIBLE_TREES, selectSparseGreenery } from "../src/features/map/layers/scenery.ts";

const raw = JSON.parse(readFileSync("public/map-data/trees.geojson","utf8"));
const features = raw.features.map((f: {properties:{id:string};geometry:{coordinates:[number,number]}}) => f);

test("selects no more than 600 geographically spread permanent trees",()=>{
  assert.equal(MAX_VISIBLE_TREES,600);
  const selected=selectSparseGreenery(features);
  assert.equal(selected.length,Math.min(600,features.length));
  assert.deepEqual(selected,selectSparseGreenery(features));
  assert.equal(new Set(selected.map(f=>f.properties.id)).size,selected.length);
  const groups=new Set(selected.map(f=>/^osm-(\d+)-/.exec(f.properties.id)?.[1]??f.properties.id));
  assert.ok(groups.size>=100,"multiple mapped parks should remain represented");
  assert.ok(selected.every(f=>features.includes(f)),"original coordinates must be retained");
});

test("small sets remain unchanged and caps behave safely",()=>{
  assert.deepEqual(selectSparseGreenery(features.slice(0,3)),features.slice(0,3));
  assert.deepEqual(selectSparseGreenery(features,0),[]);
});
