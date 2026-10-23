/**
 * Generate deterministic illustrated greenery along the INSIDE edges of
 * OpenStreetMap park and woodland polygons. No live requests from the app.
 * The icons are decorative, not surveyed individual tree positions.
 *
 * npm run map:scenery
 * npm run map:scenery -- --input overpass.json --output /tmp/trees.geojson
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BOUNDS = { south: 17.15, west: 78.15, north: 17.65, east: 78.85 };
const OVERPASS = process.env.GALLI_OVERPASS_URL || "https://overpass.private.coffee/api/interpreter";
const MAX_TREES = 3200;
const round = value => Number(value.toFixed(7));

function hash(seed) {
  let n = 2166136261;
  for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n || 1;
}
function random(seed) {
  let state = hash(seed);
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
const park = tags => /^(park|garden|nature_reserve)$/.test(tags?.leisure || "");
const green = tags => park(tags)
  || /^(forest|grass|meadow|recreation_ground)$/.test(tags?.landuse || "")
  || tags?.natural === "wood";
const water = tags => tags?.natural === "water" || tags?.waterway === "riverbank";

function ringFor(way) {
  if (way.type !== "way" || !Array.isArray(way.geometry) || way.geometry.length < 4) return null;
  const ring = way.geometry.filter(p => Number.isFinite(p.lon) && Number.isFinite(p.lat))
    .map(p => [p.lon, p.lat]);
  if (ring.length < 4) return null;
  const a = ring[0], b = ring.at(-1);
  if (Math.abs(a[0]-b[0]) > 1e-7 || Math.abs(a[1]-b[1]) > 1e-7) return null;
  return ring;
}
function inside([x,y], ring) {
  let yes = false;
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) yes=!yes;
  }
  return yes;
}
function distances(ring) {
  const lat = ring[0][1], mx=111320*Math.cos(lat*Math.PI/180), my=111320;
  let doubleArea=0, perimeter=0;
  const segments=[];
  for(let i=1;i<ring.length;i++){
    const [ax,ay]=ring[i-1],[bx,by]=ring[i];
    const dx=(bx-ax)*mx, dy=(by-ay)*my;
    const length=Math.hypot(dx,dy);
    if(length>0.01) segments.push({a:[ax,ay],dx,dy,length,start:perimeter});
    perimeter+=length;
    doubleArea += (ax*mx)*(by*my)-(bx*mx)*(ay*my);
  }
  return {area:Math.abs(doubleArea)/2,perimeter,segments,mx,my};
}
function clearance(point,ring,mx,my,minMetres) {
  for(let i=1;i<ring.length;i++){
    const ax=(point[0]-ring[i-1][0])*mx,ay=(point[1]-ring[i-1][1])*my;
    const bx=(ring[i][0]-ring[i-1][0])*mx,by=(ring[i][1]-ring[i-1][1])*my;
    const t=Math.max(0,Math.min(1,(ax*bx+ay*by)/(bx*bx+by*by||1)));
    if(Math.hypot(ax-t*bx,ay-t*by)<minMetres)return false;
  }
  return true;
}
function withinBounds([lng,lat]) {
  return lng>=BOUNDS.west && lng<=BOUNDS.east && lat>=BOUNDS.south && lat<=BOUNDS.north;
}
function valid(point,shape,waterRings) {
  return withinBounds(point) && inside(point,shape.ring)
    && clearance(point,shape.ring,shape.metrics.mx,shape.metrics.my,4)
    && !waterRings.some(ring=>inside(point,ring));
}

/** Try sampled perimeter points, then move 8–20 m inside the mapped polygon.
 * Both normal directions are tried, so OSM ring winding doesn't matter.
 * The sprite's FOOTPRINT can extend across edges at low zoom; the tree's
 * geographic anchor always remains within the green polygon.
 */
