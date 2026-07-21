# Handoff — Current

> **Lightweight continuation log.** The authoritative project state lives in
> **[`docs/REMY_MASTER_STATE.md`](../REMY_MASTER_STATE.md)** (launch %, milestone, current/next
> task, VERIFIED COMPLETE, DO NOT REBUILD, LOCKED decisions, blockers, open items). Read that
> **FIRST**, then `CLAUDE.md`, then this file. **Source code always wins over any doc.** This file
> holds only the recent continuation context and must never contradict the master state.
>
> *(The detailed pre-2026-07-09 handoff log — ~2,400 lines — was superseded by the master state +
> CLAUDE.md authoritative notes and slimmed to this continuation doc on 2026-07-09. The full prior
> history remains in git.)*

Last Updated: 2026-07-21
Authoritative state: `docs/REMY_MASTER_STATE.md`

## Current status
Launch-scope build **~90%** complete; overall **~70%**. Current milestone: **CERTIFIED — awaiting
operator go-live**. *(Branch archival & engineering-history pass, 2026-07-13, documentation-only — no
branches/tags/code/history changed, nothing pushed: created **`docs/PROJECT_HISTORY.md`** [the permanent
evolution timeline genesis 2026-04-15 → production RC 2026-07-13 + the branch archive + tag audit +
active-development policy]. Branch classification: `main` = the SOLE active production branch [==
origin/main == `b1b004c`, in sync]; the 7 non-main branches are PRESERVED as historical reference [6
fully merged; `cognition-v2` superseded — its native-local-notifications feature is on main via a later
CocoaPods reimplementation]. Policy recorded: all future work branches from `main`; historical branches
never receive new development. 13 existing tags reviewed [accurate; not modified], 3 additional milestone
tags recommended for the untagged June-July production programme [operator to create].)*
*(Git reconciliation 2026-07-13: the previously-unpushed RC2→RC-certification
commits ARE now pushed — `main` was in sync with `origin/main` @ `b646449` at session start, so that
work is live in production. "Unpushed" claims in older entries below are historical.)*

