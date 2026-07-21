# RemyNest Brand Guidelines

*Authoritative source of truth for the RemyNest brand. Tokens live in
`lib/brand/tokens.ts` + `tailwind.config.js` + `app/globals.css`; logo files in
`public/brand/`.*

> **PURPLE-PRIMARY UPDATE (authoritative, 2026-07-21 — operator decision; supersedes
> sage-as-primary throughout this document):** Deep Violet **`#5B3E8E`** (`primary`,
> with `primary-deep #3A2266` for hover/pressed and `primary-soft #8A6BD0` for
> washes/borders only — not text-grade) is now the **app-wide PRIMARY** for all
> interactive UI: buttons, links, chips, active nav states, text selection, and
> keyboard **focus rings (violet — never gold, no longer sage)**. This unifies the
> product with the purple identity (app icon, marketing site, Remy Design Bible).
> **Forest Sage + Soft Moss are demoted to success/nature STATUS accents only**
> (e.g. a completed-reminder chip, a "saved" confirmation) — never interactive
> primaries. The canvas is unchanged: Warm Sand background, white cards, Deep
> Charcoal text, Soft Gold keepsake accents (`gold-ink` rules unchanged). Where this
> document says "sage" for an interactive element, read `primary` violet.

## 1. Essence
RemyNest is a calm, private home for a family's memories and the gentle care that
surrounds them. The **nest** is our central metaphor — a warm, hand-built,
protective place that keeps what matters safe across generations. Our world is
deliberately warm and natural, **never clinical** (intentionally NOT healthcare
blue): Forest Sage grounds us in trust, nature, and care; Warm Sand gives a soft,
unhurried, accessible backdrop easy on aging eyes; Soft Gold is the keepsake accent
— legacy worth preserving and premium craft. Fraunces lends the warmth of a
hand-written family journal; Inter keeps it modern and effortless. Remy, our
companion songbird, is the friendly family guide who helps each generation tend the
nest.

## 2. Identity architecture (authoritative — Strategy-1 unification, 2026-07-18)
**ONE customer-facing identity: the purple fingerprint-heart-bird mark** (deep-purple
field `#150A3B→#6B428E`, lavender/gold fingerprint rings, gold outline heart, small
gold bird — per the approved `REMYNEST DESIGN LOGO.PNG` board). It is the SAME mark,
composition, palette, and source master on **every** identity surface: iOS app icon,
Android launcher, App Store, Google Play, PWA icons, favicon, apple-touch, OG/social,
and the auth/onboarding lockup. Platform dimensions/masks/safe-zones may vary; the
identity may not.

Two supporting palettes coexist UNDER that single identity:
- **UI chrome = sage · sand · gold** (`#4F6B5B` / `#F5F1EA` / `#C9A86A`) → the app's
  interior design system (Polaris tokens, headers, cards, buttons). This is a COLOR
  SYSTEM, not a logo — the sage nest mark is retired as an identity asset.
- **Companion / Remy = purple `#8A6BD0`→`#5B3E8E` + gold pendant `#E3A24A`** → the
  in-app companion character/chat surfaces (Nest, Ask Remy) ONLY.

**Rules:** never reintroduce the sage nest-and-gold-egg as an app icon, favicon, or
store asset (operator correction 2026-07-16 + unification 2026-07-18). Do **not**
recolor the validated in-app Remy sprite. Do **not** redraw/regenerate the canonical
mark — every derivative is produced mechanically from the checked-in masters.

## 3. Logo system (canonical purple masters — checked in)
- **Composed icon master:** `public/brand/store/app-store-icon-1024.png` — a
  byte-copy of the SHIPPED Build-19 iOS icon (approved warm-glow candidate C; 1024²,
  opaque, no alpha). Every square icon derivative is a mechanical resize of this file.
