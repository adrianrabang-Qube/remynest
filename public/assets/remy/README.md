# Remy — Production Assets

**One flat folder. Every Remy / Nest asset lives directly here** — no `master/`,
`production/`, or `archive/` sub-folders.

The app reads these **only** through the Asset Registry
(`lib/remy/companion/asset-registry.ts`), which is the **single owner of asset paths**:
components reference assets by **key**, never by path. To add or replace art, drop the PNG
into this folder using the **exact existing filename**, then flip that entry's `kind` from
`"placeholder"` to `"image"` in the registry — no other code change.

## The character reference
`remy_master_v1.png` is the **permanent canonical character reference** (Remy Master v1.0).
It is **read-only** — never modify it, never overwrite it, and it is **not** registered as an
app asset. Every export in this folder must match it exactly (proportions, scarf,
golden-feather heart pendant, palette). Do not redesign or reinterpret the character.

## Two render tiers per expression (2026-07-13)
Every expression ships in **two tiers of the same approved artwork** — one registry key,
resolved per surface via `resolveRemyAssetSrc(asset, variant)`:

- **Scene tier** — `remy_<expression>.png`: the approved **1536×1024 landscape**
  illustrations (transparent background; the character often shares the canvas with
  props/speech art). For heroes, stages, empty states, celebrations (≳ 120px rendering).
- **Avatar tier** — `remy_avatar_<expression>.png`: **256×256 square, transparent**, the
  character filling ~86% of the canvas with slight crest headroom (float-bob safe).
  **Derived mechanically (crop + scale only — never redrawn)** from the SAME scene export.
  For navigation and compact surfaces (the Nest button, chips, future widgets/watch/
  Dynamic Island — anything ≲ 100px). A missing avatar falls back to the scene export.

To replace an expression's art: drop the new scene PNG in, then re-derive its avatar crop
(square window on the character, ~86% fill, 2% downward bias) — both under the exact
existing filenames. No code change.

## Contents (41 files)
| File | Status |
| --- | --- |
| `remy_master_v1.png` | 🔒 canonical reference (read-only, not app-wired) |
| `remy_idle.png` `remy_listening.png` `remy_thinking.png` `remy_talking.png` | ✅ real art (scene) |
| `remy_happy.png` `remy_surprised.png` `remy_sleeping.png` `remy_searching.png` | ✅ real art (scene) |
| `remy_memory_found.png` `remy_reminding.png` `remy_encouraging.png` `remy_welcome.png` | ✅ real art (scene) |
| `remy_goodbye.png` `remy_confused.png` `remy_wink.png` `remy_celebrating.png` `remy_success.png` | ✅ real art (scene) |
| `remy_avatar_<each expression above>.png` (17 files) | ✅ derived avatar tier (256×256) |
| `golden_feather.png` `nest_empty.png` `nest_open.png` `nest_closed.png` | ✅ real art |
| `speech_bubble.png` `shadow.png` | ✅ real art |

All app assets are real approved artwork; no placeholders remain. All expression exports
have **transparent backgrounds** (the earlier "opaque background" note was stale — the
PNGs carry a real alpha channel; corners/edges are fully transparent).