Most recent: **Nest button full-bleed art fix (2026-07-21, EXECUTION MODE — operator-circled
defect):** the resting center button read as a nest photo inside a white circle (the crop window
kept the artwork's cream margin + a pale resting ring). Now the golden bowl covers the whole 48px
face: `FloatingCompanionButton` `"nest-art"` variant (ringless at rest; ring width per-tone;
`focus-visible:ring-4` keeps the violet keyboard ring; woken states keep the white pedestal for
the avatar) + tightened crop (132×88 @ −37,−22). Evolution art will read edge-to-edge. tsc/lint
green.

Before that: **PURPLE-PRIMARY app-wide color unification (2026-07-21, EXECUTION MODE — operator
decision, presentation-only):** violet `#5B3E8E` is now the app-wide PRIMARY (buttons, links,
chips, active nav, focus rings [violet — no longer sage], selection, `.btn-primary`/`.rn-btn`/
`.input:focus`, themeColor/manifest). New `primary/primary-deep/primary-soft` tokens + `--primary*`
vars; mechanical `-sage → -primary` class swap (~664 sites / 151 files) + curated GREEN allowlist
(sage demoted to success/nature status only: ReminderCenter completed chip, Account "saved"
message); canvas unchanged (sand/white/charcoal/gold). Frozen surfaces: className-only (diff-audit
verified — no logic lines). tsc + lint green in-session; `npm run build` = operator/Vercel gate.
Supersedes the Strategy-1 purple-scope clause + the sage focus-ring standard (see the CLAUDE.md
PURPLE-PRIMARY note + the brand-guidelines banner).

Before that: **Companion design-bible UI polish (2026-07-21, EXECUTION MODE — presentation-only;
operator supplied the external Remy Design Bible boards as images):** aligned the Remy/Nest
COMPANION surfaces to the boards' purple look. New single-source **`remy.*` Tailwind tokens**
(violet `#5B3E8E` · lavender `#8A6BD0` · gold `#E3A24A` · mist `#F5F2FB`); NestMenu + RemyAsk
migrated hardcoded hex → tokens (render-identical); RemyMomentChip ring, the `/remy` story card,
Home's "Open conversation with Remy" CTA, RemyBriefing + RemyHomeSummary (washes/bullets/CTA), and
the `FloatingCompanionButton` "nest" pedestal ring took the companion palette; `nest.module.css`
day glow / base halo / 2 motes blend lavender with the gold (values only — time-of-day, stage
accents, reduced-motion untouched). **`components/remy/RemyAvatar.tsx` (the documented plug-in
seam) now renders the REAL Remy character** via the single `<Remy>` renderer (avatar tier; same
props — every mounting surface upgraded, sparkle placeholder retired). Copy fix: `home-model.ts`
fallback theme labels title-cased ("health & Fitness" → "Health & Fitness"). NOT done (locked /
deferred / assets absent): dark mode, notification design, haptics/sounds, gestures, per-stage nest
art, app-wide purple; focus rings stay sage. *(Git note: the Strategy-1 work below IS now
committed + pushed — `606b7c1` on main; the "uncommitted" claims below are historical.)*

Before that: **Strategy-1 brand unification (2026-07-18, EXECUTION MODE — UNIFY REMYNEST BRAND
ASSETS; uncommitted, awaiting operator commit authorization):** the purple fingerprint-heart-bird is
now the SINGLE customer-facing identity everywhere. Three canonical masters vendored
(`public/brand/store/app-store-icon-1024.png` = byte-copy of the SHIPPED Build-19 icon;
`public/brand/remynest-mark.png` transparent 695×728; `public/brand/remynest-lockup.png` 960×330).
`scripts/generate-brand-assets.mjs` REWRITTEN purple-only (sage generation removed) and RUN: web
favicon route `app/icon.png` + `favicon.ico` (16 = heart-region crop per rendered legibility A/B) +
`apple-icon.png` + PWA 192/512 + maskable + Play 512 + adaptive fg/bg 432 + ALL Android launcher
mipmaps (Capacitor template art replaced; adaptive bg `#2E1B60`) + static
`app/opengraph-image.png` (canonical icon + approved wordmark crop on sand; `.alt.txt` added). The
sage `app/icon.svg`/`apple-icon.tsx`/`opengraph-image.tsx` routes were DELETED (static PNGs
replace them); `RemyNestLogo.tsx` now renders the canonical mark + "Remy" charcoal/"Nest" violet
wordmark. iOS Build-19 catalog/Podfile/signing/privacy/splash untouched. Docs updated
(brand-guidelines §2/§3/§7/changelog, asset-production, CLAUDE.md, this file, master state;
screenshot spec already purple-consistent). Contact sheet at
`~/Downloads/RemyNest-Brand-Unification-ContactSheet.png`. NOT committed/pushed.

Before that: **ITMS-90683 location-API warning FIXED → Build 19 (2026-07-16):** Apple flagged
Build 18 for referencing location APIs with no `NSLocationWhenInUseUsageDescription`. PROVEN root
cause (from the Build-18 archive binaries, not assumption): the bare `OneSignalXCFramework 5.5.2`
pod resolves to the `OneSignalComplete` default subspec, which bundles `OneSignalLocation.framework`
— its `CLLocationManager`/`requestWhenInUseAuthorization`/`startUpdatingLocation` strings trip
Apple's scan; RemyNest has NO location feature (no geolocation plugin/UI/schema), so per the
no-deceptive-purpose-string rule the pod was scoped to `OneSignalXCFramework/OneSignal` +
`/OneSignalInAppMessages` (SAME SDK minus ONLY OneSignalLocation; otool proves the umbrella
soft-loads optional modules — push init/notifications/IAM unchanged). `pod install` run; build
bumped 18→19; Release archive VERIFIED: 1.0 (19), `OneSignalLocation.framework` ABSENT, whole-bundle
location-string sweep CLEAN, mic string + `aps-environment` intact. Archive at
`~/Downloads/RemyNest-Build19.xcarchive` (upload = operator step; Build 18 should NOT be submitted).
NOT pushed.

Before that: **Build 18 TestFlight preparation (2026-07-16):** the operator's unstaged Build-17
pbxproj hunk was INCORPORATED into the committed bump — `CURRENT_PROJECT_VERSION 12→18` in BOTH App
configurations (marketing version stays 1.0; Info.plist derives both keys from build settings, so
`CFBundleShortVersionString`/`CFBundleVersion` are coherent at 1.0/18). Nothing else changed (no
Capacitor sync, no Pods/signing/assets/JS-TS). A signed Release archive was built and VERIFIED
(1.0 (18), com.remynest.app, team VWT682HUT9) and copied to `~/Downloads/RemyNest-Build18.xcarchive`
— upload to TestFlight is the OPERATOR step (Xcode Organizer → Distribute, or `xcodebuild
-exportArchive` with an app-store-connect ExportOptions plist). NOT pushed.

Before that: **App Icon v1 review round + approval (2026-07-16, after the brand correction below):**
three faithful polish candidates (A board-faithful / B deep-indigo / C warm-glow — same mark, same
composition, native-resolution `logo vector version.png` mark on the board-sampled field) were
generated to `~/Downloads/RemyNest-AppIcon-Review-v1/` with a 1024/240/120/60 contact sheet. The
review round caught that the `7cfe039` icon's field gradient was VERTICALLY INVERTED vs the board
(light was top-left; the board lights from bottom-left) — all candidates carry the corrected
orientation. **Operator approved C (warm-glow):** corrected lighting + a subtle (≤14%) warm-gold
radial lift behind the heart for 60px legibility. C is now installed in `AppIcon.appiconset`
(1024² opaque RGB no-alpha verified; iOS simulator build green; pbxproj untouched — the Build-17
bump stays the operator's own unstaged change).

Before that, the **canonical icon + Nest/Ask-Remy V1 brand correction (2026-07-16,
launch-blocking visual fix):** **(1) The App Store icon was CORRECTED** — the 2026-07-15
sage nest-and-gold-egg icon was the operator-confirmed WRONG selection; `AppIcon.appiconset` now
carries the **purple fingerprint-heart-bird** per the approved `REMYNEST DESIGN LOGO.PNG` board.
The 1024² opaque no-alpha icon was COMPOSED (never redrawn/upscaled): the exact standalone
transparent high-res mark (operator's `logo vector version.png`, mark 695×728 at NATIVE
resolution) on the board-sampled deep-purple gradient (`#150A3B→#6B428E`); side-by-side verified
against the board icon at 210/120/60px. **(2) Nest button V1 alignment** — idle state is now the
NEST itself (approved `nestEmpty` registry art, bowl cover-crop in the 48px circle, gentle
reduced-motion-safe breathe; label "Open Remy's Nest"); Remy still pops out via the UNCHANGED wake
choreography and presents the same 6 REAL actions (no fake Camera/Video/Person/Document); the
NestMenu sheet carries the companion palette (violet `#5B3E8E` / lavender `#8A6BD0` wash). **(3)
Ask Remy V1 chat restyle** (`RemyAsk.tsx` + `/remy` header, presentation-only — retrieval/anchor/
history/guard logic byte-unchanged): warm Remy presence (avatar tier via the single `<Remy>`
renderer), lavender answer bubbles / white user bubbles, violet links+chips+cards, and a LARGE
rounded composer ("Ask Remy anything…", `text-base`, round violet send button). Purple stays
scoped to Remy/Nest surfaces only. Validated: tsc/lint/build green + iOS simulator build (iPhone
17 Pro) green + icon dims/RGB/no-alpha verified. The user's unstaged Build-17 pbxproj bump was
preserved untouched. Screenshot spec updated (ASC must show the PURPLE icon). NO push/archive.

Before that: the **iOS launch visual/privacy asset preparation (2026-07-15, iPhone-only
v1):** **(1)** the Capacitor TEMPLATE app icon (blue X — shipped on TestFlight Builds ≤17!) was
replaced in `AppIcon.appiconset` with the approved RemyNest nest-and-gold-egg icon (flattened from
`public/brand/store/app-store-icon-1024.png` to opaque no-alpha 1024², single-size catalog — one file
covers all sizes; legibility verified at 58–116px). **(2)** the template splash was replaced with a
branded 2732² opaque splash (Warm Sand `#F5F1EA`, first-party nest mark centered at 20% width —
crop-safe on all iPhones) across all three `Splash.imageset` files + splash `backgroundColor` set to
sand in BOTH `capacitor.config.ts` and the generated `ios/App/App/capacitor.config.json` (no full cap
sync needed; next sync regenerates identically). **(3)** `PrivacyInfo.xcprivacy` gained the **Audio
Data** declaration (user content · linked · app-functionality · no tracking; existing 8 types
untouched) AND — the RC4 gap — **real Xcode target membership** (PBXBuildFile/FileReference/group/
Resources entries added to project.pbxproj; the manifest was previously NOT bundled). **(4)**
**iPhone-only v1**: `TARGETED_DEVICE_FAMILY "1,2"→1` in both configurations — iPad support + iPad
screenshots are DEFERRED to a deliberate future release. **(5)** screenshot capture package at
`docs/launch/APP_STORE_SCREENSHOTS.md` (8-frame real-app narrative + captions, 6.9"/6.5" specs,
no-alpha validation, capture rules incl. no-Spotify-frames; App Preview video deferred). **Git
hygiene:** the operator's unstaged Build-17 bump in project.pbxproj was preserved — only the
PrivacyInfo-membership + device-family hunks were patch-filter staged (verified: staged diff contains
no CURRENT_PROJECT_VERSION; unstaged diff is exactly the two version hunks). **Remaining operator
steps:** bump to Build 18 when archiving → TestFlight upload → ASC privacy answers (Audio Data) →
capture/upload screenshots → never claim iPad. NO archive/upload/push/migration happened.

Before that: **Together Time — Family Activities, Activity #5 (2026-07-15, COMPLETE;
the FINAL activity card):** a private reusable set = ordered view over 3–8 existing memories, run
one moment at a time with the four FIXED operator-approved non-AI prompts (index-assigned in code).
Probe-gated migration **`20260715210000_together_time.sql` — OPERATOR STEP** (`together_times`:
title/ordered memory_ids/nullable last_opened_at; RLS owner-scoped; reversible). Locked decisions
honoured: sets only (no session history); `last_opened_at` bumped BEST-EFFORT (player ignores the
result — read-only caregivers run sets with zero errors/writes); DEDICATED moment loader
(`getTogetherMoments` — first signed image + first signed AUDIO per memory; Story Builder's loader
untouched). Player: signed photo + words + user-initiated `<audio controls>` (never autoplay) +
fixed prompt + aria-live "Moment X of Y" + heading focus on Previous/Next + no slide animations.
Save-time exact-count workspace verification (reused helper); deleted memories degrade calmly;
GDPR v1.8; registry family-activities `future`→`available` (`/activities/family`). Deferred
(operator-gated): in-session voice capture, printable sheet, custom prompts. Rejected: live
sync/sharing/AI prompts/session notes. tsc/lint/build green (79/79; 4 new routes).
**ACTIVITIES ROSTER COMPLETE — after the post-ship QA pass, FEATURE WORK PAUSES and the project
moves to iOS App Store launch preparation.**

Before that: the **Voice Memory discoverability fix (2026-07-15):** the Nest
quick-action sheet gained an operator-approved SIXTH row — "Record a voice memory / Save a moment in
your own words" (Mic icon, directly below "Add a memory") → `/memories/new?voice=1`, context-threaded
for care workspaces. The flag only makes `CreateMemoryForm` render the EXISTING recorder at the top
(`voiceFirst` prop; page h1 becomes "New voice memory") — no parallel page/model, no auto-recording
(mic starts only on the explicit Record tap), validation/upload/reset/back-navigation unchanged, and
plain "Add a memory" still opens the ordinary blank flow. tsc/lint/build green (77/77).

Before that: **Voice Memory v1 (2026-07-15 — operator-approved NARROW lift of the voice
deferral):** in-app private voice recordings in the EXISTING memory-creation flow (not an activity,
no schema/migration — the attachments pipeline already allowlists audio/*). Browser-native
`getUserMedia`+`MediaRecorder` only (iOS→AAC/mp4 .m4a, Android/Chrome→Opus/webm; NO plugin/pod —
if the operator's real-device pass fails, that's a STOP-and-report decision gate). Flow: Record
(mic starts only on tap) → live state w/ elapsed + 5:00 auto-stop + Stop/Discard → listen-back
(local object URL) / Re-record / Remove → rides the normal memory Save (existing title+content
validation untouched; direct-to-storage upload w/ quota; voice file appended to the picked files).
Mic tracks stop IMMEDIATELY on Stop/Discard/error/unmount; permission-denied/unsupported/interrupt
states are calm + recoverable; no audio in logs; no autoplay. Feed: branded "Voice memory" chip
(`MediaThumb`); detail: pre-existing inline `<audio controls>` + preload/aria label. GDPR: audio
attachments already ride memories export (mediaReferences includes all attachment types — verified,
no gap). `Info.plist` mic copy now covers voice memories. **OPERATOR steps: (1) native rebuild to
ship the new mic-permission string; (2) add "Audio Data" (user content, linked, app-functionality
only, NOT tracking) to `PrivacyInfo.xcprivacy` + App Store privacy answers before the next
submission; (3) real-iPhone confirmation of record→playback in the TestFlight WebView.** Deferred:
transcription, AI audio features, audio FILE uploads, sharing/downloads, Music Memories tie-in.
tsc/lint/build green (77/77).

Before that: the **Music Memories Spotify link import (2026-07-15, IMPORT-ONLY):** an
optional Add/Edit field prefills editable song details from a pasted track link. Security: strict
pure validation (`lib/music-memories/spotify.ts` — https; hosts exactly open.spotify.com
[track-only, intl-prefix ok] / spotify.link [slug]; ≤200 chars; 24 runtime assertions PASSED) BEFORE
any network; the server route (`/api/music/spotify-import`, auth + `spotifyImport` rate-limit + 8s
timeout + redirect:"manual" + captureError) contacts ONLY open.spotify.com/oembed (short links
resolved by Spotify, never fetched by us); oEmbed html string-parsed for the canonical track id then
discarded. Persists ONLY the canonical track URL — **probe-gated additive migration
`20260715180000_music_memories_spotify.sql` (OPERATOR STEP)**; pre-application, song writes RETRY
without the column (42703 probe) so manual entry keeps working. GDPR v1.7 (whole-row export carries
the field). UI: shared `SpotifyImportField` in wizard+editor ("We'll ask Spotify for this song's
public title. No Spotify account is connected."; remove-import control; calm errors leave manual
entry usable) + a text-only "Details imported from Spotify" detail indicator. NO
OAuth/player/iframe/artwork/external links. tsc/lint/build green (77/77).

Before that: **Music Memories — Activity #4 (2026-07-15, COMPLETE; v1 "The songs of your
life" — NO audio):** a song memory = typed metadata (title required; artist/era/note optional) +
ordered OPTIONAL linked memories. Probe-gated migration **`20260715150000_music_memories.sql` —
OPERATOR STEP** (ONE `song_memories` table; RLS owner-scoped; reversible). Story Builder's generic
helpers reused by import only (`getStoryMoments`/`memoriesBelongToWorkspace`/shared
`MomentOrderList`); optional links get the exact-count workspace check when present; GDPR v1.6.
Surfaces: hub ("Your songs", calm empty + music-room pre-migration states) → details→optional-link
wizard (text-base inputs, settle-always picker, save-without-links path) → detail (song + note +
linked memories + gentle reflection prompt) → edit (details + link order/removal) → delete (view
only). Registry: music-memories `future`→`available` (`/activities/music`). Audio upload/playback
remains the documented deferral — Phase 2/3 need separate operator approval. tsc/lint/build green
(76/76; 4 new routes).

Before that: **Memory Match — Activity #3 (2026-07-15, COMPLETE):** a gentle photo-pair
game; a game = a VIEW over existing photo memories (each chosen photo = one pair). Probe-gated
migration **`20260715120000_memory_match.sql` — OPERATOR STEP** (`match_games` w/ ordered
photos jsonb + pairs ∈ {3,4,6,8} + shuffle_seed · `match_game_progress` matched-pairs ·
`match_game_completions`; RLS owner-scoped; reversible). Puzzle-pattern security: create verifies
every photo against its memory's own attachments scoped by the ACTIVE workspace; all actions
authorize against the game's own context; GDPR v1.5; delete keeps memories/media. Surfaces: hub
(honest shelves: Continue playing / Ready to play / Finished; calm empty + pre-migration states) →
size→photos wizard (exact-count selection; settle-always picker w/ retry + Show more) → tap-only
board (seeded deck via the reused `shuffledTrayOrder`; match stays up w/ medium haptic; miss shows
both ~1.4s then flips back, announced; state-aware card labels; Reduce Motion keeps the delay;
autosave debounced + seed-checked local mirror + cancelled on completion; board keyed id+seed) →
warm completion (`Remy.emit("match.completed")` → celebrating; Play again / Delete). Registry:
memory-match `coming-soon`→`available` (`/activities/match`). Deferred: 3D flip polish, per-card
memory links, text-card fronts. tsc/lint/build green (74/74; 3 new routes).

Before that: **Story Builder — Activity #2 (2026-07-15, COMPLETE):** a story = an
ORDERED VIEW over 2–12 existing memories. ONE additive probe-gated table (`stories`, migration
**`20260715090000_story_builder.sql` — OPERATOR STEP, apply in the SQL editor**; RLS owner-scoped;
reversible). Mirrors every puzzle contract: session-derived actor, structured never-throw actions,
authorize against the story's OWN context (write = `userCanWriteProfile`), service-role scoped reads,
**save-time exact-count verification that every memory belongs to the story's workspace**, signed
private media (MEDIUM via `signMemories`), GDPR export v1.4, deleting a story never touches
memories/media. Surfaces: hub (one honest "Your stories" list, calm empty + pre-migration states) →
select→arrange wizard (picker over `/api/memories` `data.data`, settle-always + retry + Show more;
photo thumb or serif text tile; selection order = story order; title input) → "memory book" reader →
edit (title/order/remove via the ONE shared button-driven `MomentOrderList` — Move earlier/later,
≥44px, aria-live; never drag-only). Registry: story-builder flipped `coming-soon`→`available`
(`/activities/stories`). Deferred from v1: re-picking moments in edit, touch drag, hub thumbnails,
print/export, Remy story events. tsc/lint/build green (72/72; 4 new routes).

Before that: the **Activities discoverability fix (2026-07-14):** production had the
puzzle code deployed but NO menu exposed it — the only entry was the Library-hub row (two levels deep:
More → Library → row), and Library search didn't match "puzzle". Fix: an additive `NAV_ITEMS` entry
(`/activities`, `mobile:"drawer"`, Puzzle icon, after Library) → appears in the mobile "More" drawer +
desktop top-nav with `?context=` threading automatic; Library row description now includes "Memory
puzzles" (hub search matches). Locked decisions preserved (no bottom-nav tab, no Nest menu item, no
My Nest drawer row, portals untouched). Journey: More/desktop-nav → Activities → Memory Puzzles →
Create a puzzle. tsc/lint/build green. Also in this session: the **post-implementation puzzle audit**
(7 verified gameplay defects fixed + 2 hardening refinements, committed `6be12b1` — replay reset via
seed key, completion cancels the pending autosave, touch-scrollable tray, 8px drag threshold,
post-drag click suppression w/ next-tick disarm, drag-preview pre-positioning, picker pagination).

Before that: **Memory Puzzles — Activity #1 (2026-07-14, Phases 1A–1D COMPLETE, four
commits, approved architecture as contract):** **(1A)** migration `20260714090000_remys_puzzles.sql`
(OPERATOR STEP — probe-gated; hub degrades calmly until applied): puzzles/puzzle_progress/
puzzle_completions, RLS owner-scoped + service-role care access after app-layer authz, no
duration/score columns; pure `lib/puzzles/` core; server actions (structured/never-throw,
session-derived, authorize against the puzzle's OWN context; create verifies the image belongs to
the source memory's attachments); GDPR export v1.3. **(1B)** hub shelves (Continue/Ready/Favourites/
Finished; batch-signed crop thumbnails) + create wizard (memory picker / new-photo-creates-a-memory
via the existing direct-to-storage pipeline / pan+keyboard square crop / difficulty cards). **(1C)**
DOM-tile sprite engine — one decode, rAF drag, magnetic correct-slot-only snap, tap/keyboard slot
buttons (playable without dragging), ghost outline, hint, debounced autosave + seed-checked
localStorage mirror, resume/replay/favourite/delete, haptics, reduced-motion-safe, no timers/scores.
**(1D)** completion: board dissolves into the photograph (photoReveal), `Remy.emit("puzzle.completed")`
(new platform event → celebrating), "You pieced this memory back together.", Open this memory /
Talk with Remy (REFLECTION SEAM — future phase swaps in the server-authoritative memory prompt on
the existing Ask Remy layer) / Play again. Known caveat: Open-this-memory hits the user_id-scoped
`/memories/[id]` (cross-caregiver 404 — pre-existing posture). All four phases tsc/lint/build green.
**OPERATOR: apply the puzzles migration to activate.**

Before that: **Remy's Activities — the activities PLATFORM (2026-07-13,
operator-commissioned; platform ONLY — no gameplay/engine/schema):** a registry-driven landing page
`/activities` (serif header, `<RemyStage context="welcome">` Remy introduction, "Ready to enjoy" +
"What Remy is preparing" shelves, brand skeleton, empty branch) built on
**`lib/activities/registry.ts`** — the single source of truth (`Activity` model; **status IS the
feature flag**: available/coming-soon/future; status flips are release decisions since `main`
auto-deploys). `components/activities/ActivityCard.tsx` renders all three statuses (available =
whole-card link + sage focus ring; others = non-interactive with gold-ink/muted badges).
`/activities/puzzles` is the **Phase-1 mount point** (honest intro shell — "Remy is setting up the
puzzle table"; no dead controls). Navigation: one additive row in the Library `SECTIONS` list.
Registry: Memory Puzzles (available) · Memory Match, Story Builder (coming-soon) · Music Memories,
Family Activities (future). Copy follows the de-medicalization rule ("gentle ways to spend time with
your memories"). tsc clean · lint 0 errors · build 69/69 (2 new routes). **STOPPED per the task's
gate: Phase 1 (Memory Puzzles gameplay, per the approved 2026-07-13 architecture) awaits explicit
operator approval.** NOTE for the operator: until Phase 1 ships, the puzzles card is `available` per
spec but leads to the intro shell — flipping it to `coming-soon` is a one-word registry change if
preferred before the next production push. See `docs/features/activities.md`.

Before that: the **Storage Capacity Architecture — composed entitlement (2026-07-13,
behaviour-preserving; no Stripe/schema/UI change):** the operator proposed splitting storage into
independently-purchasable packs; a principal-architect evaluation (vs iCloud+/Google One/Dropbox/
OneDrive/Proton/Evernote/Notion/ChatGPT) concluded the INSTINCT is right (storage demand shouldn't
force a Premium→Family features upsell) but shipping a second consumer purchase dimension at launch
is wrong (mature products keep ONE dimension; boosters only appear post-PMF as a single SKU; extra
3.1.1 surface; the lapsed-pack "pay or lose memories" state must be designed first). **Chosen
architecture: capacity-as-composed-entitlement** — new `lib/storage/capacity.ts`
(`resolveStorageCapacity(tier, extraGrants)`, pure/sync/never-throws) sums capacity GRANTS (plan base
today; future storage-pack/promotion/grandfathered grants plug into the `extraGrants` seam);
`getStorageUsage` now derives `limitBytes` from it (byte-identical today) and exposes the additive
`StorageUsage.capacity` breakdown. Storage-pack SKUs are a **deferred post-launch product decision**
(operator approval + usage-data trigger; grants attach to the plan owner only). CLAUDE.md
"Single source of truth" note superseded (2026-07-13) + `docs/features/storage-ledger.md` updated.
tsc clean · lint 0 errors · build 67/67.

Before that: the **Final QA Pass — verified defects only (2026-07-13):** walked the
critical journeys adversarially (Apple-review / elderly-user / caregiver / shared-device lenses) and
fixed FIVE verified defects, deferring one: **(A/B, HIGH — frozen-surface, proven-defect carve-out)**
the reminder create/toggle/delete forms had NO pending guard; React queues same-form server-action
submissions sequentially and `nextOccurrenceAfter` always advances ≥1 step, so a double-tap on
"Done for today" advanced a recurring series TWICE (daily medication reminder silently skipped a
day) and double-tap Create made duplicates → new `PendingSubmitButton` (`useFormStatus`
disabled-while-pending) wraps all three submit buttons; actions/fields/form-key/scheduling
byte-unchanged. **(C, LOW)** toast ids used `Date.now()` — same-millisecond toasts collided
(duplicate React keys, both dismissed early) → module counter. **(D, HIGH privacy)** logout is SPA
navigation and the QueryClient lives in the ROOT layout with staleTime 60s, so the next account to
log in on a shared device was served the PREVIOUS user's cached memories → `queryClient.clear()` on
logout AND on login success. **(E, MED)** a failed memories-feed fetch fell through to "No memories
yet" + a create CTA (terrifying + misleading offline) → dedicated error card with Retry (renders
only when no cached data; cached feed stays up during background retries). **(F, DEFERRED —
documented, do not silently ship)** deep links: the middleware bounces unauthenticated users to
`/login` with no return destination, and login always lands on `/home` — the fix needs an
open-redirect-safe relative-path `next` param through the auth-critical middleware + LoginClient;
post-launch item, not worth last-minute risk in the certified auth path. tsc clean · lint 0 errors ·
build 67/67. **Engineering verdict: no remaining launch-blocking defects.**

Before that: the **Production Polish Pass — "feels premium" (2026-07-13,
presentation-only; no logic/routing/architecture change; frozen surfaces untouched):**
**(1) Global toast FIXED + rebranded** (`ToastProvider` — the app-wide "Memory saved" channel
referenced a **nonexistent `animate-slide-in` class**, so toasts popped in unanimated; now
`animate-toastIn` [gentle 280ms settle, reduced-motion-safe], brand `bg-sage-deep rounded-2xl
shadow-soft-lg` [white contrast 8:1, up from green-700's 5.3:1], safe-area-aware placement
[never under the notch], `max-w` wrap; exit animation deliberately NOT added — would need
lifecycle changes). **(2) "More" drawer entrance motion** (`MobileNavDrawer` popped in with no
animation → scrim fade 200ms + panel slide-in on the iOS sheet curve 320ms, CSS-only,
entrance-only [close still unmounts immediately — behaviour preserved], reduced-motion-safe;
close button `×` glyph 32px → lucide `X` at 44px + sage focus ring; the drawer is a SIBLING of
the blurred header, so no portal needed). **(3) Platform CSS polish** (`globals.css`):
`text-size-adjust: 100%` (no iOS landscape font inflation), `touch-action: manipulation` on
interactive elements (no double-tap-zoom misfires/tap delay), brand sage `::selection`, and a
reduced-motion guard for ALL utility animations (float/fadeUp/slideIn/slideOut/toastIn/
scrimIn/drawerIn/remy-fade-in — previously unguarded). **(4) Bottom-nav tabs + More** got
inset sage `focus-visible` rings (were ring-less). **(5) Nest first-wake preload** — hidden,
inert, same-size `<Remy assetVariant="avatar">` instances warm the wake-choreography frames
(idle/wink/welcome/goodbye ≈ 350KB once per session), so the first wake sequence never
pops/flashes. **Deferred (recorded, not regressions):** toast exit animation (lifecycle);
route/tab transitions (RSC-boundary risk); MediaThumb blur-up fade (touches the signed-URL
fallback path — needs its own verified pass); theme-color sage→sand (sage is a deliberate
documented brand decision — do not re-litigate); active-tab indicator animation (subjective).
tsc clean · lint 0 errors · build 67/67 green.

Before that: the **Remy AVATAR asset tier — "Remy IS the button" (2026-07-13,
asset-architecture + presentation only; no logic/routing/behaviour change; supersedes the earlier
post-cert `size 40→48` polish, which enlarged the box but could not fix the composition).** Root
cause: all 17 expression PNGs are 1536×1024 **landscape scene** illustrations (transparent
background — the old "opaque backgrounds" claim was stale; `welcome`/`goodbye` are full marketing
scenes with speech-bubble text), so `object-contain` in the 48px Nest FAB letterboxed the bird to a
~15px speck ("white circle with a tiny bird"). Fix (correct long-term architecture, not a CSS
scale): a **second render tier per expression** — `remy_avatar_<expr>.png`, 256×256 square,
transparent, character at ~86% fill with crest headroom for the 4px float bob — **derived
mechanically (crop + scale only, never redrawn)** from the same approved masters
(`remy_master_v1.png` untouched) and registered in the ONE asset registry (`RemyAsset.avatarSrc` +
`RemyAssetVariant` + `resolveRemyAssetSrc()` with automatic scene fallback). The single `<Remy>`
renderer gained `assetVariant` (default `"scene"` — every existing consumer unchanged). Adopted on
the four compact surfaces: **Nest** (48px FAB), **NestMenu greeting** (44px), **RemyMomentChip**
(40px), **FloatingCompanionLayer** (64px); RemyStage/RemyCelebration/error pages correctly stay
scene-tier. Nest choreography/behaviour/evolution/time-of-day/halo/particles/a11y/routing all
byte-unchanged (one prop per surface). Avatar files are 50–160KB vs 2.3–3.2MB scenes. All 17 avatars
visually verified on mock-FAB contact sheets; scene-heavy poses hand-tuned via crop overrides.
tsc clean · lint 0 errors · production build green. Authoritative: CLAUDE.md "Remy asset pipeline —
TWO RENDER TIERS" + `public/assets/remy/README.md`.

Before that, the last work was the **RC FINAL RELEASE CANDIDATE
CERTIFICATION** (independent verification; NO code change — certification docs only). Validation GREEN
(tsc/lint/build); the critical production invariants were verified intact with no regression
(protect-by-default auth, private `memory-media`, purchase gating, the LA5.1 Art-17 migration fix, Stripe
500-on-writeFailed, no committed secrets, `.env.example`↔code). An independent **7-lens multi-agent
certification (Senior Staff / Principal SW / Security / SRE / Mobile / Privacy / Platform — 8 agents, 0
errors) returned ALL GO/96; board decision GO, overall 96/100, ZERO verified engineering blockers.**
**DECISION: RemyNest Release Candidate is CERTIFIED for production deployment.** Residual = operator (push
the 14 commits, apply migrations, set prod env, Storage backup + test restore, uptime/Sentry alerts) /
legal (`/terms` jurisdiction, controller entity/DPO) / product (submission package, Health-data
declaration) — none engineering. `main` auto-deploys on push (certification committed locally, unpushed).
Full detail: `docs/RC-FINAL-CERTIFICATION.md`.

Before the RC certification, the last work was **LA7 — Final Production Launch
Readiness Audit** (verification pass; NO runtime/product/architecture change). The final full-system audit
across every subsystem + the ~24 critical end-to-end flows returned **NO remaining ENGINEERING blockers
for production deployment** (Overall ~90 · Engineering ~96 · Infra ~88 · Deploy ~90). The 9-lens audit +
7-lens review both hit the subagent session limit → completed **inline** (repo precedent RC3/LA4/LA6).
**One config-drift finding FIXED:** `.env.example` documented the WRONG Stripe price-id names
(`STRIPE_PRICE_PREMIUM` vs the real `STRIPE_{PREMIUM,FAMILY,ENTERPRISE}_{MONTHLY,YEARLY}_PRICE_ID` ×6) +
omitted the store URLs → corrected `.env.example` + reconciled `check-production-env.mjs` (checkout
already validates + 400s on an unset price, so config not a crash). **Deferred (LOW):** 3 caller-less API
routes (send-notification/build-relationships/timeline; not removed — unseen-caller risk). Residual is
**operator/legal/product only** (push the 14 unpushed commits, apply migrations, set prod env, backups +
monitoring; `/terms` jurisdiction + controller entity/DPO; submission package). tsc/lint/build green.
`main` auto-deploys on push (LA7 committed locally, unpushed). Full detail:
`docs/LA7-LAUNCH-READINESS-REPORT.md`.

Before LA7, the last work was **LA6 — Disaster Recovery & Business
Continuity** (documentation-first; NO runtime/product/architecture change). Produced the operational
DR/BC layer complementing the existing backup docs + the GDPR breach policy: **`docs/DISASTER_RECOVERY_PLAN.md`**
(dependency map, RTO/RPO objectives, SPOF analysis, backup strategy, ownership, severity model,
automation roadmap) + **`docs/runbooks/`** (index + 5 runbooks: db/storage recovery, deploy/migration
rollback, dependency outages, secrets/rotation, operational incident response) + **`scripts/check-production-env.mjs`**
(operator env-integrity check; never prints values) + reconciled 2 stale snapshots. **DR ~82 / BC ~80.**
The 6-lens review (SRE/Cloud/DR/Supabase/DevOps/Security) hit the subagent session limit → completed
inline (repo precedent) and **FIXED a false claim** (only 2 of 13 migrations have rollback blocks, not
all; probe-gating scoped to additive migrations). tsc/lint/build green. **No new engineering launch
blocker;** residual is OPERATOR/infra (now with runbooks): `memory-media` Storage backup + test restore
(HIGH), uptime/Sentry-alert activation, restore drill, offline secrets copy. `main` auto-deploys on push
(LA6 committed locally, unpushed). Full detail: `docs/LA6-DISASTER-RECOVERY-REPORT.md`.

Before LA6, the last work was **LA5.1 — Apple Guideline 1.2 UGC
moderation** (CLOSES the CRITICAL LA5 iOS blocker; maintains the existing architecture; NOT a social
platform). Implemented the minimum production-ready **report / block / leave** framework: migration
`moderation_reports` + `user_blocks` (RLS insert-own + **select-own only**, no update/delete → status
service-role only; reporter identity never exposed; FKs reported/memory→SET NULL; **no must-have-target
CHECK** — it would abort a reported user's account delete = Art 17 regression); session-derived,
never-throw, service-role-scoped server actions (`reportUser`/`reportContent`/`blockUser`/`unblockUser`/
`leaveWorkspace`/`listSafetyOverview`, authorized by `getSharedCarePeopleIds`, rate-limited + dedup);
block enforcement on `inviteCaregiver` + `acceptInvite` (either direction; never removes care access);
**Safety Center** `/settings/safety` + Settings link + portaled/focus-trapped `ReportDialog` + a
**Report button on care-context search results**; GDPR export enrolled (v1.2) + co-caregiver emails
masked. **6-lens multi-agent review — all `satisfiesApple12=true`; the 1 BLOCKING defect (FK SET-NULL ×
a must-have-target CHECK) + high-value nits ALL fixed.** tsc/lint/build green. **NO remaining
ENGINEERING blocker for iOS on Apple 1.2.** **OPERATOR (required to activate):** apply
`20260712120000_moderation_foundation.sql` before iOS submission + run the deletion regression.
`main` auto-deploys on push (LA5.1 committed locally, unpushed). Full detail:
`docs/LA5.1-APPLE-1.2-MODERATION-REPORT.md` + `docs/features/moderation.md`.

Before LA5.1, the last work was **LA5 — Apple App Store & Google Play
Compliance** (store-review compliance audit + SAFE fixes only; behaviour-preserving; no architecture/
logic/subscription/schema change; frozen reminder untouched). A 6-lens multi-agent audit (Apple/Play/
Mobile/Privacy/Healthcare/Security; 28→21 adversarially-verified findings) scored **Apple ~74→~80,
Play 57**, then drove safe fixes (independently reviewed: behaviour preserved by all 6 lenses, **0
blocking regressions**, 1 must-fix + 3 nits all applied): **completed de-medicalization** (deleted the
fabricated cognitive-decline scoring + the "Routine Changes" card; neutralized "Memory Activity"
`cognitiveActivity`→`loggingActivity`); **dropped health-app positioning** (JSON-LD `HealthApplication`
→`LifestyleApplication`; removed "cognitive-care" copy); **Apple-1.2 EULA zero-tolerance abuse clause**;
**de-drugged the reminder placeholder**; **Sentry processor disclosure** + **cancel-before-delete
caveat** + **data-rights contact → `admin@` across all legal pages**; **Android `allowBackup=false`**.
**iOS = DO NOT SUBMIT yet** — the CRITICAL **UGC report/block MECHANISM** (Apple 1.2, a feature) + the
`/terms` **governing-law jurisdiction** (legal/counsel) must land first. **Google Play = deferred/not
submittable** (no FCM/signing, versionCode 1). tsc/lint/build green (re-verified). `main` auto-deploys
on push (LA5 committed locally, unpushed). Full detail: `docs/LA5-STORE-COMPLIANCE-REPORT.md`.

Before LA5, the last work was **LA4 — Production Observability & Failure
Recovery** (behaviour-preserving; no UI/logic/billing/AI/schema change; frozen reminder + Stripe billing
untouched). The gap: handled API 500s only produced Sentry *breadcrumbs*, not error *events*, so production
failures were undiagnosable/unalertable. Fixes (observability-only): a new env-gated, PII-scrubbed,
never-throws **`captureError()`** helper (`lib/observability/capture.ts`) applied to **15 key API catch sites**
(memories list/create/[id]/search, timeline, gdpr export/delete, send-notification, profile,
build-relationships, active-profile, memory-chat, cron top-level, story-narration) — handled 500s +
previously-silent AI failures now become Sentry events, correlated by route/requestId; fixed 2 residual
raw-`PostgrestError` PII logs. (A Sentry **`onRequestError`** hook was also added to `instrumentation.ts` but
the review found it **INERT on Next 14.2.5** — it's a Next-15 API, kept forward-compatible; the 15
`captureError` catch-sites are the actual coverage today.) Reliability observability 78→~86. The formal
**6-lens multi-agent review** then VERIFIED it correct/PII-safe/regression-free (**SOUND-WITH-FIXES,
reliability 86, 0 defect**) and drove **6 same-class follow-up fixes**: memories/search `logSearchError`
raw-PII→`errorMessage` (HIGH), Ask Remy chat `captureError`, Stripe checkout/portal/cancel `captureError`,
upload-url + search/global silent-failure `captureError`, cron `logReminderError` raw-PII→`errorMessage`.
tsc/lint/build green (re-verified). **OPERATOR ACTIVATION: set the Sentry DSN + alert rules + an uptime
monitor on /api/health** (LA4 is inert until then). Before it: LA3 perf; LA2 a11y; LA1 clinical; **RC5 —
CERTIFIED FOR APP STORE + PRODUCTION**. `main` auto-deploys on push (LA4 committed locally, unpushed). Full
detail: `docs/LA4-RELIABILITY-REPORT.md`. Remaining launch gates are OPERATOR/infra only (Sentry DSN/alerts; Xcode
privacy-manifest wiring + rebuild; backups + Storage-bucket backup + test restore; the operator DB indexes;
prod env/migrations). A 6-specialist multi-agent audit (perf 72→~82) drove 9 safe fixes: **stripped the dead
pgvector `embedding`** (~15-29KB/row) from the 4 hot memory reads (feed/timeline API/timeline page/search) via
a runtime `stripEmbedding()` (verified only the memory-DETAIL page reads `.embedding`); **memoized the
memories feed** (useMemo sort+grouping + useCallback handlers + React.memo MemorySection — no per-keystroke
re-sort/reconcile); **parallelized the `(app)` layout data waterfall** (Promise.all, fallbacks preserved);
removed 2 dead memory-chat round-trips; memoized the Toast context; dev-gated middleware logs. tsc/lint/build
green + 6-lens self-review. **DB indexes (memories composite, pgvector ANN, pg_trgm, profile_relationships)
are OPERATOR recommendations** — schema is dashboard-managed; SQL in the report. Before it: LA2 a11y; LA1
clinical; **RC5 — CERTIFIED FOR APP STORE + PRODUCTION**. `main` auto-deploys on push (LA3 committed locally,
unpushed). Full detail: `docs/LA3-PERFORMANCE-REPORT.md`. The remaining launch gates are OPERATOR/infra only
(Xcode privacy-manifest wiring + rebuild; backups + Storage-bucket backup + test restore; the operator DB
indexes; prod env/migrations). A 7-dimension
multi-agent audit (a11y 68→~84) cleared the **4 Level-A blockers**: keyboard-reachable media upload
(`AttachmentManager` `hidden`→`sr-only`), announced toasts (`ToastProvider` live region), labeled primary
forms (CreateProfile/InviteCaregiver/MemoryDate/reminders), and a **memory-delete confirmation** — plus a
skip-to-content link, `CreateMemoryForm` focus rings + contrast, single `<main>` landmark (13 pages),
navbar/PhotoViewer aria, heading semantics, and reduced-motion skeletons. Verified tsc/lint/build green +
6-lens self-review. Larger items recommended (charcoal-muted contrast sweep, modal focus traps, MemoryCard
restructure, Undo/soft-delete, VoiceOver/NVDA smoke test) — not blockers. Before LA2: **LA1 — Memory-Care
Clinical Readiness**; **RC5 — CERTIFIED FOR APP STORE + PRODUCTION**. `main` auto-deploys on push (LA2
committed locally, unpushed). Full detail: `docs/LA2-ACCESSIBILITY-REPORT.md`. The remaining launch gates
are OPERATOR/infra only (Xcode privacy-manifest wiring + rebuild; backups + Storage-bucket backup + test
restore; prod env/migrations). A 9-persona clinical review (clinical 73/caregiver 76/patient 70) drove 5 safe fixes: **(1)
de-medicalized Insights** — removed the fabricated biometric/Alzheimer-risk/cognitive-score charts
(synthesized from journal mood) + deleted the 12 orphaned files; kept only honest views + the non-clinical
summary (**this RESOLVES the RC3-flagged disclose-or-remove item — do not re-add**); **(2)** reality-orientation
date on Home (`OrientationLine`); **(3)** honest My-Nest reminder copy (`DashboardFocus`); **(4)** caregiver
access-level clarity (`InviteCaregiverForm`); **(5)** legible medication-reminder hint (`reminders/page.tsx`,
frozen form byte-unchanged). Verified tsc/lint/build green + 5-lens self-review. **Verdict: launch-ready for
real dementia-care use**; features (ICE card, "This is Me", completion attribution, family roster, voice) are
recommended post-launch. Before LA1: **RC5 — CERTIFIED FOR APP STORE + PRODUCTION** (94/100). `main`
auto-deploys on push (LA1 committed locally, unpushed). Full detail: `docs/LA1-CLINICAL-READINESS-REPORT.md`.
The remaining launch gates are OPERATOR/infra only (Xcode privacy-manifest wiring + rebuild; backups +
Storage-bucket backup + test restore; prod env/migrations). An 8-lens
multi-agent certification (Apple/Google/QA/Staff/SRE/Security/A11y/Privacy) re-verified every RC2–RC4
hardening claim in code and found **0 NEW code-level release blockers** (**overall 94/100**). **Verdict:
✅ CERTIFIED FOR APP STORE SUBMISSION + ✅ CERTIFIED FOR PRODUCTION RELEASE (iOS + web); Google Play
deferred** (decided post-iOS workstream). Two NEW low-risk findings were fixed in the RC5 commit: `(auth)`
form input `aria-label`s (WCAG) + `lib/ai-memory.ts` logging routed through the dev-gated `logger`
(name-only parse error; `errorMessage()`). tsc/lint/build green. **Remaining = OPERATOR/infra only:** wire
`PrivacyInfo.xcprivacy` into the Xcode App target + native rebuild; confirm daily backups + a **Storage-bucket
backup** + a **test restore**; set prod env + apply probe-gated migrations. `main` auto-deploys on push
(RC5 committed locally, unpushed). Full detail: `docs/RC5-RELEASE-CERTIFICATION.md`. Before RC5: **RC4 —
Production Launch Readiness** (production-hardening only). An 8-dimension
multi-agent audit (74/100 → ~85) drove a low-risk fix set: closed a hot-path **PHI/PII log leak**
(`profile-access.ts` email + care-recipient rows on every navigation; `build-people.ts` person names) →
dev-gated `logger`/IDs-only; extended the Sentry `beforeSend` scrubber to **exception values + console
breadcrumbs**; added **`maxDuration`** to 8 long/AI routes (so a slow OpenAI call degrades gracefully, not
a raw 504) + a 30s story-provider timeout; memory-create **orphan-storage cleanup** on insert-failure;
`poweredByHeader:false`; committed **`.env.example`**; iOS **`ITSAppUsesNonExemptEncryption=false`** + a
new **`PrivacyInfo.xcprivacy`** app manifest. Verified tsc/lint/build green + main-loop 7-lens self-review
(0 blocking). **Recommendation: READY FOR APP STORE with operator steps** (wire the manifest into the
Xcode target + rebuild; confirm backups + a Storage-bucket backup + a test restore — the one HIGH
residual); **Google Play deferred** (no FCM). `main` auto-deploys on push (RC4 committed locally,
unpushed). Full detail: `docs/RC4-PRODUCTION-READINESS-REPORT.md`. Before RC4: **RC3 — GDPR & Privacy
Compliance** (compliance-hardening only; every feature preserved). A 10-dimension
multi-agent source audit (70/100 baseline → ~80 after) drove a low-risk code+doc hardening set:
GDPR **export completeness** (`people`/`ai_usage`/`memory_intelligence`/`storage_ledger`), **Sentry PII
scrubbing** (`sendDefaultPii:false` + non-dropping `beforeSend`), **PII log minimisation** (raw error
objects → message-only via new `logger.errorMessage()`), **transparency-copy** fixes (privacy page
deletion-is-live + Art 22; cookies per-cookie table; care-profile authority note), **subprocessor-list
accuracy** (removed GA/PostHog/Resend — not in code), and **6 new compliance docs** (ROPA, Subprocessor
List, Retention, Incident Response, Responsible Disclosure, DPIA) + an RC3 report. Verified tsc/lint/build
green + a main-loop 5-lens self-review (behaviour preserved, 0 blocking; the multi-agent review workflow
hit the subagent session limit and was completed inline). **Remaining (roadmap — behaviour/feature/legal,
not this pass):** Stripe/OneSignal processor-side erasure on account delete; storage orphan removal +
orphan-sweep cron; care-profile/DOB **rectification** endpoint; **AI opt-out** toggle; live-legal-page↔docs
reconciliation + **legal entity/DPO/jurisdiction/DPA/OpenAI-ZDR** ([CONFIRM] markers throughout
`docs/compliance/*`); the cognitive-insights disclose-or-remove decision. Plus the earlier open item:
product decision on Ask Remy / `memory-chat` AI quota gating. `main` auto-deploys to production on push
(RC3 is committed locally, unpushed). Authoritative detail: master state → PROJECT STATUS.

## Completed work
Authoritative list: master state → **VERIFIED COMPLETE**. Most recent tasks (newest first):
- **RC — FINAL RELEASE CANDIDATE CERTIFICATION** (independent verification; NO code change — certification
  docs only). Validation green; invariants verified intact (no regression); independent 7-lens multi-agent
  certification (8 agents, 0 errors) — ALL GO/96, board GO, overall 96/100, **ZERO verified engineering
  blockers**. **RemyNest Release Candidate is CERTIFIED for production deployment.** Residual =
  operator/legal/product go-live only. Report: `docs/RC-FINAL-CERTIFICATION.md`.
- **LA7 — Final Production Launch Readiness Audit** (verification pass; NO runtime/product/architecture
  change; audit + review completed inline [subagent limit], repo precedent). Full-system audit → **NO
  remaining engineering blockers for production deployment** (Overall ~90 · Eng ~96 · Infra ~88 · Deploy
  ~90). Fixed the `.env.example` Stripe price-id + store-URL drift + reconciled `check-production-env.mjs`.
  Deferred 3 caller-less API routes as LOW post-launch cleanup. Residual = operator/legal/product only.
  tsc/lint/build green. Report: `docs/LA7-LAUNCH-READINESS-REPORT.md`.
- **LA6 — Disaster Recovery & Business Continuity** (documentation-first; NO runtime/product/
  architecture change). Operational DR/BC layer: `docs/DISASTER_RECOVERY_PLAN.md` (dependency map,
  RTO/RPO, SPOF, backup strategy, ownership, severity, automation) + `docs/runbooks/` (index + 5
  scenario runbooks) + `scripts/check-production-env.mjs` (env-integrity check; never prints values) +
  reconciled 2 stale snapshots. DR ~82 / BC ~80. Inline 6-lens review (subagent limit) fixed a false
  claim (only 2 of 13 migrations have rollback blocks). No new engineering blocker; residual is
  OPERATOR (Storage backup + test restore [HIGH], uptime/alert activation, restore drill). tsc/lint/
  build green. Report: `docs/LA6-DISASTER-RECOVERY-REPORT.md`.
- **LA5.1 — Apple Guideline 1.2 UGC moderation** (CLOSES the CRITICAL LA5 iOS blocker; existing
  architecture maintained; NOT a social platform; multi-agent-VERIFIED — 6 lenses all
  `satisfiesApple12=true`, 1 blocking defect + nits ALL fixed). Report/block/leave framework:
  `moderation_reports` + `user_blocks` migration (RLS insert/select-own only, no update/delete;
  reported/memory FKs SET NULL; **no must-have-target CHECK** — would abort a reported user's
  delete = Art 17 regression); session-derived never-throw actions gated by `getSharedCarePeopleIds`
  (rate-limited + dedup); block enforcement on invite create + accept (never removes care access);
  Safety Center `/settings/safety` + ReportDialog + Report on care-search results; GDPR export (v1.2)
  + email masking. **NO remaining engineering blocker for iOS on Apple 1.2.** OPERATOR: apply the
  moderation migration before submission. tsc/lint/build green. Report:
  `docs/LA5.1-APPLE-1.2-MODERATION-REPORT.md`; feature: `docs/features/moderation.md`.
- **LA5 — Apple App Store & Google Play Compliance** (store-review compliance audit + SAFE fixes only;
  behaviour-preserving; no architecture/logic/subscription/schema change; frozen reminder untouched;
  multi-agent-VERIFIED — behaviour preserved by all 6 lenses, 0 blocking regressions). 6-lens audit
  (28→21 verified) → Apple ~74→~80, Play 57. Fixes: completed de-medicalization (deleted
  `cognitiveDeclineSignals.ts` + the Routine-Changes card; neutralized Memory-Activity
  `cognitiveActivity`→`loggingActivity`); JSON-LD `LifestyleApplication` + dropped "cognitive-care";
  Apple-1.2 EULA abuse clause; de-drugged reminder placeholder; Sentry disclosure + cancel-before-delete
  caveat + data-rights contact→admin@ across all legal pages; Android `allowBackup=false`. Review: 1
  must-fix (contact reconciliation) + 3 nits all applied. tsc/lint/build green. Still open: UGC
  report/block MECHANISM (CRITICAL, feature); `/terms` jurisdiction (legal); mailboxes (operator).
  Report: `docs/LA5-STORE-COMPLIANCE-REPORT.md`.
- **LA4 — Production Observability & Failure Recovery** (behaviour-preserving; observability-only; no
  UI/logic/billing/AI/schema change; multi-agent-VERIFIED **SOUND-WITH-FIXES**, reliability 86, 0 defect).
  Added an env-gated PII-scrubbed never-throws `captureError()` helper applied to 15 key API catch sites so
  handled 500s + silent AI failures become Sentry events (route/requestId-correlated); fixed 2 residual
  raw-error PII logs. (A Sentry `onRequestError` hook was added too but is **INERT on Next 14.2.5** — a Next-15
  API, kept forward-compatible; the 15 `captureError` sites are the actual coverage.) The formal 6-lens
  multi-agent review then drove **6 same-class follow-up fixes**: memories/search raw-PII→`errorMessage`, Ask
  Remy chat capture, Stripe checkout/portal/cancel captures, upload-url + search/global silent-failure
  captures, cron raw-PII→`errorMessage`. Operator activation: set the Sentry DSN + alerts + an uptime monitor.
  tsc/lint/build green (re-verified). Report: `docs/LA4-RELIABILITY-REPORT.md`.
- **LA3 — Performance & Scalability Hardening** (behaviour-preserving; no contract/logic/security/billing/AI
  change). 6-specialist audit (72→~82) → 9 safe fixes: dead-embedding strip on the 4 hot memory reads
  (`stripEmbedding` in `memory-media-signing.ts`); memories-feed memoization (useMemo/useCallback/React.memo);
  2 dead memory-chat round-trips removed; layout waterfall → Promise.all; Toast context memoized; middleware
  logs dev-gated. tsc/lint/build green + 6-lens self-review. DB indexes are operator recommendations (schema
  dashboard-managed). Report: `docs/LA3-PERFORMANCE-REPORT.md`.
- **LA2 — Accessibility & Inclusive Design Readiness** (WCAG 2.2 AA pass; presentation/aria/semantic/
  contrast/client-confirm only — no logic/data/architecture change). 7-dimension audit (68→~84) cleared 4
  Level-A blockers (keyboard media upload, toast live region, primary-form labels, memory-delete confirm) +
  skip link + CreateMemoryForm focus rings/contrast + single `<main>` landmark (13 pages) + navbar/PhotoViewer
  aria + heading semantics + reduced-motion skeletons + scroll-padding. tsc/lint/build green + 6-lens
  self-review. Larger items (charcoal-muted contrast sweep, modal focus traps, MemoryCard restructure,
  Undo/soft-delete) recommended. Report: `docs/LA2-ACCESSIBILITY-REPORT.md`.
- **LA1 — Memory-Care Clinical Readiness** (clinical/caregiving workflow polish; presentation-only, no
  schema/API/architecture change, reminder engine untouched). 9-persona clinical review → 5 safe fixes:
  de-medicalized Insights (removed fabricated biometric/Alzheimer-risk/cognitive charts + deleted 12 orphaned
  files; kept honest views — **resolves the RC3 disclose-or-remove item**); reality-orientation date on Home
  (`OrientationLine`); honest My-Nest reminder copy (`DashboardFocus`); access-level clarity
  (`InviteCaregiverForm`); legible med-reminder hint (`reminders/page.tsx`, frozen form byte-unchanged).
  tsc/lint/build green + 5-lens self-review. Recommendations (ICE card, "This is Me", completion attribution,
  family roster, voice) + rejections recorded. Report: `docs/LA1-CLINICAL-READINESS-REPORT.md`.
- **RC5 — App Store & Production Release Certification** (final certification; no feature/behaviour change;
  reminder engine untouched). 8 independent lenses + synthesis → **overall 94/100, 0 NEW code-level release
  blockers**; every RC2–RC4 claim re-verified in code. **✅ CERTIFIED FOR APP STORE SUBMISSION + ✅ CERTIFIED
  FOR PRODUCTION RELEASE (iOS + web); Google Play deferred.** Fixed 2 low-risk findings in-commit: `(auth)`
  login/signup/forgot-password/reset-password input `aria-label`s (WCAG); `lib/ai-memory.ts` logging via the
  dev-gated `logger` (parse error = name only; AI-request = `errorMessage()`). tsc/lint/build green. Remaining
  = operator/infra + documented roadmap only. Report: `docs/RC5-RELEASE-CERTIFICATION.md`.
- **RC4 — Production Launch Readiness hardening** (production-hardening only; no feature/behaviour change;
  reminder engine untouched). 8-dimension multi-agent audit → low-risk fixes. **Security/observability:**
  `lib/profile-access.ts` (removed caregiver-email + full-care-recipient-row logs) + `lib/build-people.ts`
  (dropped person names) → dev-gated `logger`, IDs/counts + `errorMessage()`; `lib/observability/sentry-privacy.ts`
  scrubber extended to exception values + console breadcrumbs (never returns null); residual raw-error logs
  message-only'd. **Reliability:** `maxDuration` on 8 long/AI routes; 30s `AbortSignal.timeout` on the story
  provider call; memory-create orphan-storage cleanup on insert-failure. **Deploy/store:** `poweredByHeader:false`;
  committed `.env.example`; iOS `ITSAppUsesNonExemptEncryption=false`; new `ios/App/App/PrivacyInfo.xcprivacy`.
  Verified tsc/lint/build green + main-loop 7-lens self-review (0 blocking). **App Store: READY with operator
  steps; Google Play: deferred.** Report: `docs/RC4-PRODUCTION-READINESS-REPORT.md`.
- **RC3 — GDPR & Privacy Compliance hardening** (compliance-only; no feature/behaviour change).
  10-dimension multi-agent audit → low-risk code+doc hardening. **Code:** export widened
  (`lib/gdpr/collect-user-data.ts` + `people`/`ai_usage`/`memory_intelligence`/`storage_ledger`,
  owner-scoped, schemaVersion 1.1, operator-gated tables degrade to `[]`); `lib/observability/sentry-privacy.ts`
  (`sendDefaultPii:false` + a `beforeSend` that strips cookies/headers/body + redacts emails, never drops
  events) in all 3 Sentry configs; `logger.errorMessage()` + raw-error-object → message-only logging across
  dashboard/actions + active-profile/profile/timeline/build-relationships/memory-chat/onboarding + removed a
  client plan-log; privacy/cookies/CreateProfileForm copy. **Docs:** privacy-policy §13 subprocessor
  accuracy; deletion-policy processor-gap disclosure; export-report refresh; `docs/compliance/13–18`
  (ROPA/Subprocessor/Retention/Incident/Disclosure/DPIA, DRAFT) + `RC3-GDPR-AUDIT-REPORT.md`;
  data-classification comments across deletion/storage/media/AI + 2 migrations. Verified tsc/lint/build green
  + main-loop 5-lens self-review (0 blocking, behaviour preserved). Roadmap items recorded in CLAUDE.md +
  master state (do NOT re-flag as new defects).
- **RC2 follow-up — memory-EDIT kept-attachment storage-quota bypass FIXED** (surgical security fix; closes the
  RC2 deferred HIGH). The ledger trigger projects each attachment's `->>'size'` from `memories.attachments`, so
  `PUT /api/memories/[id]` trusting the CLIENT-reported `size` of KEPT attachments let a client under-count the
  ledger + bypass the storage quota (create was already authoritative). Fix (only `app/api/memories/[id]/route.ts`
  changed): BOTH edit branches — active JSON direct-to-storage AND dormant multipart rollback — now re-derive
  every kept attachment's size from AUTHORITATIVE storage metadata via `getStorageObjectInfo(supabase,
  a.storagePath ?? a.url)` (the SAME helper the new-attachment path uses) BEFORE persist / `buildMemoryMediaPayload`;
  only `size` is corrected (`{...a, size}` when `exists && size!=null`, else unchanged — no data loss), order
  preserved (`Promise.all`). Multipart fix is in the ROUTE (shared `normalizeAttachments`/`handleMemoryMediaUpload`
  byte-unchanged); url/name/type/mimeType/path/schema/cover/API-shape/ownership-guard unchanged; the pre-existing
  final `isOwnedStoragePath` guard 400-rejects foreign kept paths. Verified tsc/lint/build green + focused
  adversarial review (quota-bypass / client-trust / spoofing / TOCTOU / mixed-edits → HIGH FULLY ELIMINATED).
  Residuals PRE-EXISTING + orthogonal (orphan-object gap, non-forceable `size=null` fallback, create-shared
  TOCTOU, ledger `DISTINCT ON` duplicate-`id` dedup) — do NOT re-flag as new.
- **RC2 — Security Hardening** (production security posture; no feature/UI/architecture change). **Headers:**
  `next.config.js` adds CSP + HSTS + X-Frame-Options DENY + nosniff + Referrer-Policy + Permissions-Policy + COOP
  on every response (CSP kept Capacitor/Supabase-realtime/Stripe/OneSignal/Sentry-compatible; nonce tightening
  is FUTURE). **Rate limiting:** `lib/security/rate-limit.ts` (dependency-free in-memory sliding window, ONE
  config, fails open) on upload-url/memory-chat/memories-create/enrich/checkout/portal/export/delete/story-action,
  keyed by session user id (distributed store = operator upgrade). **Logging:** `lib/logger.ts` (debug/info
  DEV-ONLY) + removed the RAG **PHI leak** (`retrieve-memory-context`) + checkout `USER EMAIL` log + dev-gated
  webhook/checkout/create/insights. **Dead code:** deleted `/api/search`, `/api/create-reminder`,
  `/api/send-reminders` (kept `/api/search/global`; live cron `/api/cron/send-due-reminders`) + cleaned residual
  refs. **OWASP fixes** (MULTI-AGENT ASVS/API-Top-10 review — authz otherwise CLEAN, no IDOR): `POST
  /api/active-profile` write-time authz; scoped escaped `inviteCaregiver` lookup; middleware **fail-closed**;
  `send-notification` error-leak fix; `auth/logout` origin fix; `/api/health` SHA removal. Verified tsc/lint/build
  green + independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 blocking; all 6 non-blocking fixed).
  **Remaining:** HIGH memory-EDIT kept-attachment storage-quota bypass (deferred follow-up); product decision on
  Ask Remy / `memory-chat` AI quota gating. **RC2 PASSES → ready for RC3 (GDPR & Privacy Compliance).**
- **Memory Intelligence Engine V2** (ADDITIVE capability + data layer; the "advanced AI memory intelligence"
  post-launch item; NOT wired into any live path) — new subsystem `lib/remy/memory-intelligence/`: adaptive
  importance scoring, relationship weighting (`people.role`→tier), deterministic decay (pinned + medical/
  emergency/health never decay; milestone slow; recall rewinds age), reinforcement (confidence; future
  feedback), cached classification (free-form `ai_category`→controlled taxonomy; medical/emergency bias only on
  a real keyword hit → keyword-less falls through to `miscellaneous`), event clustering, forgotten detection,
  and a configurable combined ranking (Semantic+Importance+Relationship+Recency+Reinforcement+Confidence). ONE
  central config `config.ts`; pure deterministic engines (no clock/DB/`Math.random`) + a service-role `store.ts`
  (batch reads = no N+1; user-scoped writes; lazy defaults; never throws) + migration
  `20260711140000_memory_intelligence.sql` (NEW `memory_intelligence` side table — never alters `memories`; RLS
  select-own + service-role writes; `reinforce_memory`/`backfill` SECURITY DEFINER, no IDOR; reversible).
  Revives the dead `ai_importance` string; reuses (not rebuilds) `match_memories`/enrichment/existing clusters/
  `retrieval.ts`. **DORMANT:** nothing imports it — `executeConversation` + wrapper each still ONE caller (ONE
  execution path); provider layer / Ask Remy / story pipeline / billing / quota / dashboard byte-unchanged; no
  OpenAI import. NO existing source file modified. Verified tsc/lint/build green + 28-assertion runtime formula
  check + independent MULTI-AGENT adversarial review (7 lenses): 1 blocking (classification bias) + 1
  non-blocking (write scoping) → BOTH fixed + independently re-verified CLEAN. **Operator step:** apply the
  migration (persistence degrades silently until then). Activation into a retrieval path is a future phase.
- **AI Subscriptions, Quotas & Usage Dashboard** (production hardening; no provider/prompt/architecture
  redesign; still ONE execution path) — REAL subscription-aware quota enforcement replaces the Phase-26 dormant
  architecture. **Entitlements** = ONE config `lib/ai/usage/entitlements.ts` (`AI_PLAN_LIMITS` by `BillingPlan`:
  FREE 5/day + 50/month; PREMIUM/FAMILY/ENTERPRISE unlimited) + `resolveAiEntitlement` (on `resolveSubscription`).
  **Quota** (`lib/ai/usage/quota.ts` `canExecuteConversation`) is structured (allowed/tier/reason/remaining/
  upgrade), premium-bypass (no DB read), Free enforced on SUCCESSFUL counts, never throws. **Enforcement is a
  PRE-check in the story action** (before the pipeline build) → structured `status:"quota_exceeded"` with NO
  provider call; the wrapper's dormant gate was removed. **iOS anti-steering:** upgrade copy web-only
  (`useIsNativePlatform`), no purchase link on native. **Dashboard/API/settings:** `lib/ai/usage/overview.ts`,
  `components/remy/AiUsageDashboard.tsx`, display-only `/settings/ai` (+ a `/settings` link), `GET
  /api/remy/usage` (auth-gated, per-user, mobile-ready). **Admin analytics** `lib/ai/usage/admin-analytics.ts`
  is SERVER-ONLY (no public route). **Migration** `20260711130000_ai_usage_analytics.sql` (service-role-only
  SECURITY DEFINER aggregates; no IDOR). Provider-independent (provider/model via the registry seam; the
  missing-key classifier is now message-based — no `OPENAI_API_KEY` probe). `executeConversation` + provider
  layer + engines + story-pipeline + Ask Remy + `RemyRelationship` + `cost.ts` + `package.json` byte-unchanged;
  ONE exec caller (wrapper), ONE wrapper caller (action). Independent MULTI-AGENT adversarial review CLEAN (7
  lenses, 0 confirmed blocking; provider-independence fix applied). **Operator step:** apply BOTH `ai_usage`
  migrations (+ `SUPABASE_SERVICE_ROLE_KEY`, already set). Known limitation (not a blocker): read-then-act soft
  quota (negligible with the serialized UI). tsc/lint/build green.
- **AI Usage, Billing & Observability** (production hardening; instrumentation only) — every real AI execution
  now records user/workspace/provider/model/operation/REAL-tokens/latency/estimated-cost/status/error_code to a
  new **`ai_usage`** table. Instrumentation lives in **`lib/remy/execute-conversation-with-usage.ts`** — the
  wrapper that is now `executeConversation`'s SINGLE caller (honours the Phase-24 LOCKED "no persistence inside
  `executeConversation`"; `executeConversation` + the whole provider layer byte-unchanged). **ONE execution
  path** (the wrapper is a decorator, not a second path). New `lib/ai/usage/{cost,ai-usage,quota}.ts`: the
  SINGLE isolated model-aware cost layer (`estimateCostUsd`; unknown→0), `classifyAiError` +
  `recordAiUsage` (service-role, scoped by explicit user_id; NEVER throws AND never hangs — swallow + 3 s
  timeout), and quota architecture (`getUsageToday/ThisMonth/EstimatedMonthlyCost/canExecuteConversation` —
  NOT enforced; default unlimited → always allow, no DB read). Migration
  `supabase/migrations/20260711120000_ai_usage_foundation.sql`: table + indexes + RLS (select-own; inserts
  service-role only) + a service-role-only `SECURITY DEFINER` `ai_usage_summary` aggregate (no IDOR). Uses REAL
  provider values; **INERT until the operator applies the migration** (degrades silently → deploy is a no-op).
  Provider registry + deterministic engines + `RemyRelationship` + Ask Remy + `executeConversation` byte-unchanged;
  no OpenAI import outside the provider layer; `package.json` unchanged. Independent MULTI-AGENT adversarial
  review CLEAN (7 lenses, 0 confirmed blocking; 2 worthwhile fixes applied — bounded log-write timeout +
  per-user gate). **Operator step:** apply the migration (+ `SUPABASE_SERVICE_ROLE_KEY`, already set) to
  activate logging. Follow-ups (not blockers): no usage UI; quotas not enforced; no retention/rollup.
  tsc/lint/build green.
- **Live Conversation Integration** (the FIRST user-facing AI execution of the conversation platform) — a new
  opt-in **`/remy/story` "Remy narrates your story"** surface invokes `executeConversation` on a user tap.
  **Investigation finding:** the deterministic pipeline is NOT a question flow (it's an app-open life-story
  analysis in `RemyRelationship`), and the real Ask Remy chat is a separate live AI layer — so the operator
  chose a new, isolated, opt-in surface (wiring into `RemyRelationship` would fire a paid call every app-open;
  splicing into the live chat needs a forbidden redesign). **4 new files + 1 tiny edit:**
  `lib/remy/story-pipeline.ts` (PURE orchestrator sequencing the EXISTING 12 engines in `RemyRelationship`'s
  exact order → `{ conversationComposition, conversationRender, answerAssembly }`; flat file to avoid a
  basename clash with `lib/remy/conversation.ts`), `app/(app)/remy/story-action.ts` (`"use server"`
  `narrateStoryConversation()` — auth-gated + workspace-scoped snapshot mirroring
  `/api/remy/relationship-snapshot` → orchestrator → **`executeConversation`** → structured result that NEVER
  throws; **server-authoritative** — client supplies nothing; 0 memories → `"empty"` w/o a provider call;
  failure/unconfigured `OPENAI_API_KEY` → `"unavailable"`), `components/remy/RemyStoryConversation.tsx`
  (client button → `.text` + `AIDisclaimer`), `app/(app)/remy/story/page.tsx` (the page); **edit**
  `app/(app)/remy/page.tsx` (one discovery `<Link>`). **`executeConversation` now has exactly ONE caller — no
  dormant seam remains.** Reuse-not-redesign: the live chat, `RemyRelationship`/app-open path, every engine,
  and the entire provider layer are byte-unchanged; no OpenAI import outside the provider layer;
  `package.json` unchanged. Requires a server `OPENAI_API_KEY`; iOS purchase-compliance unaffected.
  Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 confirmed blocking; 3 refuted-but-worthwhile
  robustness fixes applied + re-verified SOUND). Follow-ups (not blockers): no per-question quota/rate-limit
  on the story surface yet. tsc/lint/build green.
- **Production Provider Activation** (the FIRST end-to-end conversation execution path; still dormant) — one
  new file `lib/remy/providers/conversation-execution.ts` exporting async
  **`executeConversation(input): Promise<ConversationResponse>`** (input = the request engine's
  `ConversationRequestInput` = `{ conversationComposition, conversationRender, answerAssembly }`) that composes:
  **`buildConversationRequest(input)`** (pure Phase-20 request engine → `ConversationRequest`, incl.
  `prompt.full`) → **`getProductionProvider()`** (Phase-23 registry seam → `OpenAIProvider`) →
  **`provider.generateConversation(request)`** → `ConversationResponse`. The provider gets `request.prompt.full`
  EXACTLY as built (no rewrite/inject/enrich). NO intelligence; uses `getProductionProvider()` (never
  instantiates a provider, never imports OpenAI, never bypasses the registry); `ConversationRequest`/
  `ConversationResponse` + every engine preserved exactly. Lives in the provider layer (network boundary);
  imports only the pure `buildConversationRequest` from core (one-way providers→core; no cycle);
  side-effect-free import (no clock/`Math.random`/env/provider-construction at load — the LLM call is the only
  non-determinism, at `generateConversation`). The deprecated Phase-18 verbalizer (`buildConversationOutput`)
  is NOT in the live path (superseded by the request engine). DORMANT — nothing invokes it yet (no UI/route;
  NOT wired into `RemyRelationship`); Phase 25 wires it into a user-facing surface. Exactly ONE execution path,
  no duplicate resolution. Only the one new file changed (+ docs); all forbidden files byte-unchanged
  (`family-types`/request/verbalizer/composer/rendering/significance engines, all provider-layer files,
  `index.ts`, `RemyRelationship.tsx`, UI/routes/API, `package.json`). Independent MULTI-AGENT adversarial
  review CLEAN (7 lenses — execution-correctness / provider-correctness / architecture-purity /
  runtime-regression / platform-integrity / deterministic-execution / future-multi-provider-readiness — 0
  findings). tsc/lint/build green.
- **Provider Registry Activation** (registry = single authoritative resolver; still dormant) — makes
  `lib/remy/providers/provider-registry.ts` the ONE canonical conversation-provider resolver. Verified: nothing
  outside `lib/remy/providers/` imports/constructs/resolves a provider (the layer is fully DORMANT —
  `getConversationProvider` is not even called yet). Added a resolution-only production seam:
  **`PRODUCTION_PROVIDER: ProviderName = "openai"`** (a fixed deterministic literal, never env-derived) +
  **`getProductionProvider()`** which delegates to `getConversationProvider(PRODUCTION_PROVIDER)` (single
  canonical resolver — no second path). Both RESOLVE ONLY — they return an adapter; they **never** call
  `generateConversation`, open a network connection, read env, or execute (Phase 24 will invoke the seam).
  `"openai"` → real `OpenAIProvider`; every other name → `DeferredProvider` (still THROWS `notImplementedError`,
  behaviour byte-unchanged). Registry construction stays deterministic (no network/SDK/env/clock at load or
  construction). Corrected now-false post-Phase-22 docstrings ("NONE implemented"/"always false"/"ONLY
  registered adapter") across `provider-registry.ts` + `conversation-provider.ts` + `provider-types.ts` —
  interface signatures + type definitions byte-identical (comment-only); the legacy `ProviderResult` (typed on
  the deprecated `ConversationOutput`) left byte-unchanged. Only those 3 provider-layer files changed (+ docs);
  NO runtime activation, NO UI/routes/API/significance/RemyRelationship/`family-types`/`ConversationRequest`/
  `ConversationResponse`/`package.json` change. Independent MULTI-AGENT adversarial review CLEAN (7 lenses —
  every raw finding adversarially refuted; 0 confirmed blocking). **Phase 24 will ACTIVATE** (wire
  `getProductionProvider()` into an execution path). tsc/lint/build green.
- **OpenAI Provider Adapter** (the FIRST real production provider) — `lib/remy/providers/openai-provider.ts`
  (new) `OpenAIProvider implements ConversationProviderAdapter`, registered for `"openai"` in
  `provider-registry.ts`. PURE EXECUTION layer: sends `request.prompt.full` to OpenAI EXACTLY as supplied (no
  rewrite/inject/reorder/enrich), passes `request.citations` through unchanged, returns a `ConversationResponse`
  (text/provider/model/usage/status/citations/metadata); NO intelligence. The official OpenAI SDK + network +
  env + async are ISOLATED in the adapter (SDK was already a dependency — no `package.json` change);
  construction is side-effect-free (env/client lazy). SDK/network errors are wrapped in `ProviderError` (no
  leak); no retries/timeouts/fallbacks yet. DORMANT — nothing invokes it (server-side, env-gated on
  `OPENAI_API_KEY`); the deterministic pipeline and app runtime are unchanged. `getConversationProvider("openai")`
  now returns the real adapter; deferred providers preserved for all other names. Only `provider-registry.ts` +
  the new adapter changed; everything else (incl. `family-types.ts`/`ConversationRequest`/`ConversationResponse`
  and `package.json`) byte-unchanged. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings).
  **Known follow-up STILL OPEN:** reconcile `ConversationProvider` (5) ↔ `ProviderName` (8) before a real
  adapter for the divergent providers. tsc/lint/build green.
- **Conversation Provider Migration** (provider abstraction type-migration) — PURE, types-only,
  behaviour-preserving migration of the provider abstraction from the legacy `ConversationOutput` to
  `ConversationRequest` → `ConversationResponse`. The `ConversationProviderAdapter` interface is now
  `generateConversation(request: ConversationRequest): Promise<ConversationResponse>`; `DeferredProvider`'s
  body is byte-unchanged (still synchronously throws `notImplementedError` — no async introduced, no real
  provider, no network/SDK). `ConversationOutput` marked `@deprecated` but RETAINED (verbalizer/RemyRelationship/
  index.ts/ProviderResult still use it and compile; no new lint warnings). Only 3 files changed
  (conversation-provider.ts, provider-registry.ts, family-types.ts); all other engines byte-unchanged; no
  wiring/UI/significance change. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 confirmed
  blocking). **Known follow-up (pre-existing, non-blocking):** reconcile `ConversationProvider` (5 values) ↔
  `ProviderName` (8 values) before a real adapter for gemini/azure-openai/ollama/lm-studio/custom-enterprise
  is built. tsc/lint/build green.
- **Conversation Request Engine** (provider request/response refactor) — PURE additive refactor separating the
  overloaded `ConversationOutput` (a "provider request" with an empty `text`) into `ConversationRequest`
  (provider INPUT: prompt/contract/citations/metadata/summary — **no text**) + `ConversationResponse` (output
  foundation: text/provider/model/usage/status/citations/metadata — **no prompt**; filled by a future
  provider). `buildConversationRequest({ conversationComposition, conversationRender, answerAssembly })`
  produces a `ConversationRequest` ONLY (never a Response), carrying the same deterministic request info the
  verbalizer produces (migration-safe drop-in). NO intelligence, NO provider/network/SDK/fetch/async, NO
  wiring/UI/index.ts export/significance change, NO existing engine modified — only `family-types.ts`
  (additive) + the new engine changed. **`ConversationOutput` retained** (backwards compat). Independent
  MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Conversation Provider Interface** (the provider ABSTRACTION layer) — 4 pure files under
  `lib/remy/providers/` (provider-errors / provider-types / conversation-provider / provider-registry) that
  establish the `ConversationProviderAdapter` interface + provider types + a deterministic registry. **It
  does NOT connect to OpenAI/Anthropic/Gemini/Azure/Ollama or any network — NO fetch/SDK/async/wiring.** The
  `DeferredProvider` stub `generateConversation` simply THROWS "Provider not implemented." (sync, not async);
  future adapters (OpenAI/Anthropic/Gemini/Azure OpenAI/Ollama/LM Studio/Custom Enterprise) are documented but
  NONE implemented (each is the ONLY place a fetch/LLM call may live). NO existing file changed (git diff HEAD
  = pbxproj only); no UI/wiring/significance change; intentionally not exported from `@/lib/remy` (internal
  infra). Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Conversation Verbalizer Engine** (the FIRST provider-boundary layer) — PURE, deterministic, SYNCHRONOUS
  engine that consumes ONLY the `ConversationComposition` (+ render/assembly) and assembles the deterministic
  PROVIDER REQUEST (`ConversationOutput`: text/citations/metadata/tokens/generation) a FUTURE provider
  adapter (OpenAI/Anthropic/…) would send — the strict prompt with the mandatory 7-clause PROMPT CONTRACT
  embedded verbatim, citations back to real ids, and provider/token/generation metadata. **The actual LLM
  verbalization is DEFERRED**: the engine makes NO network/LLM call; `text=""`, `verbalized=false`,
  `status="deferred"`. A real provider ADAPTER (the ONLY place a fetch/LLM call may live) is NOT built. It
  does NO intelligence (every refId resolves from an existing referencePlan). **Deterministic vs
  non-deterministic boundary:** all inputs + this output are deterministic; the only non-determinism (a
  future LLM's wording) is not in this output; the LLM may choose wording but NOT content. **Feeds NOTHING**
  — NO significance-engine change, NO prior deterministic engine changed; computed then `void`-ed. No UI
  change (one RemyMomentChip). Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings).
  tsc/lint/build green.
- **Conversation Composer Engine** (the FIRST natural-language-planning layer) — PURE engine that adds NO
  intelligence: it consumes ONLY the `ConversationRender` + the `AnswerAssembly` it renders (+ optional
  style/audience/intent controls) and prepares a deterministic COMPOSITION PLAN
  (`ConversationComposition`: sections/paragraphs/sentencePlans/referencePlans/flow/metadata/context/
  summary) of how a FUTURE LLM/API provider would compose the answer. It generates NO language (sentence
  plans are structural roles opening/topic/evidence/transition/closing — never text), performs NO
  retrieval/ranking/reasoning/chronology/significance/fact-decisions, and reference plans point at real
  ids (kind via a `kindMapOf` join). Every field is a structured id/enum/number; empty render → empty
  composition. **Deliberately feeds NOTHING** — NO significance-engine change, NO prior deterministic
  engine changed; computed then `void`-ed in RemyRelationship (consumer = future LLM/API layer). No UI
  change (one RemyMomentChip). Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings).
  tsc/lint/build green.
- **Conversation Rendering Engine** (the FIRST presentation-layer engine) — PURE engine that adds NO
  intelligence: it consumes ONLY the `AnswerAssembly` (+ optional tone/verbosity/perspective controls) and
  prepares deterministic RENDER INSTRUCTIONS (`ConversationRender`: sections/metadata/summary/context) for a
  FUTURE conversational/LLM layer. It does NOT retrieve/reason/rank/build-chronology/generate language —
  **NOT chat/GPT/LLM.** Sections = top-maxSections assembly sections as render instructions (structural
  `render-<sectionId>` id + style hint + importance + real evidence ids); metadata opening/closing are
  structural section-id pointers (never text); every field is a structured id/enum/number; empty assembly →
  empty render. **Deliberately does NOT feed significance** (presentation, not a memory signal) — NO
  significance-engine change; computed then `void`-ed in RemyRelationship (consumer = future layer). No UI
  change (one RemyMomentChip); NO prior deterministic engine changed. Independent MULTI-AGENT adversarial
  review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Answer Assembly Engine** (the FINAL deterministic intelligence layer) — PURE engine assembling ONLY
  the structured, FACTUAL answer package a FUTURE conversational layer will VERBALIZE (`AnswerAssembly`:
  sections/chronology/evidence/entity-lists/coverage/context/summary). **NOT chat, NOT GPT, NOT an LLM,
  generates NO answers.** Sections = answer-plan steps as structured sections (fixed map); chronology =
  real life-story chapters ordered (ids/order/confidence); evidence/references = real entities aggregated/
  deduped/ranked/bounded (+ each memory's real biography chapter, memories graph-ranked); coverage =
  structured 0–100 metrics. No prose/answers, no invented ids, zero output when data absent; all 9
  required inputs genuinely consumed. INTERNAL (not shown); sits after answer-planning; its per-memory
  section weight feeds significance (final clean optional context extension). No snapshot/DB/UI change;
  downstream pipeline order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0
  findings). tsc/lint/build green. **Completes the deterministic intelligence stack** — the next Remy
  layer would be the conversational/LLM rendering layer (separate approved phase).
- **Answer Planning Engine** — PURE engine building the deterministic EXECUTION PLAN a FUTURE
  conversational layer will run after Question Understanding (`AnswerPlan`: steps/sources/context/coverage/
  summary). **NOT chat, NOT GPT, NOT an LLM, produces NO answers.** Steps = ordered structured retrieval
  steps, each executing a real question intent (fixed intent→step map; `place`→no step; `reference` step
  kind reserved); sources = the real entity pool (memory sources ranked by real graph connectivity, +
  biography chapters/milestones/optional significant+favourites). No prose/answers, no invented ids; all 8
  required inputs genuinely consumed. INTERNAL (not shown); sits after question-understanding; its
  per-memory step weight feeds significance (clean optional context extension). No snapshot/DB/UI change;
  downstream pipeline order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0
  findings). tsc/lint/build green.
- **Question Understanding Engine** — PURE engine building the deterministic retrieval-intent layer a
  FUTURE conversational layer will use to convert a PARSED question into structured intent
  (`QuestionUnderstanding`: intents/focus/constraints/references/context/summary). **NOT chat, NOT GPT,
  NOT an LLM, takes NO free-text.** Intents = answerable retrieval intents (13 kinds), each from a real
  upstream entity; the `place` kind is NEVER produced (no location data — a no-backing kind yields zero,
  never a fabricated one). Focus/constraints/references are real structured ids only; no natural language,
  no invented ids. INTERNAL (not shown); sits after conversation-foundation; its per-memory intent weight
  feeds significance (clean optional context extension). No snapshot/DB/UI change; downstream pipeline
  order preserved. Independent MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build
  green.
- **Conversation Foundation Engine** — PURE engine building the deterministic groundwork a FUTURE
  conversational layer will consume (`ConversationFoundation`: topics/threads/references/context/summary).
  **NOT chat, NOT GPT, NOT an LLM, NOT prompts, NOT generated text.** Topics = real recurring subjects
  (anchor/theme/person/life-stage, each ≥ MIN_TOPIC_MEMORIES; "other" excluded, anchor-themes not
  duplicated); threads = a topic's memories grouped by the real biography chapter; references point ONLY at
  real ids (bounded). No invented topics/threads/memories/people/dates; no narration/prompts. INTERNAL (not
  shown); sits after biography; its per-memory topic weight feeds significance (clean optional context
  extension). No snapshot/DB/UI change; downstream pipeline order preserved. Independent MULTI-AGENT
  adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Biography Engine** — PURE engine assembling a STRUCTURED (non-prose) representation of a life from
  the real journey/life-story/reasoning/graph/understanding layers (`BiographyAnalysis`: sections/periods/
  references/coverage/summary). Sections mirror real life-story chapters 1:1 (title reuses the real chapter
  title); periods group by life stage using only real years (0 when undated); references point ONLY at
  real journey/chapter/anchor/theme/person/memory ids (bounded); coverage/summary are structured metrics.
  No paragraphs/narration, no fabricated memories/people/dates/chronology. INTERNAL (not shown); sits after
  reasoning; its per-memory section coverage feeds significance (clean optional context extension). No
  snapshot/DB/UI change; downstream pipeline order preserved. Independent MULTI-AGENT adversarial review
  CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Reasoning Engine** — PURE engine reasoning over the real journey/life-story/graph/understanding
  layers to derive Remy's structural understanding OF a life (`ReasoningAnalysis`: anchors/themes/
  influences/relationshipStrengths/gaps/summary): Life Anchors (dominant pillars — `"other"` never
  anchors, `≥ MIN_ANCHOR_MEMORIES`), Life Themes, Life Influences (real memory/journey/graph signal),
  Relationship Strengths (counts only, no emotional reading), Memory Gaps (FACTUAL only — never a guess
  at WHY). All structured numbers, no prose; no GPT, no fabricated anchors/people/dates/chronology.
  INTERNAL (not shown); sits after life-story; its per-memory anchor strength feeds significance (clean
  optional context extension). No snapshot/DB/UI change; downstream pipeline order preserved. Independent
  MULTI-AGENT adversarial review CLEAN (7 lenses, 0 findings). tsc/lint/build green.
- **Life Story Engine** — PURE engine assembling the canonical CHRONOLOGICAL life story from real
  journeys (`LifeStoryAnalysis`: story/chapters/timeline/milestones/summary) — the source for future AI
  conversation / biography / timeline UI / story-book export / reasoning. Chapters = runs of
  chronologically-continuous, CONNECTED journeys (join only when years continuous [dated gap
  `> MAX_HARD_GAP` always splits], life stages compatible, AND a real relational signal supports it);
  disconnected journeys never merged, chapters/years/events never invented, timeline/milestones/titles
  reference only existing journeys/years/memories (no prose). Undated → year 0 (never fabricated).
  INTERNAL (not shown); sits after journey; its per-memory life-story centrality feeds significance
  (clean optional context extension). No snapshot/DB/UI change; downstream pipeline order preserved.
  Independent MULTI-AGENT adversarial review CLEAN (4 lenses × 12 points, 0 findings). tsc/lint/build green.
- **Journey Engine** — PURE engine turning the understanding + graph layers into complete LIFE JOURNEYS
  (`JourneyAnalysis`: journeys/connections/summary) — connected memories representing one continuous life
  period (School Years / Career / Family Holidays / Medical Journey / …). Journeys emerge from REAL signals
  only (theme + life stage + shared people + chronological continuity + graph connectivity); unconfident
  groups (below MIN_JOURNEY_SIZE or split by a large real gap) are left separate — never force-merged;
  undated memories never fabricate a year. No GPT/fabricated journeys/years/links. INTERNAL (not shown);
  sits after memory-graph; its per-memory journey significance feeds significance (clean optional context
  extension). No snapshot/DB/UI change; downstream pipeline order preserved. Adversarial review CLEAN
  (12/12, no blocking issues). tsc/lint/build green.
- **Memory Graph Engine** — PURE engine turning the understandings into a deterministic semantic graph
  (nodes/edges/clusters) of how memories connect — edges from REAL shared attributes only (same-person/
  family/theme/chapter/year/category/event/life-stage), weighted, pruned + capped; theme clusters. No
  GPT/fabricated links. INTERNAL (not shown); sits after memory-understanding; its edge-degree feeds
  significance (clean optional context extension). No snapshot/DB change. Adversarial review CLEAN
  (12/12; the flagged event/category double-count was fixed). tsc/lint/build green.
- **Memory Understanding Engine** — PURE engine at the front of the pipeline turning each REAL memory
  into a structured `MemoryUnderstanding` (themes/life-stage/importance/richness/relationship/confidence;
  deterministic, real-data-only, no prose/GPT/fabrication). INTERNAL (not shown); feeds the richness
  ratios today, exported for future engines. Pipeline: snapshot → memory-understanding → story → …
  No snapshot/DB change (reads the Phase-5-enriched DatedMemory). Adversarial review CLEAN (12/12).
  tsc/lint/build green.
- **Emotional Intelligence Engine** — Remy understands PEOPLE + emotional SIGNIFICANCE (not quantity).
  Three PURE engines (`significance-engine` ranks by significance not recency; `emotional-engine` →
  `EmotionalProfile`; `personality-engine` → behavioural traits — raw scores NEVER exposed).
  `relationship-engine` consumes the profile → 5 new observations. Pipeline wired in `RemyRelationship`
  (snapshot→story→favourite→anniversary→significance→emotional→personality→relationship→priority→one
  renderer); snapshot enriched with real `attachments`/`ai_importance`/`memory_person_links`/historical.
  Adversarial review CLEAN (12/12). tsc/lint/build green.
- **Living Relationship System** — long-term behavioural relationship (NOT AI/chat/notifications/poll).
  Six PURE engines (relationship/story/anniversary/favourite/legacy/legacy-export, `lib/remy/core/*`)
  over REAL data (memories/people/dates; chapters inferred, anniversaries day-precision only), a
  once-per-app-open surface (`RemyRelationship`) over a read-only workspace-scoped snapshot loader
  (`/api/remy/relationship-snapshot`), a shared `RemyMomentChip` + `moment-gate` (one moment globally)
  + generic `selectMoment`, and relationship memory in persistence. Adversarial review CLEAN (14/14).
  tsc/lint/build green.
- **Companion Intelligence layer** — Remy notices meaningful things proactively (behavioural, NOT chat/
  notifications/polling). Two PURE core engines (`insights-engine` → observations, `priority-engine` →
  at most one), a once-per-app-open surface (`RemyMoments`) over a read-only workspace-scoped snapshot
  loader (`/api/remy/companion-snapshot`), and behavioural memory (last-visit/ack-stage/cooldowns) in
  the persistence layer. Extends the ONE platform (single renderer + persistence + core). Adversarial
  review CLEAN (12/12). tsc/lint/build green.
- **App-wide Remy companion layer** — Remy now reacts across the whole app via 3 shell-mounted surfaces
  (all render null until Remy reacts): `RemyScreenAwareness` (per-screen arrival reactions),
  `RemyMilestones` (milestone celebrations from REAL memory counts, persisted, no retroactive spam), and
  `RemyCelebration` (centre-stage feather-burst + sparkles + heart via the single `<Remy>` renderer +
  the real `goldenFeather` asset). Extended the ONE platform vocabulary (`screen.*`/`milestone.reached`)
  + centralized effects. Adversarial review caught + fixed one regression (celebration surface draining
  the Brain's replay buffer → event-bus `{replay:false}` option). tsc/lint/build green.
- **Living Nest companion increment** — new time-of-day platform layer (ambient lighting + moonlight at
  night + night→sleeping + time greeting), Nest evolution wired to **REAL memory counts** (6 stages
  Tiny→Sanctuary), centralized **framer-motion** "Remy offers actions" reveal (de-menu-ified) + ambient
  CSS life. Platform extended (not redesigned); single `<Remy>` renderer preserved. tsc/lint/build green.
- **Documentation synchronization system** — `docs/REMY_MASTER_STATE.md` established as the single
  source of truth; this HANDOFF slimmed to a continuation doc; CLAUDE.md startup read-order + 6-step
  maintenance protocol formalized.
- **The Nest — behaviour-driven companion** (`a97dfac`) — behaviour layer added to the Remy platform
  (`lib/remy/core/behavior.ts` + `nest.ts`); menu is a consequence of the `greeting` behaviour.
- **The Nest interaction hub** (`e73dc7e`) — replaced the center action-sheet; `RemyActionButton` retired.
- **Caregiver `access_level` enforcement on writes** (`f53694b`).
- **Subscription downgrade entitlement reconciliation** (`1f5420a`).
- **Owner-only caregiver revoke/remove** (`e0c2e81`).
- **Project Polaris** — all 8 UX passes (through `c6127ea`).

## Open issues
Authoritative list: master state → **KNOWN OPEN ITEMS**. Highlights (none block the web app):
- IMPORTANT (post-launch-soon): HTTP security headers + rate limiting (absent); memory edit/delete
  authz is `user_id`-scoped (fails safe, not `access_level`-parity); Ask Remy semantic retrieval is
  not premium-gated; remove dead routes (`/api/create-reminder`, `/api/send-reminders`,
  `/api/search`); `.env.local` CRON_SECRET newline.
- RLS applied-state (memories INSERT + relationship/cluster tables) is **dashboard-managed** — confirm
  in the Supabase SQL editor (not repo-verifiable).
- **Resolved — do NOT re-flag:** `memory-media` bucket is **PRIVATE** (PHI via signed URLs only; the
  old "bucket is public" note is obsolete); subscription→storage-tier is fully wired (not a stub);
  `access_level` IS enforced on writes; landing store buttons ARE wired to `/download`;
  `/api/stripe/cancel` exists; the `save-onesignal`/`save-subscription` endpoints were removed.

## Active branch
`main` (production; auto-deploys on push) — **unpushed, ahead of `origin/main` (`f53694b`)**: the Nest
hub (`e73dc7e`, `a97dfac`), the documentation-sync system (`7f65178`, `94088c3`, `ce0feb5`), the living
Nest companion increment (`a818fb0`), the app-wide Remy companion layer (`5598641`), the Companion
Intelligence layer (`ded5a4d`), the Living Relationship System (`ccfb907`), the Emotional Intelligence
Engine (`cc768a9`), the Memory Understanding Engine (`63e944e`), the Memory Graph Engine (`d6cfb9c`),
the Journey Engine (`11afd67`), the Life Story Engine (`c9b3c93`), the Reasoning Engine (`96e6ce0`), the
Biography Engine (`984f4b6`), the Conversation Foundation Engine (`96ee7b7`), the Question
Understanding Engine (`3489d40`), the Answer Planning Engine (`45f9314`), the Answer Assembly Engine
(`c46a4f2`), the Conversation Rendering Engine (`74b96d1`), the Conversation Composer Engine (`0c8c91f`), the
Conversation Verbalizer Engine (`ce058dc`), the Conversation Provider Interface (`544f714`), the
Conversation Request Engine (`ff11123`), the Conversation Provider Migration (`04c65c2`), the OpenAI
Provider Adapter (`e7b572c`), the Provider Registry Activation (`689f917`), the Production Provider
Activation (`a92e9f7`), the Live Conversation Integration (`3c3a7a5`), the AI Usage/Billing/Observability
(`88dd366`), the AI Subscriptions/Quotas/Usage-Dashboard (`5b6a607`), the Memory Intelligence Engine V2 (`761d3e0`), and
the RC2 Security Hardening increment on top. **Not pushed** — pushing auto-deploys to prod, so it is an
operator decision. **Operator steps to activate AI features:** apply `20260711120000_ai_usage_foundation.sql` +
`20260711130000_ai_usage_analytics.sql` + `20260711140000_memory_intelligence.sql` + set a server
`OPENAI_API_KEY` (usage logging, quota enforcement, `/settings/ai`, `/api/remy/usage`, `/remy/story`
generation, and Memory-Intelligence-V2 persistence are all no-ops / degrade until then). **RC2 note:** a
distributed rate-limit store (Upstash/Redis) is the operator upgrade for multi-instance guarantees.
tsc/lint/build green.

## Next priorities
Single next task (master state → **NEXT RECOMMENDED TASK**): **UGC report/block + EULA abuse clause
(Apple Guideline 1.2)** — the last App-Store-required engineering feature before submission. After
that: HTTP security headers + rate limiting. All other launch work is operator/product/legal — see
master state → **CURRENT LAUNCH BLOCKERS**.

## Blockers
**Infrastructure: NONE** (B1/B2/B3/B5 done; B4 PITR deferred by accepted decision). The remaining
launch gate is one engineering feature (UGC report/block, Apple 1.2) plus operator/product/legal
steps (apply prod migrations, set Vercel env, push commits, legal jurisdiction, contact mailboxes,
store assets + submission). Full ENG/PRODUCT/LEGAL/OPERATOR split: master state → CURRENT LAUNCH BLOCKERS.

## Recent commits
- *(HEAD)* chore(security): RC2 Security Hardening — headers + rate limiting + PHI-log removal + dead-code + OWASP fixes
- `761d3e0` feat(remy): Memory Intelligence Engine V2 — additive importance/decay/reinforcement/ranking + data layer
- `5b6a607` feat(remy): AI Subscriptions, Quotas & Usage Dashboard — real quota enforcement + usage dashboard/API
- `88dd366` feat(remy): AI Usage, Billing & Observability — usage/cost logging around the single execution path
- `3c3a7a5` feat(remy): Live Conversation Integration — first user-facing AI execution (/remy/story, opt-in)
- `a92e9f7` feat(remy): Production Provider Activation — first end-to-end conversation execution path (dormant)
- `689f917` feat(remy): Provider Registry Activation — registry is the single authoritative resolver (dormant)
- `e7b572c` feat(remy): OpenAI Provider Adapter — first real production provider (isolated SDK, dormant)
- `04c65c2` feat(remy): Conversation Provider Migration — migrate provider abstraction to request/response
- `ff11123` feat(remy): Conversation Request Engine — dedicated provider request/response model
- `544f714` feat(remy): Conversation Provider Interface — provider abstraction layer
- `ce058dc` feat(remy): Conversation Verbalizer Engine — provider boundary and natural language generation
- `0c8c91f` feat(remy): Conversation Composer Engine — first NL-planning layer, deterministic composition plan
- `74b96d1` feat(remy): Conversation Rendering Engine — first presentation layer, deterministic render metadata
- `c46a4f2` feat(remy): Answer Assembly Engine — final deterministic factual answer package (no answers)
- `45f9314` feat(remy): Answer Planning Engine — deterministic execution plan (no generated answers)
- `3489d40` feat(remy): Question Understanding Engine — deterministic retrieval-intent layer (no free-text)
- `96ee7b7` feat(remy): Conversation Foundation Engine — deterministic groundwork for a future chat layer
- `984f4b6` feat(remy): Biography Engine — pure structured (non-prose) representation of a life
- `96e6ce0` feat(remy): Reasoning Engine — pure structural reasoning about a life over the real layers
- `c9b3c93` feat(remy): Life Story Engine — pure canonical chronological life story from journeys
- `11afd67` feat(remy): Journey Engine — pure deterministic life journeys from understanding + graph
- `d6cfb9c` feat(remy): Memory Graph — pure deterministic semantic links between memories
- `63e944e` feat(remy): Memory Understanding — pure per-memory semantic engine (front of pipeline)
- `cc768a9` feat(remy): Emotional Intelligence — significance/emotional/personality engines
- `ccfb907` feat(remy): Living Relationship System — relationship/story/anniversary/favourite/legacy engines
- `ded5a4d` feat(remy): Companion Intelligence — insights + priority engines, proactive moments
- `5598641` feat(remy): app-wide companion — screen awareness, milestone celebrations, effects
- `a818fb0` feat(remy): living Nest companion — time-of-day, real-count evolution, framer-motion
- `ce0feb5` docs(sync): reconcile all docs to HEAD — lightweight HANDOFF, exact startup order
- `94088c3` docs(sync): conform REMY_MASTER_STATE header to finalized workflow spec
- `7f65178` docs(sync): establish REMY_MASTER_STATE.md single source of truth
- `a97dfac` fix(remy): make the Nest a behaviour-driven companion, not a prettier FAB
- `e73dc7e` feat(nav): replace center action-sheet with the Nest interaction hub
- `f53694b` feat(caregiver): enforce access_level on care-profile writes
- `1f5420a` feat(billing): reconcile caregiver entitlement on subscription downgrade
- `e0c2e81` feat(care): owner-only caregiver revoke/remove access
- `c6127ea` feat(ux): Project Polaris Pass 8 — calmer Reminders
- `c0f0496` feat(ux): Project Polaris Pass 7 — calmer Settings
- `e9d4f4f` feat(ux): Project Polaris Pass 6 — calmer Library
- *(Project Polaris passes 1–5 and the full prior history remain in `git log`.)*
