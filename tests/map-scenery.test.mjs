import { test } from "node:test";
import assert from "node:assert/strict";
import { generateScenery } from "../scripts/generate-map-scenery.mjs";

const rectangle=(west,south,east,north)=>[
  {lon:west,lat:south},{lon:east,lat:south},
  {lon:east,lat:north},{lon:west,lat:north},{lon:west,lat:south}
];
const source={
  elements:[
    {type:"way",id:101,tags:{leisure:"park"},
      geometry:rectangle(78.45,17.4,78.455,17.405)},
    {type:"way",id:102,tags:{natural:"water"},
      geometry:rectangle(78.451,17.401,78.454,17.404)},
    {type:"way",id:103,tags:{leisure:"park"},
      geometry:[{lon:78.46,lat:17.4},{lon:78.461,lat:17.4}]}
  ]
};

test("geographic tree generator is deterministic and respects limits",()=>{
  const first=generateScenery(source,12), second=generateScenery(source,12);
  assert.deepEqual(first,second);
  assert.equal(first.type,"FeatureCollection");
  assert.ok(first.features.length>0);
  assert.ok(first.features.length<=12);
  assert.ok(new Set(first.features.map(f=>f.properties.id)).size===first.features.length);
});

test("generated scenery stays inside green land and outside OSM water",()=>{
  const result=generateScenery(source,100);
  for (const feature of result.features) {
    const [lng,lat]=feature.geometry.coordinates;
    assert.ok(lng>78.45&&lng<78.455);
    assert.ok(lat>17.4&&lat<17.405);
    assert.ok(!(lng>78.451&&lng<78.454&&lat>17.401&&lat<17.404));
    assert.ok(["tree-sprite-a","tree-sprite-b","garden-sprite"].includes(feature.properties.sprite));
  }
});

test("invalid or incomplete OSM ways are ignored",()=>{
  assert.equal(generateScenery({elements:[source.elements[2]]}).features.length,0);
  assert.throws(()=>generateScenery({}),/Overpass JSON/);
});
