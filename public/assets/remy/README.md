# Remy — Production Asset Pipeline

Canonical home for every Remy / Nest visual. Three folders, one rule each.

```
public/assets/remy/
├─ master/        # The canonical character reference — READ-ONLY
│   └─ remy_master_v1.png      ← "Remy Master v1.0" (turnaround + expressions + palette)
├─ production/    # The ONLY location the app reads (the Asset Registry points here)
│   └─ <14 named assets>       ← real art where approved, transparent placeholder otherwise
└─ archive/       # Historical / superseded revisions — never referenced, never deleted
    └─ <pre-reorg snapshot>
```

## master/ — the immutable reference
`remy_master_v1.png` is the **approved canonical design** (Remy Master v1.0). Treat it as
**read-only**: never overwrite it, never modify it, never wire it into the app. Every
production export must match this sheet exactly (proportions, scarf, golden-feather heart
pendant, colour palette). These are **immutable brand assets** — do not redesign or
reinterpret the character (see `CLAUDE.md`).

## production/ — the live asset set
The application reads assets **only** from here, and **only** through the Asset Registry
(`lib/remy/companion/asset-registry.ts`). Components reference assets by **key**, never by
path — the path lives in exactly one place (the registry `BASE` constant). To add/replace
art: drop the PNG into `production/` using the **exact existing filename**, then flip that
entry's `kind` from `"placeholder"` to `"image"` in the registry. No other code changes.

Master spec per asset: **2048×2048, transparent PNG, centered, no background**, consistent
proportions/lighting/colour with `master/`.

### Current production status
| File | Status |
| --- | --- |
| `remy_idle.png` | ✅ real art (idle pose) |
| `remy_thinking.png` | ✅ real art (claw-to-head + "?") |
| `remy_listening.png` | ⏳ placeholder — the dropped file duplicated `remy_thinking`; its correct **wing-to-ear** export is pending |
| `remy_happy.png` | ⏳ placeholder |
| `remy_talking.png` | ⏳ placeholder |
| `remy_wave.png` | ⏳ placeholder |
| `remy_sleeping.png` | ⏳ placeholder |
| `remy_celebrating.png` | ⏳ placeholder |
| `nest_closed.png` | ⏳ placeholder |
| `nest_open.png` | ⏳ placeholder |
| `nest_empty.png` | ⏳ placeholder |
| `golden_feather.png` | ⏳ placeholder |
| `speech_bubble.png` | ⏳ placeholder |
| `shadow.png` | ⏳ placeholder |

Placeholders are 1×1 transparent PNGs so the app never 404s while art is in production.

## archive/ — historical revisions
A faithful snapshot of the pre-reorganization flat layout. Kept for history; **nothing is
ever deleted**, nothing here is referenced by the app. (Includes the original
duplicate-of-thinking `remy_listening.png` for the record.)
