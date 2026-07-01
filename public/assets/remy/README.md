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

## Contents (24 files)
| File | Status |
| --- | --- |
| `remy_master_v1.png` | 🔒 canonical reference (read-only, not app-wired) |
| `remy_idle.png` `remy_listening.png` `remy_thinking.png` `remy_talking.png` | ✅ real art |
| `remy_happy.png` `remy_surprised.png` `remy_sleeping.png` `remy_searching.png` | ✅ real art |
| `remy_memory_found.png` `remy_reminding.png` `remy_encouraging.png` `remy_welcome.png` | ✅ real art |
| `remy_goodbye.png` `remy_confused.png` `remy_wink.png` `remy_celebrating.png` `remy_success.png` | ✅ real art |
| `golden_feather.png` `nest_empty.png` `nest_closed.png` `speech_bubble.png` | ✅ real art |
| `nest_open.png` | ⏳ placeholder — awaiting approved export |
| `shadow.png` | ⏳ placeholder — awaiting approved export |

Placeholders are 1×1 transparent PNGs so the app never 404s while art is in production.
