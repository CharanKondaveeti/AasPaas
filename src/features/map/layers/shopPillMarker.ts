/** AasPaas illustrated food markers: one MapLibre GPU image per shop.
 * The dish sits above a compact white card. Shop name and famous dish stay
 * together while panning; an orange dot anchors the place to the map.
 */
const SCALE=3;
const ART_SIZE=77;
const PILL_TOP=63;
const MAX_TEXT_WIDTH=184;
const MIN_PILL_WIDTH=136;
const FONT='700 15px Arial, Helvetica, sans-serif';
const DISH_FONT='500 12px Arial, Helvetica, sans-serif';
type Crop={x:number;y:number;w:number;h:number};
const cropCache=new WeakMap<HTMLImageElement,Crop>();
function truncateToWidth(text:string,width:(s:string)=>number,max=MAX_TEXT_WIDTH):string{
 if(width(text)<=max)return text;
 let trimmed=text;
 while(trimmed.length&&width(trimmed+"…")>max)trimmed=trimmed.slice(0,-1);
 return trimmed.trimEnd()+"…";
}
export function shopNameLines(name:string,width:(s:string)=>number):string[]{
 const value=name.replace(/\s+/g," ").trim()||"Food stop";
 if(width(value)<=MAX_TEXT_WIDTH)return [value];
 const words=value.split(" ");
 let first="",count=0;
 for(const word of words){
  const candidate=first?first+" "+word:word;
  if(width(candidate)>MAX_TEXT_WIDTH)break;
  first=candidate;count++;
 }
 if(count===0)return [truncateToWidth(value,width)];
 const rest=words.slice(count).join(" ");
 return rest?[first,truncateToWidth(rest,width)]:[first];
}
/** Use verified category or a short supplied famous-for value, never invent a dish. */
export function markerDishLabel(dish:string|null,famousFor:string):string{
 const description=famousFor.trim().replace(/^(known|famous) for\s*:?\s*/i,"");
 if(description&&description.length<=34&&!/[.!?]/.test(description))return description;
 if(dish==="Tea"&&/irani chai/i.test(famousFor))return "Irani Chai";
 return dish||"Local favourite";
}
export function shopMarkerId(id:string,name:string,food:string):string{
 let hash=2166136261;
 const token=name+"|"+food;
 for(let i=0;i<token.length;i++)hash=Math.imul(hash^token.charCodeAt(i),16777619)>>>0;
 return "shop-pill-"+id+"-"+hash.toString(16);
}
function roundedPill(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 const radius=Math.min(r,h/2,w/2);
 ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);
 ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
 ctx.lineTo(x+w,y+h-radius);
 ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
 ctx.lineTo(x+radius,y+h);
 ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
 ctx.lineTo(x,y+radius);ctx.quadraticCurveTo(x,y,x+radius,y);
 ctx.closePath();
}
function croppedArt(art:HTMLImageElement):Crop{
 const cached=cropCache.get(art);if(cached)return cached;
 const canvas=document.createElement("canvas");
 canvas.width=art.naturalWidth||art.width;
 canvas.height=art.naturalHeight||art.height;
 let crop:Crop={x:0,y:0,w:canvas.width,h:canvas.height};
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 if(ctx&&canvas.width&&canvas.height){
  ctx.drawImage(art,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   if(pixels[(y*canvas.width+x)*4+3]<72)continue;
   left=Math.min(left,x);top=Math.min(top,y);
   right=Math.max(right,x);bottom=Math.max(bottom,y);
  }
  if(right>=left&&bottom>=top)crop={x:left,y:top,w:right-left+1,h:bottom-top+1};
 }
 cropCache.set(art,crop);return crop;
}
function newCanvas(w:number,h:number){
 const canvas=document.createElement("canvas");canvas.width=w*SCALE;canvas.height=h*SCALE;
 const ctx=canvas.getContext("2d");
 if(!ctx)throw new Error("Unable to draw food map marker");
 ctx.scale(SCALE,SCALE);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
 return {ctx,canvas};
}
function foodArt(ctx:CanvasRenderingContext2D,art:HTMLImageElement,x:number,y:number,size:number){
 const c=croppedArt(art),ratio=c.w/c.h;
 const w=ratio>=1?size:size*ratio,h=ratio>=1?size/ratio:size;
 ctx.drawImage(art,c.x,c.y,c.w,c.h,x-w/2,y-h/2,w,h);
}
export type ShopMarkerOptions={selected?:boolean;verifiedGem?:boolean};
export function drawShopMarker(
 art:HTMLImageElement,name:string,dish:string,options:ShopMarkerOptions={}
):ImageData{
 const {selected=false,verifiedGem=false}=options;
 const measure=document.createElement("canvas").getContext("2d");
 if(!measure)throw new Error("Unable to measure marker");
 const shop=name.replace(/\s+/g," ").trim()||"Food stop";
 const signature=dish.replace(/\s+/g," ").trim()||"Local favourite";
 measure.font=FONT;
 const title=truncateToWidth(shop,text=>measure.measureText(text).width);
 const titleWidth=measure.measureText(title).width;
 measure.font=DISH_FONT;
 const subtitle=truncateToWidth(signature,text=>measure.measureText(text).width,MAX_TEXT_WIDTH-7);
 const subtitleWidth=measure.measureText(subtitle).width;
 const pillWidth=Math.max(MIN_PILL_WIDTH,Math.ceil(Math.max(titleWidth,subtitleWidth)+30));
 const width=pillWidth+32,pillHeight=55,height=146;
 const {ctx,canvas}=newCanvas(width,height);
 const left=(width-pillWidth)/2;
 ctx.save();ctx.shadowColor=selected?"rgba(115,72,25,.31)":"rgba(30,44,40,.2)";
 ctx.shadowBlur=selected?15:11;ctx.shadowOffsetY=4;ctx.fillStyle="#FFFFFF";
 roundedPill(ctx,left,PILL_TOP,pillWidth,pillHeight,21);ctx.fill();ctx.restore();
 ctx.strokeStyle=selected?"#F28A33":"rgba(46,66,55,.12)";
 ctx.lineWidth=selected?2.5:1;
 roundedPill(ctx,left,PILL_TOP,pillWidth,pillHeight,21);ctx.stroke();
 // Icon intentionally overlaps the top of the rounded white card.
 foodArt(ctx,art,width/2,PILL_TOP-ART_SIZE/2+11,ART_SIZE);
 ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.font=FONT;ctx.fillStyle="#17211D";
 ctx.fillText(title,width/2,PILL_TOP+27);
 ctx.font=DISH_FONT;ctx.fillStyle="#657B8C";
 ctx.fillText(subtitle,width/2,PILL_TOP+44);
 // Single small orange map anchor below the pill.
 const middleY=PILL_TOP+pillHeight+12;
 ctx.fillStyle="#FFFFFF";ctx.beginPath();ctx.arc(width/2,middleY,8.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#FA8123";ctx.beginPath();ctx.arc(width/2,middleY,5.7,0,Math.PI*2);ctx.fill();
 if(verifiedGem){
  const gx=width/2+ART_SIZE/2-3,gy=25;
  ctx.fillStyle="#8039CA";ctx.beginPath();ctx.arc(gx,gy,11,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#FFFFFF";ctx.lineWidth=1.5;ctx.beginPath();
  ctx.moveTo(gx,gy-6);ctx.lineTo(gx+6,gy);ctx.lineTo(gx,gy+6);
  ctx.lineTo(gx-6,gy);ctx.closePath();ctx.stroke();
 }
 return ctx.getImageData(0,0,canvas.width,canvas.height);
}
/** Shared lightweight icon-only sprite at overview zoom. */
export function drawCompactShopMarker(art:HTMLImageElement):ImageData{
 const width=86,height=102,{ctx,canvas}=newCanvas(width,height);
 ctx.save();ctx.shadowColor="rgba(30,44,40,.2)";
 ctx.shadowBlur=8;ctx.shadowOffsetY=3;ctx.fillStyle="#FFFFFF";
 ctx.beginPath();ctx.arc(width/2,42,38,0,Math.PI*2);ctx.fill();ctx.restore();
 foodArt(ctx,art,width/2,42,66);
 ctx.fillStyle="#FFFFFF";ctx.beginPath();ctx.arc(width/2,88,8.5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#FA8123";ctx.beginPath();ctx.arc(width/2,88,5.7,0,Math.PI*2);ctx.fill();
 return ctx.getImageData(0,0,canvas.width,canvas.height);
}
