# RemyNest Brand Guidelines

*Authoritative source of truth for the RemyNest brand. Tokens live in
`lib/brand/tokens.ts` + `tailwind.config.js` + `app/globals.css`; logo files in
`public/brand/`.*

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

## 2. Unified Remy Bird identity (authoritative, 2026-06-23 — supersedes the two-tier system)
RemyNest has **ONE brand**: the **Remy Bird** (mascot = AI companion = product mark).
Implemented **identity-only (Option 1)** — two LAYERS, gold is the bridge:
- **IDENTITY LAYER = purple `#8A6BD0`→`#5B3E8E` · gold `#C9A86A` · navy `#2A2350`**
  → logo, app icon, favicon, OG, splash, login/signup, marketing. The bird is the hero;
  the nest survives as supporting **nest-rings** + a gold heart.
- **APPLICATION CHROME = sage · sand · charcoal** → the in-app UI, **UNCHANGED**.

**Rules:** the product mark is now the **purple/gold Remy Bird** (the bird app icon is
correct — the old "never purple bird on the app icon" rule is **retired**). **Do NOT
recolor the app** sage→purple (Option 2 is deferred post-launch). **Do NOT recolor the
validated in-app Remy sprite** (`public/remy/remy-blueprint.png`) — it already IS the
bird. Tokens: `IDENTITY` (identity) + `BRAND` (chrome) in `lib/brand/tokens.ts`.

## 3. Logo system (Remy Bird)
- **Primary mark:** the **Remy Bird** — a gold/cream bird cradled in concentric gold
  **nest-rings** with a gold heart above. On-light = purple bird + gold nest
  (`public/brand/logo-mark.svg`); on-purple/app-icon = cream/gold bird on a purple tile
  (`logo-mark-reversed.svg`). Raster master = `logo-mark-dark.svg` (cream/gold bird on
  transparent — the generator composites it onto purple).
- **Lockups:** horizontal (`logo-horizontal.svg`), stacked (`logo-stacked.svg`,
  login/signup/OG), icon-only (`logo-mark*.svg`). Reusable React lockup for auth
  surfaces = `components/brand/RemyBirdLogo.tsx`.
- **Wordmark:** "RemyNest" in **Fraunces** 600 — **"Remy" navy `#2A2350`** + **"Nest"
  gold `#C9A86A`** (a large-graphic/logo treatment — exempt from the gold-as-text rule).
- **Light vs dark package:** light = `logo-{mark,horizontal,stacked}.svg` (purple bird,
  navy/gold wordmark). **Dark** = `logo-{mark,horizontal,stacked}-dark.svg` (cream bird,
  cream "Remy" / gold "Nest") for dark surfaces.
- **Clear-space:** ≥ the x-height of the wordmark "e" (≥25% of the mark width for
  icon-only). **Min size:** horizontal 120px wide; icon 32px; favicon is a bold
  simplified bird (`app/icon.svg`). Splash master = `public/brand/splash.svg`.
- **Misuse:** never set the wordmark in gold (fails contrast), never stretch/recolor
  outside the variants, never place the mark on a busy/low-contrast field.

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

## 7. Asset index
| Asset | File | Size | Generated by |
|---|---|---|---|
| Nest mark | `public/brand/logo-mark.svg` | vector | hand-authored |
| Reversed mark | `public/brand/logo-mark-reversed.svg` | vector | hand-authored |
| Horizontal lockup | `public/brand/logo-horizontal.svg` | vector | hand-authored |
| Stacked lockup | `public/brand/logo-stacked.svg` | vector | hand-authored |
| Brand Remy | `public/brand/remy-mark.svg` | vector | hand-authored |
| Favicon (SVG) | `app/icon.svg` | 64 | hand-authored |
| Favicon (.ico) | `app/favicon.ico` | 16/32/48 | *regenerate (pending)* |
| Apple touch | `app/apple-icon.tsx` | 180 opaque | `next/og` |
| OG / social card | `app/opengraph-image.tsx` | 1200×630 | `next/og` |
| PWA icons | `public/icon-192.png`, `icon-512.png` | *regenerate true-square (pending)* | sharp |
| App Store / Play / social | `public/brand/{store,social}/` | *pending* | sharp from SVG |

## 8. Accessibility posture
Elder-care first: 17px body floor, generous line-height (≥1.5), high text contrast
(AAA where possible), large touch targets, no hue-only state, respect Dynamic
Type/zoom (`rem`, viewport zoom enabled), `prefers-reduced-motion`.

## 9. Changelog / decisions
- **2026-06-23 (UNIFIED REMY BIRD — supersedes the two-tier system)** — RemyNest now
  has ONE brand: the purple/gold Remy Bird (mascot = companion = product mark),
  **identity-only (Option 1)** — flipped the SVG logo system, `app/icon.svg`,
  `apple-icon.tsx`, `opengraph-image.tsx`, login/signup (`RemyBirdLogo`), `IDENTITY`
  tokens, the splash master, and the raster generator (composites onto **purple**) to
  the bird. **Application chrome (sage/sand/charcoal) is UNCHANGED — no app recolor**
  (Option 2 deferred). Tagline on OG → "A safe place for your memories." **Operator/
  designer follow-ups:** run the raster generator + native icon/splash wiring, replace
  `public/logo.png` (still sage), polished bird illustration. Retired the "purple is
  companion-only / sage nest is the product" rule.
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
