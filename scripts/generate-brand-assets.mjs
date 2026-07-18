/**
 * RemyNest raster asset generator — derives EVERY platform identity asset from the
 * canonical PURPLE fingerprint-heart-bird masters (Strategy 1 unification, 2026-07-18).
 *
 * CANONICAL MASTERS (checked in — never regenerated here):
 *   public/brand/store/app-store-icon-1024.png  composed icon master — a byte-copy of the
 *                                               SHIPPED Build-19 iOS icon (approved warm-glow
 *                                               candidate C; 1024², opaque, no alpha)
 *   public/brand/remynest-mark.png              the transparent mark at native resolution
 *                                               (695×728, mechanically cropped from the
 *                                               operator's approved standalone source)
 *   public/brand/remynest-lockup.png            approved lockup (mark + wordmark + tagline,
 *                                               960×330, transparent)
 *
 * THE RETIRED SAGE PIPELINE IS DELIBERATELY GONE. Do NOT re-point this script at
 * `logo-mark-dark.svg` or any sage master — the sage nest-and-gold-egg icon was the
 * WRONG app identity (operator correction 2026-07-16 + Strategy-1 unification
 * 2026-07-18; see the CLAUDE.md "Canonical iOS APP ICON" note). The sage SVGs under
 * public/brand/ remain only as legacy brand-kit references and MUST NOT feed any
 * generated asset.
 *
 * Outputs (all mechanical derivatives — resize of the composed master, or the mark
 * composited on the same board-sampled field; nothing is redrawn):
 *   app/icon.png                                         512  favicon route (Next auto-wires)
 *   app/apple-icon.png                                   180  apple-touch (opaque)
 *   app/favicon.ico + public/brand/icons/favicon-{16,32,48}.png
 *   public/icon-192.png, public/icon-512.png             PWA purpose:any (true-square)
 *   public/brand/icons/maskable-{192,512}.png            PWA maskable (safe-zone mark on field)
 *   public/brand/store/play-icon-512.png                 Play listing (opaque)
 *   public/brand/store/play-adaptive-foreground-432.png  Android adaptive fg (transparent, safe zone)
 *   public/brand/store/play-adaptive-background-432.png  Android adaptive bg (field only)
 *   android res mipmap-<density>/ic_launcher + ic_launcher_round  48/72/96/144/192
 *   android res mipmap-<density>/ic_launcher_foreground           108/162/216/324/432
 *   app/opengraph-image.png                              1200×630 (lockup on warm sand)
 *
 * Run: node scripts/generate-brand-assets.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname ?? ".", "..");
const at = (p) => resolve(root, p);
const out = (p) => {
  const f = at(p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

const COMPOSED = at("public/brand/store/app-store-icon-1024.png"); // shipped-icon copy
const MARK = at("public/brand/remynest-mark.png"); // transparent mark 695×728
const LOCKUP = at("public/brand/remynest-lockup.png"); // 960×330 transparent

/**
 * The board-sampled icon field, exactly as the approved candidate C composes it:
 * diagonal deep-purple gradient (light from bottom-left) + the ≤14% warm-gold radial
 * lift behind the heart. Parametrised by size so maskable/adaptive fields match the
 * 1024 master's treatment at any canvas.
 */