- **Mark master (transparent):** `public/brand/remynest-mark.png` (695×728, the
  operator's approved standalone art at native resolution) — used for lockups,
  maskable/adaptive safe-zone compositions, and the auth lockup component.
- **Lockup master:** `public/brand/remynest-lockup.png` (960×330 — serif wordmark +
  tagline; its flat icon portion is NOT used as identity — the wordmark region is
  cropped and paired with the canonical mark, e.g. the OG card).
- **Auth/onboarding lockup:** `components/brand/RemyNestLogo.tsx` — the mark master +
  typed wordmark ("Remy" charcoal · "Nest" deep violet `#5B3E8E`; gold is barred as
  wordmark text on light — contrast).
- **16px favicon frame:** a CROP of the mark (the gold heart region) on the same
  field — the full mark is illegible at 16px (rendered A/B evidence, 2026-07-18).
- **Legacy brand-kit (retired as identity):** the sage `logo-{mark,horizontal,
  stacked}[-dark].svg` + `remy-*.svg` files remain on disk as historical references
  ONLY — never wire them into an icon, favicon, store asset, or generated raster.
- **Misuse:** never set body/UI wordmark text in gold (fails contrast), never stretch/
  recolor the mark, never place it on a busy/low-contrast field, never upscale a
  small crop.

## 3a. Remy avatar — character states
Remy is the **in-app companion** (purple character system; gold is the bridge to the
product brand). Geometric **brand-Remy** master = `public/brand/remy-mark.svg` (sage/
gold), plus **6 static state assets** (no animation — animation is post-launch):

| State | File | Cue (non-clinical) |
|---|---|---|
| Happy | `remy-happy.svg` | upward-arc eyes, cheeks, open smile |
| Thinking | `remy-thinking.svg` | eyes glancing up, rising thought dots |
| Listening | `remy-listening.svg` | wide attentive eyes, gold sound-waves |
| Celebrating | `remy-celebrating.svg` | raised wings, sparkles, gold heart |
| Concerned | `remy-concerned.svg` | **gentle** soft brows + slight tilt — never alarming |
| Sleeping | `remy-sleeping.svg` | closed eyes, drifting Z's |

**Usage:** ≥32px; the in-app sprite (`components/remy/avatar/*`, validated) is
unchanged — these are the brand/static set. Refined *illustrated* versions are an
illustrator pass (the geometric SVGs are launch-sufficient).

## 3b. Spacing
4px base grid · radii from `lib/brand/tokens.ts` (`lg 1rem`, `4xl 2rem`) · soft
warm-tinted shadows (`shadow-soft`/`soft-lg`) · card padding 1.25–1.5rem · section
rhythm `space-y-4` (mobile) / `space-y-8` (desktop) · touch targets ≥44×44px ·
logo clear-space per §3.

## 4. Color tokens + accessibility
**Primitives:** sage `#4F6B5B` / sage-deep `#3E5648` / moss `#8FAE8A`; sand `#F5F1EA`
/ sand-deep `#E7E0D3`; gold `#C9A86A` / gold-soft `#E3D1A9` / **gold-ink `#7A5E22`**;
charcoal `#2F3E34` / charcoal-soft `#54655B` / charcoal-muted `#7C887F`.

**WCAG (AA = 4.5:1 text · 3:1 large/UI) — PASS:** charcoal/sand 10:1 (AAA) ·
charcoal-soft/sand 5.5:1 · sage/sand 5.2:1 · white/sage 5.86:1 · gold-ink/sand 5.4:1
· charcoal/gold 5.0:1. **FAIL — barred as text/UI:** **gold `#C9A86A` on light ≈ 1.9–2.0:1**
(accent/large-graphic ONLY — never wordmark/body/focus-ring; use **gold-ink** for
links) · charcoal-muted `#7C887F` 3.3:1 (decorative ≥18px only, never body) ·
white-on-gold 2.26:1 (gold buttons take **charcoal** ink).

**Dark theme** (warm charcoal-green, `.dark` in globals): bg `#15201A` · surface
`#1E2A23` · text `#ECE5D8` · primary `#8FAE8A` · accent `#DBC089` — all pairs AA+
verified. *Mechanism only today; not flipped on broadly until components are audited.*

**Rules:** never signal state by hue alone; min touch target 44×44px; focus = sage
ring `rgba(79,107,91,0.18)` + `#4F6B5B` border (never gold).

## 5. Typography
See `typography.md`. **Fraunces** (`--font-serif`) = display + h1–h4 + memory titles
(never <20px). **Inter** (`--font-sans`) = all body/UI. Body floor **17px**; weight
≥500 under 20px; measure 60–75ch.

## 6. Voice & tone
Calm, warm, plain-spoken, **non-clinical**. Remy speaks first-person as a gentle
companion, never a medical authority. Short sentences; reassure, don't alarm.

## 7. Asset index (all identity rasters = purple, generated by `scripts/generate-brand-assets.mjs`)
| Asset | File | Size | Source |
|---|---|---|---|
| Composed icon MASTER | `public/brand/store/app-store-icon-1024.png` | 1024 opaque no-alpha | byte-copy of the shipped iOS icon |
| Mark MASTER (transparent) | `public/brand/remynest-mark.png` | 695×728 | approved standalone art (native res) |
| Lockup MASTER | `public/brand/remynest-lockup.png` | 960×330 | approved lockup art |
| iOS app icon | `ios/.../AppIcon.appiconset/AppIcon-512@2x.png` | 1024 | shipped Build 19 (canonical origin) |
| Favicon route | `app/icon.png` | 512 | resize of master |
| Favicon (.ico) | `app/favicon.ico` | 16 (heart crop)/32/48 | pipeline |
| Apple touch | `app/apple-icon.png` | 180 opaque | resize of master |
| OG / social card | `app/opengraph-image.png` (+ `.alt.txt`) | 1200×630 | canonical icon + lockup wordmark crop |
| PWA icons | `public/icon-192.png`, `icon-512.png` | true-square | resize of master |
| PWA maskable | `public/brand/icons/maskable-{192,512}.png` | safe-zone | mark @60% on field |
| Play icon | `public/brand/store/play-icon-512.png` | 512 | resize of master |
| Play adaptive | `public/brand/store/play-adaptive-{foreground,background}-432.png` | 432 | mark @56% / field |
| Android launcher | `android/.../mipmap-*/ic_launcher{,_round,_foreground}.png` | 48–432 | pipeline |
| Legacy sage SVGs | `public/brand/logo-*.svg`, `remy-*.svg` | vector | RETIRED as identity — reference only |

## 8. Accessibility posture
Elder-care first: 17px body floor, generous line-height (≥1.5), high text contrast
(AAA where possible), large touch targets, no hue-only state, respect Dynamic
Type/zoom (`rem`, viewport zoom enabled), `prefers-reduced-motion`.

## 9. Changelog / decisions
- **2026-07-18 — STRATEGY-1 IDENTITY UNIFICATION (operator-directed).** The purple
  fingerprint-heart-bird is now the single customer-facing identity on every
  platform (iOS/Android/App Store/Play/PWA/favicon/apple-touch/OG/auth lockup); the
  sage nest mark is RETIRED as an identity asset (sage/sand/gold remains the UI
  chrome palette only). All rasters regenerate from the checked-in purple masters
  via `scripts/generate-brand-assets.mjs` (the sage generation path was removed so
  it cannot run accidentally). 16px favicon uses the heart-region crop (legibility
  evidence). §2/§3/§7 rewritten accordingly.
- **2026-06-23** — System established: two-tier identity, nest logo, dark-theme
  tokens+mechanism, WCAG fixes (gold-as-text barred, body-text + focus contrast),
  type scale.
- **2026-06-23 (asset system)** — Added the **dark logo package**
  (`logo-{mark,horizontal,stacked}-dark.svg`), **6 static Remy state SVGs**
  (`remy-{happy,thinking,listening,celebrating,concerned,sleeping}.svg`), the
  **raster generator** (`scripts/generate-brand-assets.mjs`), and the **asset
  production spec** (`docs/brand/asset-production.md` — icon/store/marketing matrix +
  audit). **Operator-pending (needs `sharp`/running app/designer):** run the raster
  script (true-square PWA icons, App Store 1024, Play 512+adaptive, favicon PNGs),
  capture store screenshots, illustrated marketing. The PWA `icon-192/512.png` +
  `favicon.png` are currently **broken (1536×1024 non-square)** — the script fixes them.
