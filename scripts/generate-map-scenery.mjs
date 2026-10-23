/**
 * Generate stable, geographic decorative tree points from OpenStreetMap ways.
 * Run manually when park/green-space source data changes, not during deploy.
 * This uses OSM way polygons (relations and coastline are not included).
 * Trees are illustrations, NOT surveyed individual trees.
 *
 * npm run map:scenery
 * npm run map:scenery -- --input tests/fixtures/osm-greenspace.json --output /tmp/galli-trees.geojson
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BOUNDS = { south: 17.15, west: 78.15, north: 17.65, east: 78.85 };
const OVERPASS = "https://overpass.kumi.systems/api/interpreter";
const SPRITES = ["tree-sprite-a", "tree-sprite-b", "garden-sprite"];
const MAX_TREES = 1600;
const round = value => Number(value.toFixed(7));

function hash(seed) {
  let n = 2166136261;
  for (const character of String(seed)) n = Math.imul(n ^ character.charCodeAt(0), 16777619) >>> 0;
  return n || 1;
}
function rng(seed) {
  let state = hash(seed);
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function green(tags = {}) {
  return /^(park|garden|nature_reserve)$/.test(tags.leisure || "")
    || /^(forest|grass|meadow|recreation_ground)$/.test(tags.landuse || "")
    || tags.natural === "wood";
}
function water(tags = {}) {
  return tags.natural === "water" || tags.waterway === "riverbank";
}
function ringFor(way) {
  if (way.type !== "way" || !Array.isArray(way.geometry) || way.geometry.length < 4) return null;
  const ring = way.geometry
    .filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat))
    .map(p => [p.lon, p.lat]);
  if (ring.length < 4) return null;
  const a = ring[0], b = ring.at(-1);
  // Incomplete ways cannot be treated as polygons.
  if (Math.abs(a[0] - b[0]) > 1e-7 || Math.abs(a[1] - b[1]) > 1e-7) return null;
  return ring;
}
function inside([x, y], ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])
      result = !result;
  }
  return result;
}
function metrics(ring) {
  const lat0 = ring[0][1], lng0 = ring[0][0];
  const mx = 111320 * Math.cos(lat0 * Math.PI / 180), my = 111320;
  const points = ring.map(([lng,lat]) => [(lng - lng0) * mx, (lat - lat0) * my]);
  let twiceArea = 0;
  for (let i = 0; i < points.length - 1; i++) {
    twiceArea += points[i][0]*points[i+1][1] - points[i+1][0]*points[i][1];
  }
  return { area: Math.abs(twiceArea)/2, mx, my };
}
function farFromEdges(point, ring, mx, my, minMetres) {
  for (let i = 1; i < ring.length; i++) {
    const ax = (point[0] - ring[i-1][0])*mx, ay=(point[1]-ring[i-1][1])*my;
    const bx = (ring[i][0]-ring[i-1][0])*mx, by=(ring[i][1]-ring[i-1][1])*my;
    const t = Math.max(0,Math.min(1,(ax*bx+ay*by)/(bx*bx+by*by || 1)));
    if (Math.hypot(ax-t*bx,ay-t*by) < minMetres) return false;
  }
  return true;
}
export function generateScenery(osm, maxTrees=MAX_TREES) {
  if (!Array.isArray(osm?.elements)) throw new Error("Expected an Overpass JSON response with elements.");
  const waterRings = osm.elements.filter(x => water(x.tags)).map(ringFor).filter(Boolean);
  const greens = osm.elements
    .filter(x => green(x.tags))
    .map(x => ({ id: x.id, ring: ringFor(x) }))
    .filter(x => x.ring && metrics(x.ring).area >= 1800)
    .sort((a,b) => String(a.id).localeCompare(String(b.id)));
  const features = [], occupied = new Set();
  for (const shape of greens) {
    if (features.length >= maxTrees) break;
    const { ring, id } = shape;
    const { area, mx, my } = metrics(ring);
    const target = Math.min(40, Math.max(2, Math.round(area / 2600)));
    const west=Math.min(...ring.map(p=>p[0])), east=Math.max(...ring.map(p=>p[0]));
    const south=Math.min(...ring.map(p=>p[1])), north=Math.max(...ring.map(p=>p[1]));
    const random = rng(id), chosen = [];
    for (let attempt=0; attempt < target*110 && chosen.length < target && features.length < maxTrees; attempt++) {
      const lng=west+random()*(east-west), lat=south+random()*(north-south), point=[lng,lat];
      if (lng<BOUNDS.west||lng>BOUNDS.east||lat<BOUNDS.south||lat>BOUNDS.north) continue;
      if (!inside(point,ring)||!farFromEdges(point,ring,mx,my,6)) continue;
      if (waterRings.some(w=>inside(point,w))) continue;
      if (chosen.some(p=>Math.hypot((p[0]-lng)*mx,(p[1]-lat)*my)<24)) continue;
      const cell = [Math.round(lng*15000),Math.round(lat*15000)].join(":");
      if(occupied.has(cell)) continue;
      occupied.add(cell);
      chosen.push(point);
      features.push({
        type:"Feature",
        geometry:{type:"Point",coordinates:[round(lng),round(lat)]},
        properties:{id:"osm-"+id+"-"+chosen.length,sprite:SPRITES[(hash(id)+chosen.length)%SPRITES.length]}
      });
    }
  }
  return {type:"FeatureCollection",features};
}
function options(args) {
  const get=(key)=>{const at=args.indexOf(key);return at<0?null:args[at+1];};
  return {input:get("--input"),output:get("--output")||"public/map-data/trees.geojson"};
}
async function fetchOSM(){
  const b=[BOUNDS.south,BOUNDS.west,BOUNDS.north,BOUNDS.east].join(",");
  const query = '[out:json][timeout:180];(' +
    'way["leisure"~"^(park|garden|nature_reserve)$"]('+b+');' +
    'way["landuse"~"^(forest|grass|meadow|recreation_ground)$"]('+b+');' +
    'way["natural"="wood"]('+b+');' +
    'way["natural"="water"]('+b+');' +
    'way["waterway"="riverbank"]('+b+'););out geom;';
  const response=await fetch(OVERPASS,{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(190000)
  });
  if(!response.ok) throw new Error("Overpass returned "+response.status);
  return response.json();
}
async function main() {
  const args=options(process.argv.slice(2));
  const osm=args.input?JSON.parse(await readFile(resolve(args.input),"utf8")):await fetchOSM();
  const output=generateScenery(osm);
  if(!output.features.length) throw new Error("No valid geographic green areas found; existing artwork was not overwritten.");
  const path=resolve(args.output);
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,JSON.stringify(output)+"\n","utf8");
  console.log("Generated "+output.features.length+" decorative trees in "+path+" (© OpenStreetMap contributors)");
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
