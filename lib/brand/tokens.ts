/**
 * RemyNest brand tokens — the single source of truth for brand color, type, and
 * geometry. Imported by the Next.js asset routes (app/icon.tsx, app/apple-icon.tsx,
 * app/opengraph-image.tsx) and mirrored by tailwind.config.js + app/globals.css.
 *
 * UNIFIED REMY BIRD IDENTITY (authoritative 2026-06-23 — supersedes the prior
 * two-tier sage-product/purple-companion doctrine; see CLAUDE.md / brand-guidelines):
 *   IDENTITY LAYER = purple / gold / navy → logo, app icon, favicon, OG, splash,
 *     login/signup, marketing — the single Remy Bird brand (mascot = companion = mark).
 *   APPLICATION CHROME = sage / sand / charcoal (BRAND below) → the in-app UI is
 *     UNCHANGED. Do NOT recolor the app; the gold bridge lets purple identity coexist
 *     with sage chrome (the purple companion sprite already sits in sage chrome).
 */

// ---- Product/brand primitives (verbatim from tailwind.config.js) ------------
export const BRAND = {
  sage: "#4F6B5B", // Forest Sage — primary
  sageDeep: "#3E5648",
  sageSoft: "#8FAE8A", // Soft Moss — success / gentle accent
  sand: "#F5F1EA", // Warm Sand — background
  sandDeep: "#E7E0D3", // hairlines / quiet fills
  gold: "#C9A86A", // Soft Gold — accent (FILLS/GRAPHICS only, fails as text)
  goldSoft: "#E3D1A9",
  goldInk: "#7A5E22", // NEW text-grade gold for links/accent-text (AA on light)
  charcoal: "#2F3E34", // text
  charcoalSoft: "#54655B", // secondary text
  charcoalMuted: "#7C887F", // tertiary — decorative ≥18px ONLY (fails as body)
  white: "#FFFFFF",
} as const;

// ---- Unified Remy Bird IDENTITY (logo / icon / favicon / OG / splash / auth) ----
// First-class identity tier (purple + gold + navy). Read by the asset render routes.
export const IDENTITY = {
  purpleLight: "#8A6BD0", // bird ground (gradient top) — matches the companion sprite
  purpleDeep: "#5B3E8E", // bird ground (gradient bottom)
  bird: "#5B3E8E", // bird body on LIGHT surfaces
  birdWing: "#8A6BD0",
  birdCream: "#F3E7C8", // bird body on PURPLE grounds
  gold: "#C9A86A", // nest rings / wordmark "Nest" / accents
  pendant: "#E3A24A", // beak + heart highlight
  cream: "#ECE5D8", // nest rings / wordmark on dark grounds
  navy: "#2A2350", // wordmark "Remy"
} as const;

// WCAG: navy/sand ~12:1 (AA). Gold #C9A86A is a large-graphic/logo treatment only
// (fails as body text — use goldInk for accent TEXT); the bird-on-purple icon is a
// graphic, so gold is permitted there.

// ---- Companion/Remy character palette (the validated in-app sprite — unchanged) -
// Kept for the existing avatar/chat surfaces; the sprite (public/remy/remy-blueprint.png)
// is FROZEN — do not recolor it.
export const REMY = {
  purpleLight: "#8A6BD0",
  purpleDeep: "#5B3E8E",
  pendant: "#E3A24A",
} as const;

// ---- Dark theme (warm charcoal-green — NOT black/blue) -----------------------
export const DARK = {
  bg: "#15201A",
  surface: "#1E2A23",
  surface2: "#26332B",
  text: "#ECE5D8",
  textSoft: "#C2C9BE",
  textMuted: "#94A096",
  primary: "#8FAE8A", // sage-light (takes dark ink)
  accent: "#DBC089", // gold-light (takes dark ink)
  ink: "#15201A", // on-primary / on-accent
  border: "#33423A",
  borderStrong: "#6E7E72",
} as const;

// ---- Type + geometry --------------------------------------------------------
export const FONT = {
  sans: "Inter", // body / UI
  serif: "Fraunces", // display / headings / memory titles
} as const;

export const RADIUS = { lg: "1rem", "4xl": "2rem" } as const;

// ---- Verified WCAG pairings (sRGB, AA = 4.5:1 text / 3:1 large·UI) -----------
// PASS: charcoal/sand 10:1 · charcoal-soft/sand 5.5:1 · sage/sand 5.2:1 ·
//   white/sage 5.86:1 · gold-ink/sand 5.4:1 · charcoal/gold 5.0:1.
// FAIL (never as text): gold/sand 2.0:1 · charcoal-muted/sand 3.3:1 (≥18px only) ·
//   white/gold 2.26:1 (gold buttons take charcoal ink).
