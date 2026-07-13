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
- **Navigation:** one additive row in the Library hub's static `SECTIONS` list
  (`LibraryView` — its designed extension point). Deliberately NOT a bottom-nav
  tab (5 slots are locked) and NOT a Nest menu item yet (5 items by design).

## Rules
- **Positioning (LA1/LA5 de-medicalization):** activities are "gentle ways to
  spend time with your memories" — NEVER cognitive-training/brain-health/clinical
  claims, in UI copy or store metadata.
- Add an activity = one registry entry (+ its route when available). Do not
  hardcode activity lists in pages, add a second registry, or promise dates on
  `future` items.
- An `available` activity MUST have a real, non-dead-end `href`.

## Future (per approved plan, awaiting go-ahead)
Phase 1 fills `/activities/puzzles` with the puzzle hub + create flow + play
engine (see the approved Memory Puzzles architecture: memory-backed images,
crop-as-metadata, DOM-tile engine, `puzzles`/`puzzle_progress`/`puzzle_completions`
schema — operator-applied migration; `puzzle.completed` Remy event; reflection
seam for future AI).
