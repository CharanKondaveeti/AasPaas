import type { DiscoveryGroup } from "@/lib/types";

/**
 * Small vector-only symbol for distinctive non-food discoveries and dishes
 * without a matching illustration. One GPU symbol + name pill, no DOM lag.
 * Purple diamonds appear only on curator-verified Hidden Gems.
 */
export function drawDiscoveryMarker(
  name: string,
  group: DiscoveryGroup,
  verifiedGem: boolean,
): ImageData {
  const scale = 3, width = 230, height = 138;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to draw discovery map marker");
  ctx.scale(scale, scale);
  const color = verifiedGem ? "#8039CA" :
    group === "specialty_shops" ? "#C17A35" :
      group === "food" ? "#E98432" : "#238B76";

  ctx.save();
  ctx.shadowColor = "#163e3629";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#FFFEFB";
  ctx.beginPath();
  ctx.roundRect(13, 88, width - 26, 39, 19.5);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#dfe8df";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(13, 88, width - 26, 39, 19.5);
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = "#244b3c2c";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(width / 2, 50, 39, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(width / 2, 50, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const x = width / 2, y = 50;
  if (verifiedGem) {
    // Diamond gemstone, not a misleading crown or numerical ranking.
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 5); ctx.lineTo(x - 11, y - 16);
    ctx.lineTo(x + 11, y - 16); ctx.lineTo(x + 20, y - 5);
    ctx.lineTo(x, y + 19); ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 5); ctx.lineTo(x + 20, y - 5);
    ctx.moveTo(x - 11, y - 16); ctx.lineTo(x - 5, y - 5);
    ctx.lineTo(x, y + 19); ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x + 11, y - 16); ctx.stroke();
  } else if (group === "specialty_shops") {
    ctx.beginPath();
    ctx.rect(x - 15, y - 6, 30, 23); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 6, 9, Math.PI, Math.PI * 2); ctx.stroke();
  } else if (group === "food") {
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 23, y + 15); ctx.lineTo(x - 5, y - 12);
    ctx.lineTo(x + 4, y); ctx.lineTo(x + 12, y - 11);
    ctx.lineTo(x + 24, y + 15); ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 15, y - 17, 4, 0, Math.PI * 2); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  }

  ctx.fillStyle = "#18372C";
  ctx.font = "700 14px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const short = name.trim().split(/\s+/).slice(0, 3).join(" ") || "Local discovery";
  let text = short;
  while (ctx.measureText(text).width > 174 && text.length > 2)
    text = text.slice(0, -2).trimEnd() + "…";
  ctx.fillText(text, x, 108);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
