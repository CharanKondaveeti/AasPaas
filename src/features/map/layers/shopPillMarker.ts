/**
 * Draws the reference-style miniature food marker as ONE MapLibre image:
 * food illustration, white rounded shop-name pill, and orange side dots.
 *
 * One symbol avoids independently colliding text/background/icon layers.
 * It moves smoothly inside WebGL while the map pans and zooms.
 */
const SCALE = 3;
const ART_SIZE = 104;
const PILL_TOP = 88;
const MAX_TEXT_WIDTH = 187;
const MIN_PILL_WIDTH = 116;
const FONT = '700 13px Arial, Helvetica, sans-serif';

function truncateToWidth(
  text: string,
  width: (s: string) => number,
): string {
  if (width(text) <= MAX_TEXT_WIDTH) return text;
  let trimmed = text;
  while (trimmed.length && width(trimmed + "…") > MAX_TEXT_WIDTH)
    trimmed = trimmed.slice(0, -1);
  return trimmed.trimEnd() + "…";
}

/** Keep small names on one line; give longer names up to two readable lines. */
export function shopNameLines(
  name: string,
  width: (s: string) => number,
): string[] {
  const value = name.replace(/\s+/g, " ").trim() || "Food stop";
  if (width(value) <= MAX_TEXT_WIDTH) return [value];

  const words = value.split(" ");
  let first = "";
  let count = 0;
  for (const word of words) {
    const candidate = first ? first + " " + word : word;
    if (width(candidate) > MAX_TEXT_WIDTH) break;
    first = candidate;
    count++;
  }
  if (count === 0) return [truncateToWidth(value, width)];
  const rest = words.slice(count).join(" ");
  return rest
    ? [first, truncateToWidth(rest, width)]
    : [first];
}

/** Stable sprite names for shops, including after an edited shop name. */
export function shopMarkerId(id: string, name: string, food: string): string {
  let hash = 2166136261;
  const token = name + "|" + food;
  for (let i = 0; i < token.length; i++)
    hash = Math.imul(hash ^ token.charCodeAt(i), 16777619) >>> 0;
  return "shop-pill-" + id + "-" + hash.toString(16);
}

function roundedPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
) {
  const radius = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawShopMarker(art: HTMLImageElement, name: string): ImageData {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) throw new Error("Unable to draw food map markers");
  measureCtx.font = FONT;
  const shortName = name.trim().split(/\s+/).slice(0, 2).join(" ") || "Food stop";
  const lines = shopNameLines(shortName, (text) => measureCtx.measureText(text).width);
  const measured = Math.max(...lines.map(line => measureCtx.measureText(line).width));
  const pillWidth = Math.max(MIN_PILL_WIDTH, Math.ceil(measured + 34));
  const pillHeight = lines.length === 1 ? 36 : 50;
  const width = pillWidth + 46; // Room for two separate orange side dots
  const height = PILL_TOP + pillHeight + 8;
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to draw food map markers");
  ctx.scale(SCALE, SCALE);

  // Crop the illustration first, then paint it on top of the name capsule.
  // High-DPI composite: keep the artwork crisp and overlap the white pill
  // into the top edge of the name pill so there is no floating gap.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Crop transparent padding supplied by the generated food illustration.
  // Otherwise the dish itself looks tiny and floats above the name pill.
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = art.naturalWidth || art.width;
  cropCanvas.height = art.naturalHeight || art.height;
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
  let crop = { x: 0, y: 0, w: cropCanvas.width, h: cropCanvas.height };
  if (cropCtx) {
    cropCtx.drawImage(art, 0, 0);
    const pixels = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height).data;
    let left = cropCanvas.width, top = cropCanvas.height, right = -1, bottom = -1;
    for (let y = 0; y < cropCanvas.height; y++) {
      for (let x = 0; x < cropCanvas.width; x++) {
        if (pixels[(y * cropCanvas.width + x) * 4 + 3] < 72) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right >= left && bottom >= top)
      crop = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  }
  const left = (width - pillWidth) / 2;
  const middleY = PILL_TOP + pillHeight / 2;

  // Reference: two bright orange dots on either side of the white capsule.
  ctx.fillStyle = "#FA8123";
  for (const x of [left - 12, left + pillWidth + 12]) {
    ctx.beginPath();
    ctx.arc(x, middleY, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = "rgba(24, 39, 34, 0.20)";
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#FFFFFF";
  roundedPill(ctx, left, PILL_TOP, pillWidth, pillHeight);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(45, 59, 52, 0.08)";
  ctx.lineWidth = 0.8;
  roundedPill(ctx, left, PILL_TOP, pillWidth, pillHeight);
  ctx.stroke();

  // Paint the trimmed dish AFTER the pill, so the dish rests on its top
  // edge rather than disappearing behind the white background. Its lower
  // pixels intentionally overlap the pill by 16px.
  const imageRatio = crop.w / crop.h;
  const drawnWidth = Math.min(ART_SIZE, ART_SIZE * imageRatio);
  const drawnHeight = Math.min(ART_SIZE, ART_SIZE / imageRatio);
  ctx.drawImage(art, crop.x, crop.y, crop.w, crop.h,
    (width - drawnWidth) / 2, PILL_TOP - drawnHeight + 8,
    drawnWidth, drawnHeight);



  ctx.font = FONT;
  ctx.fillStyle = "#17211D";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (lines.length === 1)
    ctx.fillText(lines[0], width / 2, middleY + 1);
  else {
    ctx.fillText(lines[0], width / 2, middleY - 8);
    ctx.fillText(lines[1], width / 2, middleY + 9);
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
