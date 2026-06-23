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
 *   public/brand/icons/favicon-16/32/48.png             (favicon PNGs; .ico via a png-to-ico step)
 *
 * After running: drop the iOS 1024 into ios AppIcon, run `npx @capacitor/assets generate`
 * (or set in Xcode/Android Studio), and `npx cap sync`. Delete the old non-square
 * public/{favicon.png,logo-icon.png} dups.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
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

/** Render the mark centered in a `size` square; `bg` SAGE for app icons, TRANSPARENT for foregrounds. */
async function icon(size, file, { bg = SAGE, scale = 0.72 } = {}) {
  const m = Math.round(size * scale);
  const mark = await sharp(MARK, { density: 512 })
    .resize(m, m, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(out(file));
  console.log("✓", file, `${size}²`);
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
for (const s of [16, 32, 48]) await icon(s, `public/brand/icons/favicon-${s}.png`, { scale: 0.78 });

console.log("\nDone. Next: png-to-ico for favicon.ico, wire native icons via @capacitor/assets, cap sync, delete the old non-square dups.");
