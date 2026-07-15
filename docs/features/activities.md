# Feature: Remy's Activities (platform)

> Authoritative summary: CLAUDE.md → "Remy's Activities — platform" note (2026-07-13).
> Status: **platform shipped; no activity gameplay exists yet.** Memory Puzzles
> (Phase 1) is approved-pending — its architecture plan is in the 2026-07-13 handoff
> thread; do not build it without operator approval.

## What it is
The permanent first-party home for RemyNest activities — a registry-driven landing
page (`/activities`) where every current and future activity lives. Activity #1
(Memory Puzzles) will mount inside it; Memory Match, Story Builder, Music Memories,
and Family Activities are announced placeholders.

## Architecture
- **`lib/activities/registry.ts` — the SINGLE source of truth.** `Activity` model
  (slug/title/tagline/description/status/href/Icon) + helpers (`getActivity`,
  `availableActivities`, `upcomingActivities`, `ACTIVITY_STATUS_LABEL`). Pages
  hardcode NO activity.
- **`status` IS the feature flag:** `available` (tappable card → `href`) ·
  `coming-soon` (announcement card, gold-ink badge) · `future` (quieter, "On the
  horizon"). Flipping a status is a one-word config change — and a RELEASE decision
  (`main` auto-deploys).
- **Routes:** `app/(app)/activities/page.tsx` (landing; RSC; no data reads —
  registry is static config; auth via protect-by-default), `loading.tsx` (brand
  skeleton, reduced-motion-safe), `activities/puzzles/page.tsx` (the Phase-1
  MOUNT POINT — today an honest intro shell: "Remy is setting up the puzzle
  table"; no dead controls, no fake loading).
- **Components:** `components/activities/ActivityCard.tsx` (status-driven, pure
  presentation, server-compatible).
- **Remy integration:** the landing intro uses `<RemyStage context="welcome">`
  (the platform's in-place surface — no new expression/renderer/vocabulary).
- **Navigation (corrected 2026-07-14):** a first-class `NAV_ITEMS` entry
  (`/activities`, `mobile:"drawer"`) — visible in the mobile "More" drawer and
  the desktop top-nav — plus the Library `SECTIONS` row (its description now
  includes "Memory puzzles" so the hub search matches). The original
  Library-row-only placement shipped to production undiscoverable: two levels
  deep and absent from every menu. Still NOT a bottom-nav tab (5 slots locked)
  and NOT a Nest menu item (5 items by design).

## Rules
- **Positioning (LA1/LA5 de-medicalization):** activities are "gentle ways to
  spend time with your memories" — NEVER cognitive-training/brain-health/clinical
  claims, in UI copy or store metadata.
- Add an activity = one registry entry (+ its route when available). Do not
  hardcode activity lists in pages, add a second registry, or promise dates on
  `future` items.
- An `available` activity MUST have a real, non-dead-end `href`.

## Memory Puzzles — Activity #1 (SHIPPED 2026-07-14, Phases 1A–1D)
Built exactly per the approved architecture:
- **Data (1A):** migration `20260714090000_remys_puzzles.sql` (OPERATOR-APPLIED;
  probe-gated — the hub shows a calm setting-up state until applied): `puzzles` +
  `puzzle_progress` + `puzzle_completions`, RLS owner-scoped, care access via
  service-role actions after `userCanAccessProfile`/`userCanWriteProfile`; no
  duration/score columns. GDPR export enrolled (schemaVersion 1.3). Pure core in
  `lib/puzzles/` (seeded shuffle, exact pixel tile/crop math). A puzzle is a VIEW
  over a memory: image server-verified against the memory's own attachments;
  crop is metadata; deleting a puzzle never touches the memory/media.
- **Create (1B):** wizard at `/activities/puzzles/new` — existing-memory picker
  (paginated /api/memories; untransformed URL for crop math) or new photo via
  the EXISTING direct-to-storage pipeline that creates a memory first
  (quota/ledger inherited) → pan/keyboard square crop → difficulty (Gentle 9 →
  Expert 100, soft estimates).
- **Engine (1C):** DOM-tile sprite board (one decode), pointer-capture drag with
  rAF floating tile, MAGNETIC correct-slot-only snapping, tap/keyboard slot
  buttons (fully playable without dragging), ghost outline, hint, debounced
  autosave + localStorage mirror (seed-checked), resume/replay/favourite/delete,
  haptics, reduced-motion-safe, no timers/scores.
- **Completion (1D):** board dissolves into the photograph (`photoReveal`),
  `Remy.emit("puzzle.completed")` (new platform event → celebrating), copy
  "You pieced this memory back together.", buttons Open this memory / Talk with
  Remy (the REFLECTION SEAM — a future phase swaps this link for the
  server-authoritative "tell me about this memory" prompt on the existing Ask
  Remy layer) / Play again.
## Story Builder — Activity #2 (SHIPPED 2026-07-15)
A story is an ORDERED VIEW over 2–12 existing memories ("moments") — nothing
copied, nothing generated (no AI narrative, no scores, no timers, no sharing).
- **Data:** migration `20260715090000_story_builder.sql` (OPERATOR STEP —
  probe-gated; the hub shows a calm setting-up state until applied): ONE
  `stories` table (`memory_ids` = ordered jsonb of memory uuids; RLS
  owner-scoped; care access via service-role actions after
  `userCanAccessProfile`/`userCanWriteProfile`; reversible rollback block).
  GDPR export enrolled (schemaVersion 1.4). Deleting a story never touches
  memories/media (the delete confirm says so).
- **Save-time invariant:** every referenced memory is server-verified to
  belong to the story's OWN workspace (exact-count check in
  `memoriesBelongToWorkspace`); reads re-scope by the same workspace, so a
  planted foreign id can never resolve.
- **Flow:** `/activities/stories` hub (one honest "Your stories" list — a
  saved story has no meaningful in-progress state, so deliberately NO status
  shelves) → `new` wizard (memory picker over the existing paginated
  /api/memories [`data.data` shape, settle-always with retry]; photo thumb or
  serif text tile; selection order = story order; title) → `[id]` reader (the
  "memory book": signed MEDIUM images via `signMemories`, serif titles,
  dates) → `[id]/edit` (title/order/remove via the SHARED `MomentOrderList`).
- **Accessibility:** reordering is BUTTON-driven (Move earlier/later, ≥44px,
  position-aware labels, aria-live) — never drag-only (no drag in v1);
  text-base inputs; reduced-motion-safe skeletons.
- **Deferred from v1 (do not treat as defects):** adding/re-picking moments in
  edit (edit = title/order/remove), touch drag reordering (additive later),
  hub story thumbnails, print/export (the existing Memory Book export is the
  future seam), any Remy platform event for story completion.

## Memory Puzzles caveats
- **Known caveat:** "Open this memory" uses the user_id-scoped `/memories/[id]`
  route — a caregiver opening ANOTHER author's memory 404s there (pre-existing
  memory-detail authz posture; not changed by puzzles).
