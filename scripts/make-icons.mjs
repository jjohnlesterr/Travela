// Builds the PWA / app icons from the icon-only Travela logo (public/images/travela.png, transparent).
// The source file is never modified. Run: node scripts/make-icons.mjs
//
//  - icon-192 / icon-512 ("any"): transparent, artwork fills ~88% of the square
//  - icon-maskable-512: sand background, artwork scaled so its farthest pixel from the centre stays inside
//    Android's maskable safe zone (circle of 80% diameter) with a small margin
//  - apple-touch-icon (180): opaque sand background (iOS renders transparency as black), same safe sizing
//  - app/icon.png (64): browser tab favicon, transparent
import sharp from "sharp";
import fs from "node:fs";

const SRC = "public/images/travela.png";
const BG = { r: 0xf5, g: 0xf7, b: 0xf3, alpha: 1 }; // --color-sand
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// Trim transparent borders so the artwork (not the canvas) is what gets centred.
const art = await sharp(SRC).trim({ threshold: 10 }).png().toBuffer();
const { width: aw, height: ah } = await sharp(art).metadata();

// Farthest opaque pixel from the artwork centre, relative to its larger side → used for circular safe zones.
const { data, info } = await sharp(art).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let maxR = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 40) maxR = Math.max(maxR, Math.hypot(x - info.width / 2, y - info.height / 2));
  }
}
const radiusRatio = maxR / Math.max(aw, ah); // ≈ 0.5 for a round mark, up to ≈ 0.66 when a corner is filled

/** Artwork scaled so its larger side is `fill` × px (or so its farthest pixel sits within `safeRadius` × px). */
async function icon(out, px, { fill, safeRadius, background }) {
  const side = Math.round(px * (safeRadius ? Math.min(fill, safeRadius / radiusRatio) : fill));
  const scaled = await sharp(art).resize(side, side, { fit: "contain", background: CLEAR }).toBuffer();
  await sharp({ create: { width: px, height: px, channels: 4, background } })
    .composite([{ input: scaled, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  return side;
}

fs.mkdirSync("public/icons", { recursive: true });
await icon("public/icons/icon-192.png", 192, { fill: 0.88, background: CLEAR });
await icon("public/icons/icon-512.png", 512, { fill: 0.88, background: CLEAR });
const m = await icon("public/icons/icon-maskable-512.png", 512, { fill: 0.8, safeRadius: 0.38, background: BG });
const a = await icon("public/icons/apple-touch-icon.png", 180, { fill: 0.84, safeRadius: 0.44, background: BG });
await icon("app/icon.png", 64, { fill: 0.94, background: CLEAR });
console.log(`artwork ${aw}x${ah}, radius ratio ${radiusRatio.toFixed(3)}, maskable art ${m}px/512, apple art ${a}px/180`);
