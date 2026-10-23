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
const metricEdgeDistance=([lng,lat],[west,south,east,north]) =>
  Math.min((lng-west)*106000,(east-lng)*106000,(lat-south)*111320,(north-lat)*111320);

test("park boundary tree points are deterministic, inside mapped polygons and water-free",()=>{
  const first=generateScenery(source,100),second=generateScenery(source,100);
  assert.deepEqual(first,second);
  assert.equal(first.type,"FeatureCollection");
  assert.ok(first.features.length>=4);
  assert.equal(new Set(first.features.map(f=>f.properties.id)).size,first.features.length);
  for(const f of first.features){
    const [lng,lat]=f.geometry.coordinates;
    assert.ok(lng>78.45&&lng<78.455);
    assert.ok(lat>17.4&&lat<17.405);
    assert.ok(!(lng>78.451&&lng<78.454&&lat>17.401&&lat<17.404));
    assert.equal(f.properties.placement,"boundary");
    assert.ok(metricEdgeDistance(f.geometry.coordinates,[78.45,17.4,78.455,17.405])<30,
      "park trees should be near the inside park boundary");
  }
});
test("round-robin placement reaches smaller parks even with a hard sprite budget",()=>{
  const data={elements:[
    {type:"way",id:1,tags:{leisure:"park"},geometry:rectangle(78.45,17.4,78.456,17.406)},
    {type:"way",id:2,tags:{leisure:"park"},geometry:rectangle(78.48,17.42,78.482,17.422)},
    {type:"way",id:3,tags:{landuse:"forest"},geometry:rectangle(78.5,17.45,78.51,17.46)}
  ]};
  const output=generateScenery(data,4);
  assert.equal(output.features.length,4);
  const ids=output.features.map(f=>f.properties.id);
  assert.ok(ids.some(id=>id.startsWith("osm-1-boundary-")));
  assert.ok(ids.some(id=>id.startsWith("osm-2-boundary-")));
  // Prioritize park boundaries before generic forest polygons.
  assert.ok(!ids.some(id=>id.startsWith("osm-3-boundary-")));
});
test("incomplete polygons, invalid data and impossible limits are safe",()=>{
  assert.equal(generateScenery({elements:[source.elements[2]]}).features.length,0);
  assert.equal(generateScenery(source,0).features.length,0);
  assert.throws(()=>generateScenery({}),/Overpass JSON/);
});
