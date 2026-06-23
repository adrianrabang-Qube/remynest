/**
 * RemyNest raster asset generator — produces all PNG icon assets from the SVG
 * masters in public/brand/. The coding environment has no `sharp`, so this is the
 * operator step that closes the raster launch-blockers.
 *
 *   npm i -D sharp
 *   node scripts/generate-brand-assets.mjs
 *
 * Outputs (all derived from public/brand/logo-mark-dark.svg = sand arcs + gold egg
 * on a transparent ground, composited onto the brand sage):
 *   public/icon-192.png, public/icon-512.png            (true-square PWA, replaces the broken 1536x1024 dups)
 *   public/brand/icons/maskable-192.png, maskable-512.png (PWA maskable, safe-zone padded)
 *   public/brand/store/app-store-icon-1024.png          (iOS App Store — opaque, NOT pre-rounded; iOS masks)
 *   public/brand/store/play-icon-512.png                (Play full)
 *   public/brand/store/play-adaptive-foreground-432.png (transparent; mark in inner 66%)
 *   public/brand/store/play-adaptive-background-432.png (solid sage)
 *   public/brand/icons/favicon-16/32/48.png             (favicon PNGs)
 *   app/favicon.ico                                     (assembled from the 16/32/48 PNGs)
 *
 * After running: drop the iOS 1024 into ios AppIcon, run `npx @capacitor/assets generate`
 * (or set in Xcode/Android Studio), and `npx cap sync`. Delete the old non-square
 * public/{favicon.png,logo-icon.png} dups.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const root = resolve(import.meta.dirname ?? ".", "..");
const brand = (p) => resolve(root, "public/brand", p);
const out = (p) => {
  const f = resolve(root, p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

const SAGE = { r: 0x4f, g: 0x6b, b: 0x5b, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const MARK = readFileSync(brand("logo-mark-dark.svg")); // sand arcs + gold egg, transparent

/** Compose the mark centered in a `size` square → PNG buffer (bg SAGE for app icons,
 *  TRANSPARENT for adaptive foregrounds). */
async function compose(size, { bg = SAGE, scale = 0.72 } = {}) {
  const m = Math.round(size * scale);
  const mark = await sharp(MARK, { density: 512 })
    .resize(m, m, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

async function icon(size, file, opts = {}) {
  writeFileSync(out(file), await compose(size, opts));
  console.log("✓", file, `${size}²`);
}

/** Assemble a modern .ico (embedded PNGs) from rendered favicon buffers — no extra dep.
 *  images: [{ size, data: Buffer }]. */
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

async function solid(size, file, bg) {
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .png()
    .toFile(out(file));
  console.log("✓", file, `${size}² (solid)`);
}

await icon(192, "public/icon-192.png");
await icon(512, "public/icon-512.png");
await icon(192, "public/brand/icons/maskable-192.png", { scale: 0.6 });
await icon(512, "public/brand/icons/maskable-512.png", { scale: 0.6 });
await icon(1024, "public/brand/store/app-store-icon-1024.png");
await icon(512, "public/brand/store/play-icon-512.png");
await icon(432, "public/brand/store/play-adaptive-foreground-432.png", { bg: TRANSPARENT, scale: 0.62 });
await solid(432, "public/brand/store/play-adaptive-background-432.png", SAGE);
// Favicon PNGs + favicon.ico (16/32/48 embedded — modern ICO, no extra dependency).
const icoEntries = [];
for (const s of [16, 32, 48]) {
  const buf = await compose(s, { scale: 0.78 });
  writeFileSync(out(`public/brand/icons/favicon-${s}.png`), buf);
  console.log("✓", `public/brand/icons/favicon-${s}.png`, `${s}²`);
  icoEntries.push({ size: s, data: buf });
}
writeFileSync(out("app/favicon.ico"), pngsToIco(icoEntries));
console.log("✓", "app/favicon.ico", "(16/32/48 embedded)");

console.log("\nDone. Next: wire native iOS/Android icons via @capacitor/assets + cap sync; delete the old non-square public/{favicon,logo-icon}.png dups.");
