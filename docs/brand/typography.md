# RemyNest Typography

Formalizes the existing pairing — **no new fonts**. Loaded in `app/layout.tsx`:
**Inter** → `--font-sans`, **Fraunces** → `--font-serif`.

## Roles
- **Fraunces** (serif, warm/high-contrast): display, h1–h4, memory/editorial titles.
  **Never below 20px.**
- **Inter** (sans, modern/legible): all body, UI, buttons, inputs, captions, nav.

## Scale
Defined as Tailwind `theme.extend.fontSize` tokens (additive — default sizes still
available). 16px root; `rem`.

| Token | Size | Line-height | Weight | Family |
|---|---|---|---|---|
| `text-display` | 3.5rem (56px) | 1.05 | 600 | Fraunces |
| `text-h1` | 2.5rem (40px) | 1.1 | 600 | Fraunces |
| `text-h2` | 2rem (32px) | 1.15 | 600 | Fraunces |
| `text-h3` | 1.625rem (26px) | 1.2 | 600 | Fraunces |
| `text-h4` | 1.375rem (22px) | 1.25 | 600 | Fraunces |
| `text-body-lg` | 1.1875rem (19px) | 1.6 | 400 | Inter |
| `text-body` | 1.0625rem (17px) | 1.6 | 400 | Inter |
| `text-small` | 0.9375rem (15px) | 1.5 | 500 | Inter |
| `text-caption` | 0.8125rem (13px) | 1.45 | 500 | Inter |

Headings use fluid `clamp()` (display/h1/h2/h3) for responsive scaling; body and
below stay fixed `rem` (predictability matters more than fluidity for elder-care).

## Elder-care floors (mandatory)
- Running body ≥ **17px**; UI floor **13px** (never render body <17px).
- Weight ≥ **500** under 20px; never <400.
- Measure **60–75ch** (`max-w-prose`); line-height ≥ 1.5.
- `rem` units (respects iOS Dynamic Type / browser zoom); keep viewport zoom enabled.

## Migration (staged — do NOT blind-swap)
Today `text-sm` (14px, ~421 uses) + `text-xs` (12px, ~123) dominate. Map
old `text-sm → text-small` (15/500) and old `text-xs → text-caption` (13/500),
verifying dense screens (timeline, dashboard) visually rather than a global
find-replace. **Critical fix already applied:** `globals.css p { color }` was the
failing muted gray → now `--text` (AAA).

## Fraunces axes (polish follow-up)
Extend the `next/font` call with explicit weights 400–700 + `opsz`/`SOFT`; hero
override `font-variation-settings: 'opsz' 60, 'SOFT' 40`. Non-blocking design QA.
