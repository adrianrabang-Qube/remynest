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

## Memory Match — Activity #3 (SHIPPED 2026-07-15)
A game is a VIEW over existing photo memories: each chosen photo becomes one
PAIR (two cards). No timers, scores, streaks, leaderboards, AI, sharing, or
billing. Deleting a game never touches memories/media.
- **Data:** migration `20260715120000_memory_match.sql` (OPERATOR STEP —
  probe-gated; hub shows "Remy is setting up the matching table" until
  applied): `match_games` (ordered `photos` jsonb of {memoryId, path}; pairs ∈
  {3,4,6,8}; shuffle_seed) + `match_game_progress` (matched pair indexes —
  flipped-but-unmatched is deliberately ephemeral) + `match_game_completions`.
  RLS owner-scoped; reversible rollback block. GDPR export v1.5.
- **Create verification (puzzle pattern):** every photo's memory is fetched
  SCOPED BY the active workspace and the path must be one of that memory's own
  image attachments/cover (canonical `toStoragePath` comparison) — a planted
  foreign reference cannot save. All later actions authorize against the
  game's OWN context.
- **Board:** deck = the ONE seeded shuffle (`shuffledTrayOrder`, reused from
  the puzzle core — deterministic resume). Tap-only (tap IS the complete
  interaction); match → stays revealed (medium haptic); miss → both visible
  ~1.4s then turn back (announced); state-aware card labels + aria-live;
  Reduce Motion keeps the delay, drops the transition. Autosave = debounced
  write + seed-checked localStorage mirror, CANCELLED on completion (the
  puzzle-audit lesson); board keyed by id+seed so replay remounts fresh.
- **Completion:** warm copy, `Remy.emit("match.completed")` (new platform
  event → celebrating), Play again + Delete + back.
- **Hub shelves (real data only):** Continue playing (saved matched pairs) ·
  Ready to play · Finished games.
- **Deferred from v1:** flip animation polish (3D card turn), per-card memory
  links, mixed photo+text card fronts, any Companion-Intelligence hook beyond
  the platform event.

## Music Memories — Activity #4 (SHIPPED 2026-07-15, v1 "The songs of your life")
A song memory is user-typed song METADATA (title required; artist/era/note
optional) plus an ORDERED, OPTIONAL set of linked existing memories. **NO
audio of any kind in v1** — no upload, playback, recording, mic permission,
streaming, catalog, or external music links (audio is a separately approved
future phase; the attachment pipeline was NOT modified). Deleting a song
memory never touches memories/media.
- **Data:** migration `20260715150000_music_memories.sql` (OPERATOR STEP —
  probe-gated; hub shows "Remy is setting up the music room" until applied):
  ONE `song_memories` table (title/artist/era/note + ordered `memory_ids`
  jsonb, may be empty; RLS owner-scoped; reversible). GDPR export v1.6.
- **Reuse, not duplication:** linked-memory rendering and save-time workspace
  verification REUSE Story Builder's structurally generic helpers
  (`getStoryMoments`, `memoriesBelongToWorkspace`) and the shared
  `MomentOrderList` — imports only; Story Builder itself byte-untouched.
  Links are optional: empty is valid; non-empty sets get the exact-count
  workspace check.
- **Flow:** hub ("Your songs" — one honest list) → details→optional-link
  wizard (text-base inputs; picker over /api/memories `data.data`,
  settle-always + retry; selection order preserved; "save without links"
  path) → detail (song + note + linked memories w/ signed thumbs/text
  fallback + a gentle non-clinical reflection prompt) → edit (details +
  link order/removal) → delete (view only; confirm says memories are kept).
- **Spotify link import (2026-07-15, import-only):** an optional Add/Edit
  field prefills EDITABLE details from a pasted track link via Spotify's
  official oEmbed endpoint ONLY. Strict pre-network validation (https; host
  exactly `open.spotify.com` [/track/<22-char id>, optional intl-xx prefix] or
  `spotify.link` [single slug]; ≤200 chars; no userinfo/port); the server
  contacts only `open.spotify.com/oembed` (8s timeout, redirect:"manual",
  auth-gated, `spotifyImport` rate limit) — spotify.link short links are
  resolved BY Spotify inside oEmbed, never fetched by us; the oEmbed html is
  string-parsed for the canonical track id and DISCARDED (never rendered,
  persisted, or returned). Persisted artifact: ONLY the canonical
  `https://open.spotify.com/track/<id>` in `song_memories.spotify_url`
  (migration `20260715180000_music_memories_spotify.sql` — OPERATOR STEP;
  additive/probe-gated: pre-application, song writes RETRY without the column
  so manual entry never breaks and the import is simply not persisted). UI:
  "We'll ask Spotify for this song's public title. No Spotify account is
  connected."; a text-only "Details imported from Spotify" indicator — NO
  iframe/player/preview/artwork/external-link CTA/OAuth. GDPR v1.7. Rules:
  never widen the hosts/paths, never fetch user-supplied hosts, never render
  or store oEmbed html.
- **Deferred Phase 2 (operator-gated — the documented audio deferral):**
  user-owned audio attached to song cards + a minimal player (client accept
  flip + <audio> over signed URLs; playback-only, no new permissions).
  Phase 3 (separate decision): external music-app links (anti-steering
  review posture). Rejected: streaming catalogs, autoplay, mic recording.

## Memory Puzzles caveats
- **Known caveat:** "Open this memory" uses the user_id-scoped `/memories/[id]`
  route — a caregiver opening ANOTHER author's memory 404s there (pre-existing
  memory-detail authz posture; not changed by puzzles).