function boundaryCandidates(shape, waterRings) {
  const {ring,metrics,id,isPark}=shape,{perimeter,segments,mx,my}=metrics;
  const count=Math.min(isPark?40:12,Math.max(isPark?3:1,Math.round(perimeter/(isPark?75:150))));
  const points=[];
  const shift=(hash(id)%1000)/1000;
  for(let i=0;i<count;i++){
    const distance=((i+0.35+shift*0.30)/count)*perimeter;
    const seg=segments.find(s=>distance>=s.start && distance<s.start+s.length) || segments.at(-1);
    if(!seg)continue;
    const factor=Math.max(0,Math.min(1,(distance-seg.start)/seg.length));
    const edge=[seg.a[0]+seg.dx*factor/mx,seg.a[1]+seg.dy*factor/my];
    const normal=[-seg.dy/seg.length,seg.dx/seg.length];
    let selected;
    for(const metres of [9,14,20]) {
      for(const side of [1,-1]) {
        const point=[edge[0]+normal[0]*side*metres/mx,edge[1]+normal[1]*side*metres/my];
        if(valid(point,shape,waterRings)){selected=point;break;}
      }
      if(selected)break;
    }
    if(selected && !points.some(point=>Math.hypot((point[0]-selected[0])*mx,(point[1]-selected[1])*my)<22))
      points.push(selected);
  }
  // Very small or concave parks may reject edge offsets. Try one verified
  // interior point rather than inventing a location across roads.
  if(points.length===0){
    const r=random(id), west=Math.min(...ring.map(p=>p[0])),east=Math.max(...ring.map(p=>p[0]));
    const south=Math.min(...ring.map(p=>p[1])),north=Math.max(...ring.map(p=>p[1]));
    for(let i=0;i<200;i++){
      const p=[west+r()*(east-west),south+r()*(north-south)];
      if(valid(p,shape,waterRings)){points.push(p);break;}
    }
  }
  return points;
}

export function generateScenery(osm,maxTrees=MAX_TREES) {
  if(!Array.isArray(osm?.elements))throw new Error("Expected an Overpass JSON response with elements.");
  const waters=osm.elements.filter(item=>water(item.tags)).map(ringFor).filter(Boolean);
  const shapes=osm.elements.filter(item=>green(item.tags))
    .map(item=>({id:item.id,ring:ringFor(item),isPark:park(item.tags)}))
    .filter(item=>item.ring)
    .map(item=>({...item,metrics:distances(item.ring)}))
    .filter(item=>item.metrics.area>=1200)
    .sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const priority=[shapes.filter(shape=>shape.isPark),shapes.filter(shape=>!shape.isPark)];
  const features=[],occupied=new Map();
  // Distribute points round-robin so one large polygon cannot exhaust the
  // limit before smaller parks get boundary decoration.
  for(const group of priority){
    const prepared=group.map(shape=>({id:shape.id,points:boundaryCandidates(shape,waters),cursor:0}));
    let active=true;
    while(active && features.length<maxTrees){
      active=false;
      for(const shape of prepared){
        if(features.length>=maxTrees)break;
        if(shape.cursor>=shape.points.length)continue;
        active=true;
        const point=shape.points[shape.cursor++];
        const cellX=Math.round(point[0]*5000),cellY=Math.round(point[1]*5000);
        let close=false;
        for(let dx=-1;dx<=1&&!close;dx++)for(let dy=-1;dy<=1&&!close;dy++){
          const others=occupied.get((cellX+dx)+":"+(cellY+dy))||[];
          if(others.some(q=>Math.hypot((q[0]-point[0])*106000,(q[1]-point[1])*111320)<20))close=true;
        }
        if(close)continue;
        const key=cellX+":"+cellY;
        occupied.set(key,[...(occupied.get(key)||[]),point]);
        features.push({
          type:"Feature",
          geometry:{type:"Point",coordinates:[round(point[0]),round(point[1])]},
          properties:{id:"osm-"+shape.id+"-boundary-"+shape.cursor,placement:"boundary"}
        });
      }
    }
    if(features.length>=maxTrees)break;
  }
  return {type:"FeatureCollection",features};
}
function options(args){
  const get=key=>{const i=args.indexOf(key);return i<0?null:args[i+1];};
  return {input:get("--input"),output:get("--output")||"public/map-data/trees.geojson"};
}
async function fetchOSM(){
  const b=[BOUNDS.south,BOUNDS.west,BOUNDS.north,BOUNDS.east].join(",");
  const query='[out:json][timeout:180];('+
    'way["leisure"~"^(park|garden|nature_reserve)$"]('+b+');'+
    'way["landuse"~"^(forest|grass|meadow|recreation_ground)$"]('+b+');'+
    'way["natural"="wood"]('+b+');'+
    'way["natural"="water"]('+b+');'+
    'way["waterway"="riverbank"]('+b+'););out geom;';
  const response=await fetch(OVERPASS,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded",
      "User-Agent":"AasPaas-Galli-Map-Generator/1.0 (https://github.com/CharanKondaveeti/AasPaas)"},
    body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(190000)
  });
  if(!response.ok)throw new Error("Overpass returned "+response.status);
  return response.json();
}
async function main(){
  const args=options(process.argv.slice(2));
  const data=args.input?JSON.parse(await readFile(resolve(args.input),"utf8")):await fetchOSM();
  const output=generateScenery(data);
  if(!output.features.length)throw new Error("No valid green polygon found; previous data not overwritten.");
  const dest=resolve(args.output);
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,JSON.stringify(output)+"\n","utf8");
  console.log("Generated "+output.features.length+" park-edge trees (© OpenStreetMap contributors)");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