function fieldSVG(size) {
  const s = (v) => Math.round((v / 1024) * size);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="${size}" x2="${size}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6B428E"/>
      <stop offset="0.55" stop-color="#2E1B60"/>
      <stop offset="1" stop-color="#150A3B"/>
    </linearGradient>
    <radialGradient id="glow" cx="${s(512)}" cy="${s(470)}" r="${s(460)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F3D78A" stop-opacity="0.14"/>
      <stop offset="0.55" stop-color="#B49DE0" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#B49DE0" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>
</svg>`,
  );
}

/** Straight resize of the composed shipped-icon master (opaque, no alpha). */
async function fullIcon(size, file) {
  await sharp(COMPOSED).resize(size, size).removeAlpha().png().toFile(out(file));
  console.log(`✓ ${file} (${size})`);
}

/** As fullIcon but returns the buffer (for .ico assembly). */
async function fullIconBuffer(size) {
  return sharp(COMPOSED).resize(size, size).removeAlpha().png().toBuffer();
}

/** The mark centered on the field at `markScale` of the canvas height (opaque). */
async function safeZoneIcon(size, markScale, file) {
  const markH = Math.round(size * markScale);
  const mark = await sharp(MARK).resize({ height: markH, fit: "inside" }).png().toBuffer();
  const meta = await sharp(mark).metadata();
  await sharp(fieldSVG(size))
    .composite([
      { input: mark, left: Math.round((size - meta.width) / 2), top: Math.round((size - markH) / 2) },
    ])
    .removeAlpha()
    .png()
    .toFile(out(file));
  console.log(`✓ ${file} (${size}, mark ${markScale})`);
}

/** The mark alone on transparency at `markScale` (adaptive foregrounds). */
async function foreground(size, markScale, file) {
  const markH = Math.round(size * markScale);
  const mark = await sharp(MARK).resize({ height: markH, fit: "inside" }).png().toBuffer();
  const meta = await sharp(mark).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: mark, left: Math.round((size - meta.width) / 2), top: Math.round((size - markH) / 2) },
    ])
    .png()
    .toFile(out(file));
  console.log(`✓ ${file} (${size}, fg ${markScale})`);
}

/** Field only (adaptive background). */
async function fieldOnly(size, file) {
  await sharp(fieldSVG(size)).removeAlpha().png().toFile(out(file));
  console.log(`✓ ${file} (${size}, field)`);
}

/** Assemble a modern .ico (embedded PNGs) — no extra dependency. */
function pngsToIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((img, i) => {
    const b = i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b); // width (0 = 256)
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b + 1); // height
    dir.writeUInt16LE(1, b + 4); // color planes
    dir.writeUInt16LE(32, b + 6); // bits per pixel
    dir.writeUInt32LE(img.data.length, b + 8); // bytes in resource
    dir.writeUInt32LE(offset, b + 12); // image offset
    offset += img.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

const ANDROID_RES = "android/app/src/main/res";
// launcher 48dp → mdpi 48 · hdpi 72 · xhdpi 96 · xxhdpi 144 · xxxhdpi 192;
// adaptive foreground canvas 108dp → 108/162/216/324/432.
const DENSITIES = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

// Web
await fullIcon(512, "app/icon.png");
await fullIcon(180, "app/apple-icon.png");
await fullIcon(192, "public/icon-192.png");
await fullIcon(512, "public/icon-512.png");
await safeZoneIcon(192, 0.6, "public/brand/icons/maskable-192.png");
await safeZoneIcon(512, 0.6, "public/brand/icons/maskable-512.png");

// Favicon PNGs + .ico (16/32/48 embedded).
// LEGIBILITY RULING (2026-07-18, rendered A/B evidence): at 16px the full mark
// collapses into texture, so the 16px frame uses a CROP of the same approved mark —
// the outlined gold heart region — composed on the same field (a crop, never a
// redraw). 32/48 keep the full mark, which stays legible.
async function heartCrop16() {
  const heart = await sharp(MARK)
    .extract({ left: 150, top: 90, width: 400, height: 400 })
    .resize(200, 200)
    .png()
    .toBuffer();
  const comp = await sharp(fieldSVG(256))
    .composite([{ input: heart, left: 28, top: 28 }])
    .removeAlpha()
    .png()
    .toBuffer();
  return sharp(comp).resize(16, 16).png().toBuffer();
}
const icoEntries = [];
for (const s of [16, 32, 48]) {
  const data = s === 16 ? await heartCrop16() : await fullIconBuffer(s);
  writeFileSync(out(`public/brand/icons/favicon-${s}.png`), data);
  console.log(`✓ public/brand/icons/favicon-${s}.png (${s}${s === 16 ? ", heart crop" : ""})`);
  icoEntries.push({ size: s, data });
}
writeFileSync(out("app/favicon.ico"), pngsToIco(icoEntries));
console.log("✓ app/favicon.ico (16/32/48 embedded)");

// Store
await fullIcon(512, "public/brand/store/play-icon-512.png");
await foreground(432, 0.56, "public/brand/store/play-adaptive-foreground-432.png");
await fieldOnly(432, "public/brand/store/play-adaptive-background-432.png");

// Android launcher (the adaptive bg COLOUR lives in values/ic_launcher_background.xml)
for (const [density, launcher, fg] of DENSITIES) {
  await fullIcon(launcher, `${ANDROID_RES}/mipmap-${density}/ic_launcher.png`);
  await fullIcon(launcher, `${ANDROID_RES}/mipmap-${density}/ic_launcher_round.png`);
  await foreground(fg, 0.56, `${ANDROID_RES}/mipmap-${density}/ic_launcher_foreground.png`);
}

// OG / social — mechanical composition of two approved assets on warm sand:
// the CANONICAL composed icon (rounded-corner masked, as it appears on device) +
// the WORDMARK REGION cropped from the approved lockup (the lockup's own icon
// portion is a flat variant, so it is deliberately NOT used — the mark on the OG
// card must be the same canonical mark as every other surface). No upscaling:
// the wordmark crop renders at native size; the icon downsamples from 1024.
const ICON_S = 260;
const r = Math.round(ICON_S * 0.2237);
const iconMask = Buffer.from(
  `<svg width="${ICON_S}" height="${ICON_S}"><rect width="${ICON_S}" height="${ICON_S}" rx="${r}" fill="#fff"/></svg>`,
);
const ogIcon = await sharp(COMPOSED)
  .resize(ICON_S, ICON_S)
  .composite([{ input: iconMask, blend: "dest-in" }])
  .png()
  .toBuffer();
const wordmark = await sharp(LOCKUP)
  .extract({ left: 320, top: 0, width: 640, height: 330 })
  .png()
  .toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#F5F1EA" } })
  .composite([
    { input: ogIcon, left: 150, top: Math.round((630 - ICON_S) / 2) },
    { input: wordmark, left: 460, top: Math.round((630 - 330) / 2) },
  ])
  .removeAlpha()
  .png()
  .toFile(out("app/opengraph-image.png"));
console.log("✓ app/opengraph-image.png (1200×630)");

console.log("\nAll assets derived from the canonical purple masters.");
