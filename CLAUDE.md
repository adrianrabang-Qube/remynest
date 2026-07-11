# RemyNest — Claude Workflow (authoritative)

The **single source of workflow truth**. `/docs` is the source of **content truth**.
Do not create parallel workflow/instruction files — enhance this one.

## Start every session (mandatory) — Session Continuity Rule

**Mandatory startup READ ORDER — do not skip, do not reorder:**
- **Step 0 — `docs/REMY_MASTER_STATE.md`** — the single authoritative source of truth (launch %,
  current/next task, VERIFIED COMPLETE, DO NOT REBUILD, LOCKED architecture decisions, launch
  blockers, open items). **Continue from its CURRENT TASK.**
- **Step 1 — this `CLAUDE.md`** — the authoritative workflow + architecture decisions (relevant sections).
- **Step 2 — `docs/handoffs/HANDOFF_CURRENT.md`** — the lightweight continuation log (never overrides the master state).
- **Step 3 — only task-relevant architecture/feature docs** (`docs/architecture/*`, `docs/features/*`; doc map below).
- **Step 4 — only task-relevant source code.**

**SOURCE CODE ALWAYS WINS** over any doc — if a doc disagrees with code, fix the doc in the same
task. No rediscovery, no rebuilding finished systems, no repeating completed audits. Do **not**
re-suggest anything under the master state's VERIFIED COMPLETE / DO NOT REBUILD / POST-LAUNCH
sections unless the operator explicitly asks. **After every completed task, run the mandatory
6-step maintenance protocol** (`docs/REMY_MASTER_STATE.md` → Maintenance Protocol: verify source →
update master state → update HANDOFF → update this file only if architecture changed → verify docs
match source → continue) — never ask, never skip.

Then, for every task:
1. Read **only the docs relevant to the task** (map below). Trust docs over rediscovery.
2. **Do not scan unrelated files** or run repository-wide analysis unless the task
   explicitly requires an audit. Identify the smallest set of files first.
3. **Do not repeat investigations already documented** (the master state / HANDOFF / this file),
   and **do not reintroduce retired features or re-litigate already-approved decisions**
   (e.g. the Workspace-navigation note below — the My Nest drawer row is retired).
4. **Treat documented architectural decisions as source-of-truth** — follow them
   unless concrete evidence in the current code proves a doc is stale; if so, fix the
   doc in the same task rather than silently diverging.

Doc map → product/system: `docs/MASTER_SPEC.md` · feature: `docs/features/<x>.md` ·
architecture: `docs/architecture/{system-architecture,database-overview,api-overview}.md` ·
audit entry: `docs/architecture/project-map.md` · priorities:
`docs/roadmap/launch-roadmap.md` · prompt templates: `docs/CLAUDE_WORKFLOW.md`.

## Operating modes

### INVESTIGATION MODE — default
Any prompt that does **not** contain the literal `EXECUTION MODE`. Read-only; no
code/migration/infra changes. Output **exactly** these four sections, then STOP and
wait for approval:
- **Documents Read**
- **Understanding**
- **Suspected Files**
- **Investigation Plan**

### EXECUTION MODE — on keyword
Triggered when the prompt contains `EXECUTION MODE`. Run the full cycle **without
waiting for approval**: investigate → implement → test → `npm run lint` →
`npm run build` → validate → update docs → commit → report (Completion Protocol).

## Token efficiency
- Documentation is authoritative; prefer it over rediscovery.
- Read the minimum necessary; targeted reads over broad greps.
- Never repository-wide scan when targeted inspection works.
- Schema is dashboard-managed — verify FK/RLS/columns in the Supabase SQL editor,
  not by scanning code.

## Engineering rules
- **Auth is protect-by-default (`middleware.ts`, authoritative 2026-06-17):** every
  route is PROTECTED unless explicitly in `PUBLIC_ROUTES` (and the `(app)` route
  group is also auth-gated in its layout). Make a *genuinely public* page public by
  adding it to `PUBLIC_ROUTES`; do **not** reintroduce a PROTECTED_ROUTES allowlist
  (it silently bounced logged-in users on any forgotten authenticated route — the
  B1 launch blocker). New authenticated routes need no registration.
- Respect this auth model; RLS scoping (the service-role client
  **bypasses RLS** — scope every admin query by user id); **return structured
  results, never `throw`, for expected business rules** (Server Action errors are
  redacted in production); non-clinical AI language.
- **Infra / launch-blocker audit CLOSED (authoritative 2026-06-17):** B1 auth
  (protect-by-default), B2 storage privacy (`memory-media` bucket is **private** —
  PHI served via signed URLs only), B3 caregiver-authz RLS (`20260608180000`
  applied), and B5 prod env (Stripe LIVE + Sentry) are **DONE**. **B4 PITR is
  intentionally deferred post-launch (cost)** — daily backups are the recovery
  baseline (accepted coarser-RPO risk; enable PITR at scale). **Do not re-flag
  B1–B3/B5 or PITR as open launch blockers** — they are resolved/decided. The
  remaining V1 gate is product/App-Store work (e.g. Apple 3.1.1 / IAP), not infra.
- No `eslint-disable` / TS suppression; never weaken auth or validation; no Stripe
  or schema changes without approval.
- **iOS purchase compliance (Apple 3.1.1, authoritative 2026-06-17):** never surface
  Stripe / web-checkout / customer-portal purchase UI on native — gate every purchase
  entry point with `lib/platform.ts` (`useIsNativePlatform()` render guard +
  `isNativePlatform()` handler short-circuit). New purchase/upgrade UI must be
  **web-only**; on native show a neutral Premium-feature state with **no** external
  link or "subscribe on the web" text (anti-steering 3.1.3). Cancellation (no
  redirect) may stay. Do not reintroduce an un-gated checkout/portal CTA.
- Destructive / outward-facing actions (DB migration, deletion, Vercel, deploy) are
  **operator steps** unless explicitly authorized — provide the exact command.
- **`main` auto-deploys to production.** Don't commit/push/merge unless asked
  (EXECUTION MODE authorizes the commit step for the task at hand).

### Critical systems — do not break
Authentication · Supabase (RLS) · Stripe billing · OneSignal · memory CRUD ·
media uploads · timeline · search · memory chat · AI insights (non-clinical) ·
profile/workspace switching · caregiver workflows · GDPR export/delete.

**Workspace navigation (authoritative, 2026-06-17):** **"My Nest"** (the personal
workspace) navigation lives in the **profile dropdown** — `ProfileHub` renders the
"My Nest" entry, which closes the menu, calls `setPersonalWorkspace` (cookie), and
navigates to `/home`. Selecting it **switches to the Personal Workspace and
navigates to `/home`** — My Nest is **not a page; it is a workspace state**.
**Care-profile switching + management** (enter a care workspace, invite caregiver,
add a person) lives in the **workspace drawer** (`WorkspaceSelector`, in the header)
and is **preserved on both desktop + mobile**. The drawer's old "My Nest" row was
**intentionally retired** — rationale: eliminates the drawer's recurring overlay/
scroll-lock trap, removes the duplicate My-Nest navigation path, preserves the
workspace architecture, and improves mobile UX. There is **no dedicated "My Nest"
page** (it is a workspace context; its home is `/home`).
Do **not** reintroduce a "My Nest" row in the workspace drawer, a "Switch to My
Nest" button in `ProfileMenuItems`, or a dedicated My Nest route.

**WorkspaceSelector drawer must be portaled (authoritative, 2026-06-18):** the
`WorkspaceSelector` open-drawer overlay (`fixed inset-0`) is rendered via
`createPortal(…, document.body)`. This is **required**, not cosmetic: the selector
is mounted inside the `backdrop-blur-md` app headers (`MobileTopBar`, `AppNavbar`),
and a non-`none` `backdrop-filter` establishes the **containing block** for
`position:fixed` descendants on WebKit/iOS — so an *inline* (non-portaled) overlay
re-roots to the header box and leaks the "Manage care profiles"/"Create profile"
fragments under the status bar on Home/My Nest (the long-standing TestFlight
corruption; prior header/safe-area fixes missed it). **Do not** un-portal that
overlay, and **do not** render any new `fixed`/full-screen modal inline under a
`backdrop-filter`/`transform`/`filter` ancestor — portal it to `document.body`.

**Native iOS reminder notifications are device-local (authoritative, 2026-06-20):**
reminders are scheduled **on-device** via `@capacitor/local-notifications`
(`lib/native-reminders.ts` reconcile engine + `<NativeReminderSync>` mounted on the
reminders page) so they fire **offline / without OneSignal / cron / APNs**.
`reconcileLocalReminders` is a **no-op off native iOS** — web/Android keep the server
cron path (hybrid; the cron is the fallback, not removed). The engine reads existing
reminder columns only (no schema change). **iOS plugin linking is CocoaPods, not SPM:**
main's Xcode project links Capacitor plugins via the `ios/App/Podfile` `capacitor_pods`
function (+ `App.xcworkspace`), so `CapacitorLocalNotifications` was added **there**;
Capacitor-8 `cap sync`'s `CapApp-SPM/Package.swift` is **inert on main** (0 SPM refs in
the project) and is removed. **Do not** migrate main to SPM / re-add `CapApp-SPM`,
regenerate the iOS project (`cap add ios`), or replace the Podfile/AppDelegate — those
carry the **OneSignal native init + bridge/ack pod (`OneSignalXCFramework 5.5.2`)** and
the APNs entitlements (OneSignal and local notifications **coexist**). **Foreground
banner (authoritative, 2026-06-21):** OneSignal swizzles `UNUserNotificationCenter`
and owns the foreground path, so local reminders were silent while the app was open.
`AppDelegate` now conforms to `UNUserNotificationCenterDelegate` and sets
`center.delegate = self` **before** `OneSignal.initialize`, returning
`[.banner,.list,.sound,.badge]` for local (interval/calendar) triggers and `[]` for
remote pushes (`UNPushNotificationTrigger`) — OneSignal/push behavior unchanged. **Do
not** remove that delegate or move the assignment after `OneSignal.initialize`.
Activation is an operator step: `cd ios/App && pod install` + a native build. See
`docs/features/local-notifications.md`.

**Reminder system is STABLE/VERIFIED — PROTECTED (authoritative, 2026-06-21):** the
end-to-end reminder system was **operator-validated on a physical iPhone (TestFlight
Build 8)** — notification delivery PASSES on **lock screen, background, AND foreground**;
plus My Nest + Care create/store/schedule/dashboard and the Add Reminder form reset
(after create + workspace switch). It is **production-ready with no active defects**.
Treat it as **frozen**: do **not** modify reminder creation/scheduling logic,
`NativeReminderSync`, local-notification code, `AppDelegate` notification code, OneSignal
integration, the reminder dashboard, reminder workspace isolation, reminder delivery, or
the form-reset implementation (`app/(app)/reminders/page.tsx` form `key`) — **unless a
future bug report explicitly proves a NEW defect**. Reminder work is now **bug-fix only**
and **must begin with an investigation proving the defect** before any code change.

**Reminder Sprint 1 — CONFIRMED-defect fixes applied (authoritative, 2026-07-07,
supersedes the "no active defects" clause above):** a Verification Sprint PROVED (from
code) four defects the Build-8 delivery validation did not cover, and — under the freeze's
own "unless a NEW defect is proven" carve-out — Sprint 1 fixed them: **(1)** completing a
**recurring** reminder no longer ends the series — it advances `remind_at` to the next
occurrence (shared `lib/reminders/recurrence.ts`; UI button "Done for today"); Delete still
ends a series. **(2)** the cron `processing` lock now has a **lease/reclaim** (`processing_at`
col, `PROCESSING_LEASE_MS`) so a crashed/timed-out tick can't strand a reminder. **(3)**
`toggle`/`delete` server actions now do an authoritative fetch + `userCanAccessProfile`
(parity with create/`[id]`), scoped by the reminder's OWN owner/profile, not the cookie.
**(4)** native iOS **duplicate** (local + cron push) is de-duped: the device reports pending
locals (`<NativeReminderBeacon>` → `/api/reminders/native-active` → `reminder_local_confirmations`)
and the cron skips the redundant push for a fresh, user_id-matched confirmation while still
doing bookkeeping — **fails toward delivery** (never a silent miss). **The frozen native
scheduler stayed UNTOUCHED** (`native-reminders.ts`/`NativeReminderSync`/`AppDelegate.swift`);
the beacon only READS `getPending()`. All schema changes are **probe-gated (inert until the
operator applies the migrations** `20260707120000` + `20260707130000`), so the deploy is a
no-op until activated. **Still frozen/out-of-scope + unfixed:** the cron recurring-reschedule
**DST/month-end drift** (a separate proven defect, NOT fixed), and true single-delivery
certainty (needs an iOS Notification Service Extension — operator/native). Do **not** re-flag
the four fixed items; a future reminder change still requires a proven defect first.

**Two authoritative standards (Production Sprint 2, 2026-07-07):** **(A) The Stripe webhook
MUST return non-2xx when a required DB write fails.** `app/api/stripe/webhook/route.ts`
returns **HTTP 500** if any `profiles` write errors (so Stripe retries the whole event);
a `!data` "no matching row" stays **200** (not retryable — don't loop). Writes are idempotent
(`.eq(id|customer|subscription)`), so retries never duplicate state. Do **not** revert to
acknowledging (200) an event whose write failed — that silently desyncs premium/entitlements/
quota. **(B) Every write that accepts a workspace from the client-settable active-profile
cookie MUST app-layer-authorize it** with `userCanAccessProfile(user.id, activeProfileId)`
BEFORE the write — RLS alone is NOT sufficient (schema is dashboard-managed/unverifiable).
`createReminder`, `toggle/deleteReminder`, and now **`POST /api/memories/create`** all do this;
a null `activeProfileId` (My Nest) needs no check. **Known still-open (verify/fix later, per the
audit):** the `memories` INSERT **RLS** must be confirmed in the Supabase SQL editor; the memory
**edit** (`PUT /api/memories/[id]`) authorization was NOT part of this sprint — audit it before
relying on it. **Not production-ready** — the full audit (a11y, performance, security sweep,
PWA/offline, deep auth) was interrupted and is incomplete.

**Active development focus (authoritative, 2026-06-21): Memory Media Experience
Upgrade** — multi-media memories (reminders are done). **Phase 1: multiple photos per
memory** — reuse `memories.attachments` (jsonb array of `{url, name, mimeType}`) +
`cover_image_url`; **no schema redesign, backward compatible, no data-loss migration**.
Phases 2-4: gallery previews (Facebook-album grids) → detail carousel → full-screen
viewer. **Architect storage so future media (video/voice/audio/docs/PDF) add via the
`attachments` `mimeType` field without another attachment-system redesign.** Fold in the
memories/timeline **image-decode OOM** fix (serve thumbnails via
`lib/memory-media-signing.ts` + paginate). See `docs/roadmap/launch-roadmap.md`.

**Thumbnail Architecture (authoritative, 2026-06-22):** the image-decode OOM fix is
implemented as a **hybrid size ladder** served from the single stored original (the
`memory-media` bucket is **PRIVATE** + signed — never reintroduce a public bucket).
`lib/memory-media-signing.ts` mints **THUMB** (`400×400 cover q70`, feed/list) and
**MEDIUM** (`1080 contain q75`, detail + `PhotoViewer`) via the **SINGULAR**
`createSignedUrl(path, ttl, { transform })` (Supabase on-the-fly transforms, CDN-cached);
the **BATCH `createSignedUrls`** (untransformed) is always run first as the **hard
fallback** — do **not** drop it. `signMemories`/`signMemory` take `{ variant,
maxImagesPerMemory }`; **variant is optional — default (no variant) is byte-identical to
the untransformed baseline**, so leave search/create/reminiscence callers as-is. Each
image carries `fallbackUrl` (untransformed) for client recovery (`MediaThumb` 2-stage,
`PhotoViewer` per-slide, `CompactMemoryRow`). **Operator gate (authoritative):**
transforms require Supabase Image Transformations (**Pro plan**) **and** env
**`MEMORY_IMAGE_TRANSFORMS_ENABLED=true`**; **default OFF** is the no-regression
guarantee — the feature is inert until the operator enables both. `/api/memories` +
`/api/timeline` are **paginated** (`limit`/`offset` `.range`, default 50) to bound the
singular-signing fan-out; the memories feed client **aggregates pages into a flat array**
(do not convert the feed query to infinite-scroll — it would break the optimistic
create/edit/delete mutations). Do **not** re-flag thumbnails/pagination as a TODO. See
`docs/features/media-system.md`. Future-media previews (video poster, PDF first-page)
reuse the existing `attachment.thumbnailUrl` field — a stored-derivative branch, not yet
built.

**Media upload = DIRECT-TO-STORAGE, API is metadata-only (authoritative, 2026-06-24):**
media uploads **client → Supabase Storage directly** via signed URLs; `/api/memories/create`
+ PUT `/api/memories/[id]` receive **JSON attachment metadata, NEVER raw file bytes** — this
bypasses the ~4.5 MB Vercel function-body limit (large videos work). Flow: `POST
/api/memories/upload-url` (`lib/memory-direct-upload.ts` `uploadAttachmentsDirect`) →
`uploadToSignedUrl`. **Security invariants — do NOT weaken:** (1) storage paths are
**server-generated + owner-scoped** (`users/{userId}/...`) — the client never chooses a path;
(2) **quota is server-authoritative** — pre-checked at sign time AND **re-verified against the
REAL object size** (`getStorageObjectInfo`, `lib/storage/object-info.ts`) at create/edit, never
the client-reported size; (3) **every attachment path is owner-scoped** (`isOwnedStoragePath`)
on create AND edit **including the kept set** (a PUT that planted a foreign `users/{victim}/`
path let the RLS-bypassing service-role signer mint a signed URL for the victim's private
object — a final guard over the whole attachment set blocks it). The legacy multipart branch in
both routes is **dormant fallback (rollback only)** — do not route clients back to it. Care
isolation is unchanged (`memory_profile_id` from the server cookie context, not the client).
**Known follow-up (not a blocker):** orphan objects (uploaded, never attached) aren't
ledger-counted + there's no sweeper yet — add an orphan-sweep cron + a bucket object-size
limit. See `docs/features/media-system.md`.

**Memory create = insert-first, AI enrichment is DEFERRED (authoritative, 2026-06-24):**
`POST /api/memories/create` **uploads → inserts the row → returns immediately**; it does
**NOT** run AI synchronously. Awaiting `generateMemoryInsights`/`generateEmbedding` (and
`buildRelationships/clusters/people`) BEFORE the insert — with no `maxDuration` — was the
primary cause of Vercel function-timeout failures that **lost the memory entirely** (~95%
on device, Build 9 testing). The enrichment pipeline now lives in **`lib/memory-enrichment.ts`**
(`enrichMemory` — idempotent, fault-isolated, UPDATE-based) behind **`POST /api/memories/[id]/enrich`**
(`maxDuration=60`, owner-scoped), triggered **fire-and-forget by the client** after a
successful save. **Do NOT reintroduce synchronous AI/embedding/cognition on the create
request.** The enrichment LOGIC (people/relationship/cluster systems) is unchanged — only
relocated. **Known remaining limit:** media bytes still proxy through the function, so the
**~4.5 MB Vercel request-body limit** still 413s large videos/batches — the fix is
**direct-to-storage upload (client→Supabase, API metadata-only)**, PLANNED not built.
**Responsive nav breakpoint = `lg` (authoritative, 2026-06-24):** the mobile↔desktop nav
swap is gated at **`lg` (1024px)**, NOT `md` (768px) — landscape iPhones (~844–932px) must
keep the touch nav. `AppNavbar` `hidden lg:flex`; `MobileTopBar`/`MobileBottomNav`/
`MobileNavDrawer` `lg:hidden`; `WorkspaceSelector` drawer `max-lg:`/`lg:`; `<main>` `pb-24
lg:pb-6`. Do not revert these to `md`.

**Project Polaris — UX refactor, Pass 1 shipped (authoritative, 2026-07-08):** an app-wide
"calmer, simpler, Apple-quality, lower-cognitive-load" redesign; **presentation ONLY** — no
backend/auth/schema/API/business-logic changes, every feature preserved. Cadence:
**flagship-first, then page-by-page** (each page audited → implemented → validated). **Pass 1
(done): Dashboard + shell.** **(1) The bottom-nav center action is now Remy, not "+".** The
green "+" FAB was retired: the center slot renders the **Remy avatar** (`<Remy state="welcome">`
via the asset registry) and tapping it opens a **calm, portaled bottom action-sheet**
(`components/navigation/RemyActionButton.tsx` — **SUPERSEDED 2026-07-09:** the center is now the
behaviour-driven **Nest** [`components/navigation/nest/*`]; `RemyActionButton` was deleted — see the
authoritative "The Nest — Remy's living HOME, behaviour-driven" note below) with **existing routes only** — Ask Remy
(`/remy`), Add a memory (`/memories/new`), Add a reminder (`/reminders`). **No deferred
AI/conversation was built** — it only routes to surfaces that already exist. The sheet is
`createPortal(document.body)` (**required** — the host `MobileBottomNav` has `backdrop-blur`,
so a non-portaled `fixed` overlay would re-root on WebKit/iOS; same invariant as the
`WorkspaceSelector` drawer), focus-trapped (shared `useFocusTrap`), scroll-locked,
Escape-to-close, and threads the `context` query-param (care routing unchanged).
`FloatingCompanionButton` gained `variant "solid"|"nest"` (default `solid` = the old look,
unchanged) so the purple Companion/Remy avatar reads on a clean **nest** pedestal (never
purple-on-sage). **Do NOT reintroduce the "+" center FAB** or route the center button straight
to `/memories/new`. **(2) Dashboard IA** (`app/(app)/dashboard/page.tsx`): the ~20 stacked
widgets are regrouped into a calm progression — Greeting → Attention alerts → **Today** →
**Jump back in** → **People** → **Insights** (a summary tile → `/insights`) → **Account &
storage** — with the heavy Remy analytics + account cards collapsed into a zero-JS,
keyboard-accessible native-`<details>` `CollapsibleSection` (**children stay MOUNTED when
collapsed**, so telemetry effects still run). The **async data body is byte-unchanged**; only
the `return` JSX changed and **every widget is preserved** (nothing removed — only relocated).
**Do NOT re-stack all dashboard widgets** into one flat scroll or re-flag the analytics
overload as an open issue. **Deferred to later Polaris passes:** the reminders page is
**presentation-only when reached** (its FROZEN scheduling/sync/delivery/form-reset stay
untouched); Search, Timeline, Library, and Settings remain to be redesigned.

**Project Polaris — Pass 2 shipped (authoritative, 2026-07-08): Home + Memories.**
Presentation-only (no data/logic/query/mutation change). **Memories**
(`app/(app)/memories/page.tsx`, presentation region only — the React-Query feed
[paginated→flat aggregation], optimistic create/edit/delete, `handleSearch` debounce, and
sort/grouping are byte-unchanged): the off-brand chrome was retired — the `bg-black` search
button, the `bg-yellow-50` workspace banner, and the `text-gray` "Loading…/Updating…/Searching…"
text are **gone**. The page now has a serif header + a single **brand search field** (leading
magnifier, sage focus ring, a **clear ×** button; live-debounced + Enter search preserved;
**`text-base`/16px so focusing it never triggers iOS zoom** — do not drop it below 16px), calm
reduced-motion-safe **skeleton** loading (`FeedSkeleton`), an `aria-live` status region, and an
explicit `htmlFor` label. `components/memories/MemorySection.tsx` (sticky section headers) and
`components/MemoryCard.tsx` were rebranded to brand tokens (no raw gray/stone), with a cleaner
memory-date row (icon + `sr-only` "Memory date:") and a sage focus ring; **sticky offsets
unchanged**. **Home** (`app/(app)/home/page.tsx`): serif h1, ≥44px touch targets + sage focus
rings on all CTAs, calmer `max-w-2xl` column, new `app/(app)/home/loading.tsx` skeleton.
Verified: tsc/lint/build green + independent adversarial review (BEHAVIOR PRESERVED: yes; its
two findings — iOS focus-zoom + a screen-reader date label — were fixed). **Do NOT** reintroduce
the black search button / yellow banner / gray text loaders, drop the search input below 16px,
or change the memories feed's data/query/mutation layer.

**Project Polaris — Pass 3 shipped (authoritative, 2026-07-08): People + Insights.**
Presentation-only (no data/query/logic change). **People** (`app/(app)/profiles/page.tsx`,
return JSX only): serif header, calm `max-w-2xl` column, `rounded-3xl` list with subtle
`divide-y` separators, polished empty state; `PersonRow` gained a sage focus ring + roomier
`px-3 py-3` (still ≥44px); **`AddPersonButton`** got a bigger touch target + focus ring and its
modal now **traps focus + Escape-closes + restores focus + locks scroll** (shared `useFocusTrap`;
`role="dialog"` on the panel; `bg-charcoal/40` scrim) — the `CreateProfileForm` flow is
unchanged; new `app/(app)/profiles/loading.tsx` skeleton. **Insights**
(`components/insights/InsightsClient.tsx` + `app/(app)/insights/page.tsx` + `loading.tsx`) —
goal was **calm, not analytical**: the page now opens with the narrative layer VISIBLE (serif
header [was `text-5xl`/`#243428`/`text-gray`], `AIDisclaimer`, `RemyInsightsCenter` companion
summary, `AIInsightSummary`) and the **11 detailed charts collapsed into a native-`<details>`
"Detailed analytics"** progressive disclosure. **Nothing removed** — every chart + all
`useMemo`/cognition-engine/analytics computation is byte-unchanged (verified: compute region 0
diff hunks); charts still mount and render when expanded (recharts `ResponsiveContainer`
re-measures on open). The off-brand `ChartSkeleton` + route skeleton + the `bg-[#f5f1e8]` page
bg were rebranded to tokens; container narrowed `max-w-7xl`→`max-w-4xl`. Verified: tsc/lint/build
green + independent adversarial review (BEHAVIOR PRESERVED: yes). **Do NOT** re-expand all
Insights charts into one flat scroll, restore the `text-5xl`/raw-hex header, or re-flag the
Insights analytics-overload as an open issue. **Polaris roadmap remaining:** Timeline,
Library, Settings, reminders-presentation.

**Project Polaris — Pass 4 shipped (authoritative, 2026-07-08): Search.** Presentation-only
(no search logic/query/embeddings/ranking/filter/pagination/debounce/keyboard change).
**`app/(app)/search/page.tsx`**: the `sr-only` h1 became a **visible serif title + inviting
subtitle**; `RemySearchInsights` + `SearchView` unchanged. **`components/search/SearchView.tsx`**
(presentation only): the field is now an inviting **rounded-full pill** with a leading icon +
sage `focus-within` ring (`text-base`/no-iOS-zoom, clear button, 250 ms debounce,
`AbortController` cancel, `Remy.emit`, `/api/search/global` fetch, localStorage recents — all
byte-unchanged); filter/recent/suggestion chips got sage focus rings + roomier `px-4 py-2`; a
**calm discovery hero** (`RemyStage context="welcome"` + a plain-language invitation) leads the
empty state; group-collapse buttons got focus rings + a reduced-motion chevron.
**`components/search/SearchResultRow.tsx`**: the off-palette amber/sky/violet/rose type tints
were neutralized to a single brand **sage** (type still shown by icon + badge text — hierarchy
over colour) + a sage focus ring. **`app/(app)/search/loading.tsx`** rewritten to mirror the new
layout (brand tokens, reduced-motion-safe). Verified: tsc/lint/build green + independent
adversarial review (SEARCH LOGIC UNCHANGED: yes). **Do NOT** reintroduce the rainbow result
tints, revert the field below `text-base`, or alter the search debounce/abort/fetch/ranking.
**Polaris roadmap remaining:** Library, Settings, reminders-presentation.

**Project Polaris — Pass 5 shipped (authoritative, 2026-07-08): Timeline.** Presentation-only
(no timeline logic/query/sorting/date-grouping/chronology/pagination/`signMemories`/AI-enrichment/
navigation/routing change). Timeline was built pre-brand-system, so this was the **largest rebrand
yet — 13 files** taken from raw `gray/black/yellow/#f5f1e8` + oversized `text-4xl/5xl` titles →
the Polaris system. **`app/(app)/timeline/page.tsx`** (server; the auth/`getActiveContext`/
pagination [PAGE_SIZE/SAFETY_CAP/isNarrowed/shown/fetchLimit]/memories query/filtering/
`signMemories`/`groupMemoriesByDate`/categories query are **byte-unchanged** — presentation region
only): `max-w-3xl` reading column; the `bg-yellow-50` no-profile notice, `bg-[#f5f1e8]` sticky bar,
`border-gray-100`/`shadow-sm` empty state, and `text-gray-800` auth fallback rebranded; the empty
state is now a calm serif **"Your story starts here"** + CTA. **`TimelineHeader`** → serif +
warmer copy ("AI Timeline" → "Timeline"). **`TimelineDayGroup`** sticky date headers → `bg-sand` +
`charcoal-muted` (sticky `12.5rem`/`3.5rem` offsets **unchanged** — mobile control-bar heights were
preserved, so do not alter them without re-checking the day-header offset). **`TimelineCard`**
(desktop `<details>`): rebrand, serif title (`text-4xl`→`text-2xl md:text-3xl`), `🕰 Memory Date:`
→ `CalendarClock` + `sr-only`, summary focus ring, reduced-motion; native expand untouched.
**Control bar** (`TimelineViewToggle`/`TimelineCategories`/`TimelineSearch`): `bg-black` active →
`bg-sage`, `text-base` search input, sage focus rings, `aria-current`; every href/URL-builder +
the `GET`-form search preserved. **Chapters view** (`ChaptersView`/`LifeChapterCard`/
`RelatedMemories`) + `TimelineRow`/`TimelineAttachmentImage` rebranded; hrefs/dedup preserved.
`loading.tsx` rewritten (brand, reduced-motion-safe). (`IntelligenceStrip` + `CompactChapterRow`
were already clean.) Verified: brand sweep CLEAN · tsc/lint/build green · adversarial review
(TIMELINE LOGIC UNCHANGED: yes). **Known pre-existing (NOT introduced):** the in-bar Search/Clear/
toggle/chip touch targets are `<44px` — left as-is because enlarging them grows the mobile
control-bar height and would break the calibrated day-header sticky offset. **Do NOT** reintroduce
raw gray/black/#f5f1e8 on Timeline or restore the `text-4xl/5xl` titles. **Polaris roadmap
remaining:** Library, Settings, reminders-presentation.

**Project Polaris — Pass 6 shipped (authoritative, 2026-07-08): Library.** Presentation-only
(no queries/filtering/routing/hrefs/data-loading/auth/state change). The Library was already
~90% brand-aligned, so this was a light refinement (**6 files**; the shared `Remy*` renderers —
`RemyStoryMode`/`RemyBiography`/`RemyMemoryBook` — were treated as **black boxes** and left
untouched). **`components/library/LibraryView.tsx`** is a **pure client-side filter over a
static 6-destination `SECTIONS` list** (no data logic): the one off-brand `bg-stone-50` →
`bg-sand`; the search input `text-sm`→**`text-base`** (no iOS zoom) as a rounded-full pill with
a sage `focus-within` ring; filter chips + sage focus rings + ring-clearance; the destination
list → `rounded-3xl`/`shadow-soft` with a sage focus ring per row `<Link>`; the bare empty-state
`<p>` → a calm card — `SECTIONS`/`CHIPS`/hrefs/`useState`/filter predicate **byte-identical**.
**`app/(app)/library/page.tsx`** → semantic `<header>` + **serif h1** + `max-w-2xl` column +
warmer "personal archive" subtitle. **`story`/`biography`/`memory-book` `page.tsx`** (server;
auth + `Promise.all(getRemy…)` + `derive*Signals` + the `Remy*` renderer calls **byte-unchanged**):
back-link focus ring + an additive **`sr-only` `<h1>`** (each renderer tops out at `<h2>`, so this
gives one valid document `<h1>` without duplication) + a calm empty card. New
**`app/(app)/library/loading.tsx`** brand skeleton (reduced-motion-safe). Verified: brand sweep
CLEAN · tsc/lint/build green · adversarial review (LIBRARY LOGIC UNCHANGED: yes). **Do NOT**
rebrand the shared `Remy*` renderers under Library or drop the hub search below `text-base`.
**Polaris roadmap remaining:** Settings, reminders-presentation.

**Project Polaris — Pass 7 shipped (authoritative, 2026-07-08): Settings.** Presentation-only
(no profile-update/GDPR-export/account-delete/reauth/auth/routing/state change; adversarially
verified — every flow UNCHANGED). Scope-locked to **7 files**; **`StorageUsageCard`,
`ProfileHeader`, `ProfileSection` are BLACK BOXES** (shared / purchase-adjacent — untouched).
**`app/(app)/settings/page.tsx`**: fixed a **nested `<main>`** (→`<div>`; the `(app)` layout
already renders the outer `<main>`), added semantic `<header>` + **serif h1** + subtitle, storage
wrapper `rounded-3xl`; `resolveAccountIdentity`/`redirect`/composition unchanged.
**`AccountInformationSection`** (frozen `handleSave`/`PATCH /api/profile`), **`ExportDataSection`**
(frozen `handleExport`/`GET /api/gdpr/export`/blob), **`PrivacyLinksSection`** (frozen hrefs),
**`DeleteAccountSection`** (frozen modal trigger): `neutral/gray`→`charcoal`, `rounded-2xl` cards,
**`text-base` inputs + sage focus rings**, `bg-black` buttons → sage (≥44px), `green`→`sage-deep`.
**Destructive UI uses the brand `rose` palette** (approved — the app's delete convention: danger
zone + delete buttons). **`DeleteAccountModal`** (CRITICAL — presentation-only): `bg-black/50`
scrim → `bg-charcoal/40`, `red`→`rose`, `neutral/gray`→`charcoal`, `rounded-3xl`, **`text-base`
password/typed inputs + sage focus rings**, ≥44px Cancel/Delete, and additive **`role="dialog"` +
`aria-label`** on the panel (**deliberately NO `aria-modal`** — since a focus-trap could not be
added under the freeze, we do not assert unenforced modality; **NO focus-trap/Escape/keyboard
handler added** — keyboard behaviour byte-identical). **Every** `useState`/`useEffect`/`canSubmit`/
`reauthOAuth`/`handleDelete`/`GET`+`DELETE /api/gdpr/delete-account`/`signOut`/`window.location`/
typed-confirmation/`password`/`deleteContributed` binding is **byte-identical** (verified
line-by-line). New **`app/(app)/settings/loading.tsx`** brand skeleton (reduced-motion-safe).
Verified: brand sweep CLEAN · tsc/lint/build green · adversarial review (SETTINGS/PROFILE/EXPORT/
DELETE/REAUTH/AUTH/ROUTING all UNCHANGED). **Do NOT** revert the delete/reauth logic, add a
focus-trap without lifting the freeze, or touch the `StorageUsageCard`/`ProfileHeader`/
`ProfileSection` black boxes here. **Polaris roadmap remaining:** Reminders (presentation only).

**Project Polaris — Pass 8 shipped (authoritative, 2026-07-08): Reminders — FINAL PASS.**
Presentation-only refinement of the **CRITICAL FROZEN** reminder surface (adversarially verified
— all 16 flows UNCHANGED: reminder logic/creation/editing/deletion/completion/delivery/OneSignal/
NativeReminderSync/AppDelegate/timezone/background-tasks/API/Supabase-mutations/auth/routing/
**form-reset `key`**). The reminder system remains **SECURITY/PRODUCTION FROZEN** — only visual
presentation changed. Already brand-aligned, so a light **4-file** refinement. **Black boxes
(untouched):** `NativeReminderSync`, `NativeReminderBeacon`, `ReminderDateTimeField` (timezone
logic — only its parent-passed className got `text-base`), `lib/native-reminders.ts`,
`lib/reminders/*`, `app/api/reminders/*`. **`app/(app)/reminders/page.tsx`** (return only; the
`createReminder`/`toggle`/`delete` server actions, the **form `key`**, the `NativeReminderSync`/
`NativeReminderBeacon` mounts, and every input `name` are **byte-identical**): `max-w-3xl`, **serif
h1** (`text-4xl`→`text-2xl md:text-3xl`), summary focus ring + reduced-motion chevron, **`text-base`
inputs** (title/date/frequency — no iOS zoom), submit focus ring. **`ReminderCenter.tsx`** (frozen
`useMemo`/`useState`/toggle+delete forms + hidden `id`/`completed`): raw hex `text-[#9c7e3f]` →
`text-gold-ink`, hero `rounded-3xl` + serif "Next up" title, card + button reduced-motion +
additive sage/rose focus rings (`rose`/`gold` = approved urgency/destructive). **`reminders/[id]/
page.tsx`**: existing debug view restyled (container + serif h1 + brand `<pre>`; no new nav;
auth/fetch frozen). New **`app/(app)/reminders/loading.tsx`** skeleton. **Do NOT** modify reminder
scheduling/delivery/native/OneSignal/AppDelegate/mutation/form-reset logic (freeze reaffirmed).

**PROJECT POLARIS COMPLETE (authoritative, 2026-07-08):** the app-wide **presentation-only** UX
redesign is FINISHED across all 8 passes — **(1)** Dashboard + shell (Remy FAB) · **(2)** Home +
Memories · **(3)** People + Insights · **(4)** Search · **(5)** Timeline · **(6)** Library ·
**(7)** Settings · **(8)** Reminders. Every pass was presentation-only over frozen logic,
brand-swept clean, tsc/lint/build green, and independently adversarially verified (behaviour
byte-preserved). The whole app now shares the Polaris design language (serif titles, sage/sand/
charcoal + gold/rose accents, `max-w` reading columns, `rounded-2xl/3xl` + `shadow-soft`, sage
focus rings, `text-base` inputs, ≥44px controls, reduced-motion-safe skeletons, progressive
disclosure). **No Polaris passes remain** — future UI work is FEATURE work, not this redesign.

**Caregiver revoke — owner-only access removal (authoritative, 2026-07-08):** the audit-identified
access-control gap (an owner could invite/accept caregivers but never REMOVE their access to a care
profile's PHI) is CLOSED. **`revokeCaregiver({memoryProfileId, caregiverAccountId})`** +
**`listProfileCaregivers(memoryProfileId)`** (`app/(app)/dashboard/actions.ts`) are **OWNER-ONLY**
(`userOwnsProfile`, session-derived user id — never trust a client-supplied id), return
**structured results (never throw)**, and use the **service-role client scoped to the owned
profile**. Revoke DELETEs the accepted `profile_relationships` row (scoped `memory_profile_id +
caregiver_account_id`, `.neq('relationship_type','owner')`), which immediately withdraws access —
`getAccessibleProfiles`/`userCanAccessProfile` require an ACCEPTED row and `getActiveContext`
re-validates the active-workspace cookie on read (a revoked caregiver falls back to My Nest on
their next request). Guards: **self-revoke blocked** (`caregiverId === user.id`), **owner row never
deletable**, **non-owner blocked before any write** (no IDOR — the scoped delete can only affect the
OWNED profile's row). **Deliberately NOT entitlement-gated** — revocation must work post-downgrade
(the owner's manual remedy for the FAMILY→FREE "downgrade doesn't auto-revoke" gap). UI:
**`components/CaregiverManager.tsx`** (caregiver list + Remove with inline confirm +
loading/success/error, Polaris design) in the `WorkspaceSelector` "Manage care profiles" panel;
renders nothing for non-owners. Invite/accept/decline/createProfile/workspace-switching are
byte-unchanged (additive only). **Still open (separate audit items, NOT done here):** the Stripe
downgrade path does not auto-revoke caregivers (manual revoke now exists); `access_level` is
stored/displayed but not enforced (any accepted relationship grants full write). Do NOT remove the
owner-only/self-revoke guards or entitlement-gate revocation.

**Subscription downgrade entitlement reconciliation (authoritative, 2026-07-08):** the
audit-identified gap (a FAMILY→PREMIUM/FREE downgrade or cancellation left accepted caregivers
with access) is CLOSED — complementing the manual owner-only revoke above.
**`reconcileEntitlementsForUser(userId, plan)`** (`lib/billing/reconcile-entitlements.ts`,
service-role, **structured result, never throws, idempotent**) runs from the Stripe **webhook**
downgrade paths (`customer.subscription.deleted` → FREE; `customer.subscription.updated` →
`!isActive ? "FREE" : derivedPlan ?? null` — null = unknown price = skip) AFTER the existing
profile write. When the NEW plan lacks caregiver collaboration (`getUsageLimits(plan).
caregiverCollaborationEnabled` — the single source of truth `BILLING_PLANS[plan].
caregiverCollaboration`; only FAMILY/ENTERPRISE grant it), it bulk-DELETEs accepted, non-owner
`profile_relationships` rows on the profiles the user OWNS (`created_by_account_id`), preserving
the owner's own row. **Non-destructive** (only access grants — never a care profile/memory/
reminder), **no escalation** (only deletes access; never grants/upgrades/writes plan/is_premium),
**no IDOR** (`userId` derived from the webhook's own write result `data.id`, never request input;
scoped to owned profiles). A reconciliation error sets the existing `writeFailed` flag → the
webhook's existing HTTP-500 retry (safe: idempotent). **All OTHER premium capabilities** (semantic
search, storage quota, care-profile creation limit, voice memories) are read-time-derived from the
persisted plan (`resolveSubscription`/`getUsageLimits`) → auto-reconciled by the plan write;
**existing over-limit care profiles are intentionally NOT deleted** (the repo enforces the limit at
CREATION time only — deleting existing profiles/memories would be destructive data loss, not a repo
rule). The webhook's existing writes / `writeFailed` semantics / 200-500 responses / checkout /
portal / payment-failed grace are **byte-unchanged (additive only)**. Do NOT make reconciliation
grant access, write plan/is_premium, gate it behind anything other than the entitlement check, or
delete care profiles/memories. (The former "`access_level` not enforced" gap is now CLOSED — see
the next note.)

**Caregiver `access_level` enforcement (authoritative, 2026-07-08 — closes the final V1 caregiver
access-control gap):** an accepted caregiver's write permission is now determined ONLY by their
`access_level` (`read` | `full` | `admin`, from the invite UI; default `full`) — previously EVERY
accepted caregiver had full write. **The authorization model:** Owner → full write always; accepted
caregiver → write ONLY per `access_level`; read-only caregivers keep ENTER + READ. **Single source
of truth in `lib/profile-ownership.ts`** (no duplicated authz logic): a private
**`resolveProfileRole(userId, profileId)`** is the ONE query path (owner via
`created_by_account_id`, else an ACCEPTED `profile_relationships` row + its `access_level`, else
none); **`accessLevelCanWrite(level)`** is the ONE permission rule — **only `read` restricts**
(`level !== "read"`), so `full`/`admin`/**null/legacy** rows stay write-capable (**no-regression** —
the invite default has always been `full`). Both **`userCanAccessProfile`** (access/enter/read —
external behavior BYTE-IDENTICAL to before: owner OR accepted → true) and the new
**`userCanWriteProfile`** (owner OR caregiver-with-write-level) derive from `resolveProfileRole`.
**Enforcement = 5 WRITE sites swapped `userCanAccessProfile` → `userCanWriteProfile`** (authorization
call only): `createReminder` + reminder toggle/complete + reminder delete
(`app/(app)/reminders/page.tsx`), `POST /api/create-reminder`, and `POST /api/memories/create`.
**READ/ENTER paths keep `userCanAccessProfile` UNCHANGED** (`getActiveContext` in
`lib/active-profile.ts`, the `reminders/[id]` view, `getAccessibleProfiles`) so a read-only
caregiver can still enter + view a care workspace. **Memory edit/delete** (`PUT`/`DELETE
/api/memories/[id]`) is `user_id`-scoped (owner-of-content) — NOT access-level-gated, unchanged.
**Caregiver management** (invite/list/revoke, `dashboard/actions.ts`) stays `userOwnsProfile`
owner-only. **The FROZEN reminder scheduling/delivery/native-sync/OneSignal/recurrence/form-reset
logic is byte-unchanged** — this was an authorization-only swap (operator-approved under the freeze's
authorization-hardening carve-out; adversarially verified: reminder behavior byte-preserved). `userId`
is session-derived at every site; `access_level` is read server-side (service-role) — never client
input (no IDOR/escalation). Validation: tsc clean · lint 0 errors · build ✓ · independent adversarial
review CLEAN (all 12 verdicts YES). Do NOT gate READ/enter on `userCanWriteProfile`, add a second
authz query path, or change the `accessLevelCanWrite` rule without updating this single source.

**Storage Ledger Foundation (authoritative, 2026-06-23):** per-attachment storage
**accounting** (bytes) is implemented as a `storage_ledger` table maintained
**incrementally by a trigger on `memories`** (`sync_storage_ledger()`, fires
`AFTER INSERT OR UPDATE OF attachments, memory_profile_id, user_id`) that projects the
`attachments` jsonb — **chosen over dynamic compute** for O(1) reads, and a trigger
(not app dual-write) **because the upload pipeline is frozen**. The trigger is
**null/non-array/malformed-safe and must stay that way — it can NEVER raise**, or it
would abort memory writes (a critical system). `reconcile_storage_ledger()` does
idempotent backfill + drift repair; `storage_account_usage` (`security_invoker`) is the
read path. In RemyNest **`workspace_id == memory_profile_id`** (NULL = My Nest), so no
separate `profile_id` column. **`lib/storage/`** holds plan limits as **config only**
(FREE/STARTER/PREMIUM/FAMILY — **no pricing/checkout/billing**; decoupled from the frozen
`lib/billing` via the `resolveStorageTier()` seam, default FREE), `getStorageUsage`
(service-role, **always scoped by the member id set** — family-pool-ready by summing
across members, **no schema redesign needed**), and `checkStorageQuota` (structured
result, never throws, byte-based → future-media-proof). **Upload enforcement IS wired
(authoritative, 2026-06-23):** `enforceUploadQuota` (`lib/storage/upload-guard.ts`)
sums the **total batch** bytes, resolves pool members (`resolveStoragePoolMembers` →
`[userId]` today, the family seam) and calls `checkStorageQuota`, then gates
**`POST /api/memories/create`** and **`PUT /api/memories/[id]`** **before**
`buildMemoryMediaPayload` (the storage-write choke point) — over-quota → **HTTP 413
`{ error, quota }`**. A **0-byte batch always passes** (text-only memory / remove-only
edit never blocked); **fails closed** on a degraded usage read; the edit path counts
only the **new** files. Do **not** duplicate this accounting or add a second
enforcement path — reuse `enforceUploadQuota`. **Migration is an operator step** (apply
`20260623120000_storage_ledger_foundation.sql` in the Supabase SQL editor). Do **not**
re-derive the ledger decisions or redesign the schema. See
`docs/features/storage-ledger.md`.

**Brand system (authoritative, 2026-06-23):** RemyNest has **two coexisting brand
systems sharing GOLD as the bridge** — **(A) Product/Brand = sage `#4F6B5B` / sand
`#F5F1EA` / gold `#C9A86A`** (logo, app icon, favicon, OG, all UI chrome — "NOT
healthcare blue") and **(B) Companion/Remy = purple `#8A6BD0`→`#5B3E8E` + pendant
`#E3A24A`** (the **in-app avatar/chat ONLY**). The product logo is the geometric
**nest** mark (`public/brand/logo-*.svg`); a simplified sage/gold **brand Remy**
(`remy-mark.svg`) is the secondary mark. **Do NOT** recolor the validated in-app Remy
sprite (`components/remy/avatar/*`, `public/remy/remy-blueprint.png`) to sage, and
**do NOT** put purple Remy on the product brand. Type = **Fraunces** (display/h1–h4)
+ **Inter** (body/UI); body floor **17px**. **A11y (authoritative):** **gold
`#C9A86A` FAILS as text (1.9:1)** — accent/large-graphic only; use **gold-ink
`#7A5E22`** for links/accent-text; gold buttons take **charcoal** ink; focus rings are
**sage**, never gold. Tokens: `lib/brand/tokens.ts` + `tailwind.config.js` +
`app/globals.css` (`:root` + `.dark`). **Dark theme is mechanism-only** (`darkMode:
'class'` + `.dark` vars) — do **not** flip dark UI on broadly until components are
audited. Icons/OG auto-wire via `app/{icon.svg,apple-icon.tsx,opengraph-image.tsx}`.
See `docs/brand/brand-guidelines.md`. **Pending (staged):** raster exports
(store/Play/social/true-square PWA), the 17px/scale migration across ~544 small-text
sites, dark-UI rollout.

**Launch priority (authoritative, 2026-06-23 — supersedes prior "active development
focus"):** the immediate focus is **App-Store launch, NOT advanced AI**. Launch
roadmap, in order: **(1) Memory-system completion** — multi-photo [done] · storage
accounting [done] · storage usage UI · storage plan enforcement [done] · storage-limit
**upgrade modal** · **subscription integration**; **(2) Media expansion** — photo +
video [done] · mixed-media gallery [done] · storage accounting across all media types
[done, byte-based]; **(3) Productization** — final branding/logo/app-icon · landing
page · marketing site · App-Store + Google-Play assets · download redirects · legal
pages · subscription pages; **(4) App-Store launch prep** — screenshots · metadata ·
Privacy/Terms · **Restore Purchases** flow · subscription disclosures · launch
checklist.
**Remy companion — FOUNDATION APPROVED + IMPLEMENTED (authoritative, 2026-06-28):** the
operator re-prioritized **Phase 1 of the Remy companion as plug-in ARCHITECTURE ONLY** — no
artwork, no animations, no AI, no conversation. Built: **`lib/remy/companion/*`** (state-
machine types, asset **registry**, animation-controller **INTERFACE** + placeholder impl,
AI-hook **types**) + **`components/remy/companion/*`** (`RemyProvider` = split state/actions
contexts; `FloatingCompanionLayer` = portaled, safe-area-aware overlay = Remy's home;
`FloatingCompanionButton` = the dual-mode abstraction the bottom-nav "+" now uses and the
Nest later takes over by swapping `href` → `onActivate={toggleRemy}`), mounted in
`(app)/layout.tsx`. Assets are referenced by KEY (swap art in the registry — no code change);
the animation backend is chosen behind one seam (`createRemyAnimationController` — Rive/Lottie/
CSS/Framer plug in with zero consumer change). Performance: `children` is a stable prop +
split contexts, so opening/closing Remy re-renders ONLY the provider + the layer. **Do NOT
re-defer, re-scaffold, or re-litigate this foundation.**

**Remy asset pipeline — SINGLE FLAT FOLDER (authoritative, 2026-07-01 — supersedes the
2026-06-28 master/production/archive structure):** every Remy/Nest asset lives **directly in
`public/assets/remy/`** — there is **no** `master/`, `production/`, or `archive/` sub-folder
(the operator retired that structure as over-complicated; those folders were removed and must
**not** be reintroduced). The approved canonical character is **Remy Master v1.0** at
**`public/assets/remy/remy_master_v1.png`** — an **immutable brand reference**: read-only,
never modified/overwritten, **not** registered as an app asset (never wired into the app). The
character must **never** be redesigned/reinterpreted; every export must match it exactly
(proportions, scarf, golden-feather heart pendant, palette) — this is the purple+gold
**Companion/Remy** identity, NOT the product/brand sage mark, and is distinct from the separate
frozen in-app sprite at `components/remy/avatar/*` + `public/remy/`. The app reads Remy/Nest art
**only** through the Asset Registry (`lib/remy/companion/asset-registry.ts`), the **SOLE owner
of asset paths** (`BASE = "/assets/remy"`; components reference assets by KEY, never by path).
**Current status:** the registry has **23 app assets, ALL real approved artwork** (`kind:
"image"`, 0 placeholders). To add/replace art: drop the PNG into `public/assets/remy/` using
the exact filename (and set `kind: "image"`) — no other code change. **Rendering:** the app
renders Remy art ONLY through the centralized **`<Remy state="…">`** component
(`components/remy/Remy.tsx`) — the single, registry-driven, animation-ready render path;
never hardcode an `<img>`/`next/image` for Remy elsewhere. **Do NOT** re-introduce
master/production/archive sub-folders, hardcode an asset path outside the registry, or modify
`remy_master_v1.png`. See `public/assets/remy/README.md`.

**Remy is an application-wide PLATFORM SERVICE, not a page feature (authoritative, 2026-07-04 —
v2, supersedes v1):** Remy is a first-class capability like auth/analytics/theme/router. Pipeline:
`Public API → Event Bus → Brain → Emotion Engine → Policy Engine → Animation/Voice Engines →
Renderer`. **Features publish SEMANTIC EVENTS; the platform decides everything else** (feeling,
expression, visibility, animation, future voice). **The ONLY public import path is
`@/lib/remy`** — `Remy.emit("memory.saved")` (event bus), `Remy.enter/exit("offline")` (sticky
context), `<RemyStage context="memories.empty"/>` (in-place surface), `useRemyContext("…")`
(mount-scoped, leak-proof), plus `RemyProvider`/`RemyFloatingPresence` (mounted once by the app
shell) + semantic types. **Features must NEVER** import `lib/remy/core/*`, `lib/remy/companion/*`,
or `components/remy/{Remy,companion,platform}/*`, choose an expression, or reference an
`/assets/remy` path. The pipeline lives in **`lib/remy/core/*`** (pure TS, no React/DOM →
portable to native hosts): `event-bus`, `events` (+`CONTEXT_PRIORITY`), `brain` (semantic state;
future: memory/relationship/trust/personality), `emotion`+`emotion-engine` (feeling),
`policy-engine` (feeling→presentation — the SOLE presentation authority), `presentation` (the
expression vocabulary), `animation-engine` (over the `AnimationController` seam),
`voice-engine` (architecture only, no TTS). The React binding is `RemyProvider` (a thin adapter
over the core). **Exactly one** of each: public API (`lib/remy/index.ts`), renderer
(`components/remy/Remy.tsx`), provider, asset registry (`lib/remy/companion/asset-registry.ts`),
event bus, brain. **Allowed exception:** error boundaries (`app/error.tsx`, `app/(app)/error.tsx`)
render the raw `<Remy state="confused">` (the platform may be the crashed thing) — keep this list
tiny. To extend: add an event+feeling+look mapping and emit it; to animate/voice/go-native: swap
a backend behind its `create…` seam or write a new adapter+renderer over the same core — **never
touch features**. **Do NOT** create a second renderer/provider/registry/public-API/policy, put
business logic in the renderer/engines, or couple Remy to a page. (This is the **companion
platform** — distinct from the separate `lib/remy/*.ts` AI-intelligence layer and the frozen
`components/remy/avatar/*` sprite.) See `docs/architecture/REMY_PLATFORM_V2.md` (the single
source of truth; v1 `REMY_PLATFORM_ARCHITECTURE.md` is historical).

**The Nest — Remy's living HOME, behaviour-driven (authoritative, 2026-07-09 — CORRECTS the
2026-07-08 hub; supersedes the Pass-1 `RemyActionButton` sheet):** the mobile center slot is
**"The Nest"** — Remy's persistent, alive, evolving HOME, NOT a FAB and NOT a menu button (the "+"
stays retired). **The interaction is the feature; the menu is a CONSEQUENCE of Remy greeting.** The
earlier hub was corrected because it still behaved like a prettier FAB (idle→tap→menu→close with a
`menuOpen` UI state). **The correction is BEHAVIOUR-driven and lives in the ONE Remy platform** — no
parallel system. **New platform layer (`lib/remy/core/`, exported via `@/lib/remy`):**
`behavior.ts` = the **behaviour vocabulary** `RemyBehavior` (resting/sleeping/idle/waking/peeking/
emerging/greeting/listening/thinking/searching/recording/celebrating/reminder/memoryFound/processing/
success/returningHome) + `BEHAVIOR_LOOK` mapping **each behaviour to an EXISTING
expression/emotion/animation-cue** (no new artwork) with a `presentsActions` flag; `nest.ts` = the
Nest **choreography** as platform data (`NEST_WAKE_SEQUENCE` waking→peeking→emerging→**greeting**
[sticky, `presentsActions`], `NEST_RETURN_SEQUENCE` returningHome→**resting**) **+ Nest EVOLUTION**
(`NestStage` small→growing→blooming→family→legendary + pure `resolveNestStage(memoryCount)`).
**Behaviour is a NEW platform layer above expression/emotion — this is the requested extension, not a
second brain/renderer/provider/registry/policy/event-bus** (the existing emotion pipeline + floating
presence are **byte-untouched**). **The nav surface (`components/navigation/nest/`) is a thin PLAYER:**
`use-nest-interaction.ts` schedules the platform choreography's timed beats (reduced-motion-safe:
jumps straight to greeting/resting; leak-proof `onBehaviorChange` seam — not wired), `Nest.tsx` renders
the behaviour-driven Remy via the **single `<Remy state>` renderer** (no hardcoded `<img>`) inside the
persistent stage-aware nest, `NestMenu.tsx` is the portaled sheet Remy presents **while greeting**. The
parallel `nest-state-machine.ts` (menuOpen states) and `nest-animations.ts` were **DELETED**. Default
state = Remy **asleep in the nest** (`resting`→`sleeping` expression + float + gold glow); tapping
**wakes** Remy who peeks, climbs out, greets, and only THEN presents 5 EXISTING routes — Ask Remy
(`/remy`), Add a memory (`/memories/new` via `MOBILE_NEW_ACTION.href`), Add a reminder (`/reminders`),
Search (`/search`), Insights (`/insights`) — each `withContext()`-threaded (care routing unchanged;
Search+Insights also stay in the "More" drawer). Choosing an action sends Remy **home** → resting.
The overlay is `createPortal(document.body)` (backdrop-blur containing-block invariant). **Future-ready
WITHOUT rewrite:** voice/AI/celebrations/memory-found/reminder/search/insights reactions, Golden
Feather, seasonal themes, Nest evolution, accessories, emotion, physical companion/Watch/Widgets/CarPlay
all wire in by TRIGGERING an existing reserved behaviour (or adding one row to `BEHAVIOR_LOOK`/a
choreography beat) + emitting a platform event — the reserved behaviours are defined+mapped but NOT
reachable from the tap flow, and **no deferred AI/voice/Rive/Lottie was built**. **Presentation +
routing ONLY** — billing/auth/caregiver+access_level/reconcile/reminders(scheduling/native/OneSignal)/
memory/search/workspace/active-profile all byte-unchanged; verified tsc/lint/build green + independent
adversarial review CLEAN (all 15 verdicts YES). **Known constraints (flagged):** the "Remy Design
Bible" is **not in the repo** (external — visuals scoped to existing approved assets + CSS), and the
Remy PNGs have **opaque backgrounds**, so the clean white `variant="nest"` pedestal is the nest vessel
and dedicated per-stage nest art awaits transparent assets (a future registry-only drop, no code
change). **Do NOT** reintroduce the "+" FAB, add a `menuOpen`/menu STATE (the menu derives from a
behaviour's `presentsActions`), fork a second renderer/provider/registry/brain/policy/event-bus, build
a second state machine in the nav layer, add a Remy expression/behaviour that isn't drawn through the
single `<Remy>` renderer, un-portal the sheet, drop `withContext`, or build the deferred live/AI content.

**The Nest — living-companion increment (authoritative, 2026-07-09 — extends the behaviour-driven
Nest; operator-approved override of the pre-launch companion deferral for THIS surface):** the Nest
was made to feel alive by EXTENDING the platform (not a redesign; backwards-compatible; single
`<Remy>` renderer + one platform preserved). **(1) Time-of-day is a platform layer**
(`lib/remy/core/time-of-day.ts`, exported via `@/lib/remy`: `TimeOfDay` morning/afternoon/evening/
night + `resolveTimeOfDay`/`isNightTime`/`greetingForTimeOfDay`) — computed **client-side after
mount** (SSR/hydration-safe) and refreshed every 10 min. It drives the Nest's ambient lighting
(warm by day, **moonlight cool at night**), Remy's resting look (**night→sleeping**, day→calm idle),
and a time-appropriate greeting. **(2) Nest evolution uses REAL memory counts** — 6 stages
**Tiny→Cozy→Family→Golden→Memory Tree→Sanctuary** (`lib/remy/core/nest.ts`); the count is a cheap
RLS-scoped head-count in the `(app)` layout (My Nest = null-profile/`user_id`; care = profile),
threaded `AppNavbar → MobileBottomNav → Nest` (degrades to 0 on error — never breaks the nav). **No
placeholder count.** **(3) Motion:** interaction motion uses **framer-motion**, centralized in
`components/remy/motion/primitives.tsx` (**no duplicated animation logic**) — the NestMenu now reads
as **Remy OFFERING actions** (backdrop fade → sheet spring-rise → Remy emerge → actions stagger in),
de-menu-ified; cheap infinite AMBIENT loops (glow / drifting motes / breathing) stay in **CSS**
(`nest.module.css`). All motion is **reduced-motion-safe** (framer-motion `useReducedMotion` +
CSS `@media`). Portal(document.body)/focus-trap/scroll-lock/routing/`?context=` all unchanged.
Verified: tsc/lint/build green. **STILL DEFERRED (blocked on assets NOT present in the repo):**
animated Remy character art (wings/blink/emerge via Rive/Lottie), dedicated per-stage nest artwork,
celebration character effects (feather/heart), achievements celebration art, emotion-specific
artwork, and real voice — do NOT fabricate these. **Do NOT** make `time-of-day` impure/SSR-time-read,
add a second renderer/state-machine, or move ambient infinite loops into framer-motion.

**Remy — app-wide companion presence (authoritative, 2026-07-09 — extends the ONE platform):** Remy
now reacts across the whole app via THREE surfaces mounted ONCE in the `(app)` shell (all render
`null` until Remy reacts; single `<Remy>` renderer + one event bus + one brain preserved — no second
AI/renderer/provider). **(1) `RemyScreenAwareness`** (`components/remy/platform/`) publishes a brief
arrival reaction per screen using a pure route→event map (`lib/remy/core/screen-behavior.ts`); new
`screen.*` events were added to the vocabulary (`events.ts` `RemyEventName` + `emotion-engine.ts`
`MOMENT_EMOTION`, mapping to EXISTING emotions — the documented extension recipe). Screens that emit
their own events (memories/search/remy/home) are omitted so Remy never double-reacts. **(2)
`RemyMilestones`** (`components/remy/companion/`) takes the REAL workspace `memoryCount` (already
computed in the `(app)` layout), compares it to a persisted last-count
(`lib/remy/companion/persistence.ts`), and emits `milestone.reached` on crossings
(`lib/remy/core/achievements.ts` — first/10/50/100/500/1000 + Nest stage-ups). **First-ever load only
BASELINES the count — never a retroactive celebration.** **(3) `RemyCelebration`** subscribes to the
bus and plays a centre-stage feather-burst + sparkles + heart through the single `<Remy>` renderer,
using the **real `goldenFeather` asset** — portaled, `pointer-events-none`, aria-live,
reduced-motion-safe. Reusable effects are centralized in `components/remy/effects/RemyEffects.tsx`
(framer-motion). **Event-bus invariant (authoritative):** the initial-mount replay buffer belongs to
the **Brain** (the first `{replay:true}` subscriber, via `RemyProvider`); ANY secondary bus listener
(e.g. `RemyCelebration`) MUST call `remyEventBus.subscribe(fn, { replay: false })` or it steals the
Brain's buffer and breaks cold-load context reactions (this was a real regression, caught by
adversarial review and fixed). **STILL DEFERRED (missing assets — do NOT fabricate):** animated Remy
character frames, per-stage nest artwork, real voice. **Do NOT** add a raw-bus subscriber without
`{ replay: false }`, fabricate celebrations for a not-real count, or fire milestones retroactively.

**Remy — Companion Intelligence (authoritative, 2026-07-09 — extends the ONE platform):** Remy now
notices meaningful things PROACTIVELY — behavioural intelligence, explicitly **NOT AI chat, NOT
notifications, NOT a poll/background job**. Two PURE core engines: **`lib/remy/core/insights-engine.ts`**
maps a `CompanionSnapshot` → behavioural `Observation[]` (greetings, first-visit-today, returning/
inactivity, reminders-due/all-completed/completed-count, memories-this-week/none-today, nest-evolved;
a birthday-tomorrow rule exists, data-wired when a source lands). **`lib/remy/core/priority-engine.ts`**
dedupes, drops observations still within cooldown, ranks (urgency→importance), and returns **AT MOST
ONE** — "one proactive behaviour at a time, no spam". BOTH engines are pure (no React/DOM/DB/timers/
clock — the caller supplies `now`). **`components/remy/companion/RemyMoments.tsx`** (mounted once in
the shell) runs the intelligence **exactly ONCE per app-open** (a `ran` ref guard; the shell persists
across navigations): a SINGLE read of the read-only, auth-gated, workspace-scoped snapshot loader
**`app/api/remy/companion-snapshot`** (memory/reminder head-counts; degrades to zeros; **never
polled**), then briefly shows one moment through the single `<Remy>` renderer (portaled,
`pointer-events-none` container + tap-to-dismiss chip, aria-live, reduced-motion-safe). **Behavioural
memory** lives in `lib/remy/companion/persistence.ts` (`CompanionMemory`: last-visit day → greeting
once/day + inactivity; acknowledged Nest stage → detect a fresh evolution; per-kind cooldowns → no
repeats). Extends the ONE platform only (single renderer + persistence + core engines + behaviour
vocabulary) — no second provider/bus/brain, no chat. Verified tsc/lint/build + adversarial review
CLEAN (12/12). **Do NOT** put a clock/DB call inside the engines, poll or cron the snapshot, add a
notifications/chat path, fabricate observations for absent data, or exceed one moment at a time.

**Remy — Living Relationship System (authoritative, 2026-07-09 — extends the ONE platform):** the
long-term counterpart to Companion Intelligence — Remy builds a relationship with the family over
time (behavioural, deterministic; **NOT AI/GPT, NOT chat, NOT notifications, NOT a poll**). **Six PURE
core engines** (`lib/remy/core/`, no React/DOM/DB/timers/clock — the caller supplies `today`/`now`):
`relationship-engine` (`RelationshipSnapshot` → warm long-term `RelationshipObservation[]`),
`story-engine` (`buildChapters` — life chapters INFERRED from decade + dominant category, **never
hardcoded**), `anniversary-engine` (`findAnniversaries` — **only real day-precision dates**),
`favourite-engine` (`rankFavouritePeople` — real `people.mention_count` + optional view/search),
`legacy-engine` (`buildLifeSummary` — timeline/chapters/key-people/major-events, **not AI**),
`legacy-export` (`buildLegacyExport` — a structured object for a FUTURE PDF/book, no rendering). Shared
types in `family-types.ts`. **`components/remy/companion/RemyRelationship.tsx`** (mounted once) runs
these **once per app-open** over the read-only, auth-gated, workspace-scoped
**`app/api/remy/relationship-snapshot`** (memories + `people` + dated memories, effective date =
`memory_date ?? created_at`; **never polled**; degrades to empty) and shows AT MOST ONE relationship
moment through the single `<Remy>` renderer. **Global coordination (LOCKED):** only ONE proactive
moment chip shows at a time — the shared **`RemyMomentChip`** (one impl for both surfaces), the
process-wide **`moment-gate`** mutex, and the single generic **`selectMoment<T extends RankableMoment>`**
(one selector for both). RemyRelationship yields to RemyMoments (longer delay + the gate). Relationship
memory (`persistence.ts` `RelationshipMemory`: cooldowns, acknowledged people-total/favourites/
anniversaries/chapters) persists so moments never repeat. Story/legacy engines are exported from
`@/lib/remy` for future timeline/legacy-book screens. Verified tsc/lint/build + adversarial review
CLEAN (14/14). **Do NOT** put a clock/DB in the engines, hardcode chapter names, fabricate dates/
people, add a second moment chip/selector/gate, poll the snapshot, or show two moments at once.

**Remy — Emotional Intelligence Engine (authoritative, 2026-07-09 — extends the ONE platform):** Remy
stops ranking memories by QUANTITY and starts understanding PEOPLE + emotional SIGNIFICANCE. **Three
PURE core engines** (`lib/remy/core/`, no React/DOM/DB/timers/clock): **`significance-engine`**
(`rankSignificantMemories` — ranks memories by significance, **NOT recency/creation-order**: signals
= people involved / favourite person / anniversary / chapter size / attachments / ai_importance /
revisits, + future-compatible pinned & conversation refs), **`emotional-engine`**
(`buildEmotionalProfile` → `EmotionalProfile`: most-significant person/memory, strongest chapter,
most-active relationship, most-revisited memory, most-emotional category, **+ four INTERNAL 0–100
scores** family-strength / life-continuity / relationship-health / memory-preservation), and
**`personality-engine`** (`derivePersonalityTraits` → behavioural TRAITS: family-historian /
memory-guardian / story-teller / legacy-builder / care-champion / photo-collector / daily-rememberer
/ occasional-visitor). **Remy NEVER exposes raw scores — only behaviours / observations / traits.**
`relationship-engine` now CONSUMES the `EmotionalProfile` (+ traits) via optional
`RelationshipSnapshot.emotionalProfile`/`personalityTraits` → 5 new observations ("…has become part
of your family's story", "X seems especially important", "…shaped much of your family's history",
"your family returns to this story often", "you've carefully protected these memories"). **FIXED
pipeline** (wired in `RemyRelationship`): snapshot → `buildChapters` → `rankFavouritePeople` →
`findAnniversaries` → `rankSignificantMemories` → `buildEmotionalProfile` → `derivePersonalityTraits`
→ `deriveRelationshipObservations` → `selectMoment` → the single `<Remy>` renderer. The relationship
snapshot loader (`app/api/remy/relationship-snapshot`) was enriched with REAL signals only —
`attachments` length, `ai_importance`, a `memory_person_links` join for people-per-memory, and a
`historical` flag (workspace-scoped + auth-gated; degrades to empty). Verified tsc/lint/build +
adversarial review CLEAN (12/12). **Do NOT** render a raw score, rank memories by recency, put a
clock/DB in these engines, or fabricate significance/traits from absent data.

**Remy — Memory Understanding Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE
core engine (`lib/remy/core/memory-understanding-engine.ts`, `buildMemoryUnderstanding(DatedMemory[])
→ MemoryUnderstanding[]`) at the FRONT of the relationship pipeline (right after the snapshot). It
turns each REAL memory into a STRUCTURED semantic understanding — themes, life stage, importance
(ordinary/important/major/legacy), attachment/emotional/relationship richness, event type, time span,
a structured `MemoryRelationship` (primary/secondary people, participants, family-vs-individual), and
a 0–100 confidence — **deterministically, from the memory's own real fields only** (category, date,
`peopleIds`, `attachmentCount`, `importance`, `historical`). **NO GPT, NO prose/paragraphs, NO
fabricated facts.** Life stage + themes are inferred from real `ai_category` keywords with
`"unknown"`/`"other"` fallbacks (NOT age-mapped from a nonexistent birth date). It is **INTERNAL — not
shown in the UI**; it feeds the emotional/personality richness ratios today (`RemyRelationship`
derives `attachmentRatio`/`datedRatio` from it) and is exported from `@/lib/remy` as the input for
future engines. No snapshot/DB change (it reads the Phase-5-enriched `DatedMemory`). **FIXED pipeline
order:** snapshot → memory-understanding → story → favourite → anniversary → significance → emotional
→ personality → relationship → priority → one `<Remy>` renderer. Types
(`MemoryUnderstanding`/`MemoryTheme`/`LifeStage`/`MemoryImportance`/`MemoryRelationship`) are additive
in `family-types.ts`. Verified tsc/lint/build + adversarial review CLEAN (12/12). **Do NOT** surface
the understanding in the UI, generate prose from it, put a clock/DB in the engine, duplicate the
significance engine, or fabricate a life stage/theme/person from absent data.

**Remy — Memory Graph Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core
engine (`lib/remy/core/memory-graph-engine.ts`, `buildMemoryGraph(MemoryUnderstanding[]) →
MemoryGraph`) that understands how memories CONNECT — a deterministic semantic graph of nodes (one
per memory), edges (two memories that share a REAL attribute: `same-person`/`same-family`/
`same-theme`/`same-chapter`/`same-year`/`same-category`/`same-event`/`same-life-stage`, weighted by
fixed shared-attribute weights → `weak|moderate|strong`), and theme clusters (Family Memories /
Travel / School Years / Work Life / Medical Journey / Pet Memories / …). **Deterministic** (fixed
weights, stable sort by weight then id, `MIN_EDGE_WEIGHT` prune + `MAX_EDGES` cap), **real-data-only,
NO GPT, NO fabricated/guessed links.** INTERNAL — **not shown in the UI**; it sits after
memory-understanding in the pipeline, and its per-memory edge-degree feeds the significance engine
(more connected = more significant) via a CLEAN optional `SignificanceContext.connectionCountByMemoryId`
extension (additive; existing callers unaffected). No snapshot/DB change (it reads the
`MemoryUnderstanding` layer). **FIXED pipeline order:** snapshot → memory-understanding → memory-graph
→ story → favourite → anniversary → significance → emotional → personality → relationship → priority →
one `<Remy>` renderer. Types (`MemoryGraph`/`MemoryNode`/`MemoryEdge`/`MemoryEdgeType`/
`ConnectionStrength`/`MemoryCluster`) additive in `family-types.ts`; foundation for FUTURE
related-memories / journeys / semantic-search / reasoning. (Distinct from the separate, unrelated
`lib/remy/memory-graph.ts` AI-intelligence file.) Verified tsc/lint/build + adversarial review CLEAN
(12/12). **Do NOT** surface the graph in the UI, fabricate/guess links, put a clock/DB/randomness in
it, make edges non-deterministic, or duplicate the significance engine.

**Remy — Journey Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core engine
(`lib/remy/core/journey-engine.ts`, `buildJourneys({ understandings, graph, … }) → JourneyAnalysis`)
that understands COMPLETE LIFE JOURNEYS — a Journey is a structured collection of connected memories
representing ONE continuous part of a life (Childhood / School Years / University / Career / Family
Holidays / Medical Journey / Care Journey / Retirement / …). Journeys **emerge from REAL signals only**
(dominant theme + life stage + shared people + chronological continuity + graph connectivity): memories
are grouped by dominant theme, split into continuous segments by real year gaps (`> MAX_GAP_YEARS`, or a
chapter change with a smaller gap when chapters are supplied), and a segment below `MIN_JOURNEY_SIZE` (or
otherwise unconfident) is **left separate — never force-merged**. Each journey carries deterministic
`significance`/`continuity`/`importance` + a real `JourneyTimeline`; journeys link by real shared people/
theme (`JourneyConnection`). **Undated memories never fabricate a year** (`startYear/endYear = 0`); **NO
GPT, NO fabricated journeys/years/transitions/links** — deterministic (fixed weights, stable sorts, no
clock/randomness). INTERNAL — **not shown in the UI** (no JSX/chip/observation); it sits after
memory-graph in the pipeline, and its per-memory journey significance feeds the significance engine (more
journey-anchored = more significant) via a CLEAN optional `SignificanceContext.journeyImportanceByMemoryId`
extension (additive; existing callers unaffected → adds 0 when absent). **REQUIRED inputs = understanding +
graph** (the only outputs computed at its pipeline position); chapters/significant/emotional/favourites are
OPTIONAL refinements (no-op today, forward-compatible — do NOT reorder the downstream pipeline to feed
them). No snapshot/DB change. **FIXED pipeline order:** snapshot → memory-understanding → memory-graph →
journey → story → favourite → anniversary → significance → emotional → personality → relationship →
priority → one `<Remy>` renderer. Types (`Journey`/`JourneyStage`/`JourneyTimeline`/`JourneyImportance`/
`JourneyConnection`/`JourneySummary`/`JourneyAnalysis`) additive in `family-types.ts`; foundation for
FUTURE timeline / journeys / life-story / reasoning surfaces. Verified tsc/lint/build + adversarial review
CLEAN (12/12, no blocking issues). **Do NOT** surface journeys in the UI, fabricate/guess journeys/years/
transitions/links, put a clock/DB/randomness in it, reorder the downstream pipeline, make output
non-deterministic, or duplicate the significance engine.

**Remy — Life Story Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core engine
(`lib/remy/core/life-story-engine.ts`, `buildLifeStory({ journeyAnalysis, graph?, understandings?,
chapters?, significantMemories? }) → LifeStoryAnalysis`) that assembles the canonical, structured
CHRONOLOGICAL life story from real journeys — the source for future AI conversation / biography /
timeline UI / story-book export / memory reconstruction / reasoning. **A Life Story is NOT generated
prose.** Journeys are chronologically ordered (undated last) then chained into **chapters** by
single-linkage: two adjacent journeys join **only** when their years are continuous (dated gap `≤
MAX_CHAPTER_GAP`; a dated gap `> MAX_HARD_GAP` **ALWAYS splits** — disconnected life periods are never
merged), their life stages are compatible, AND a REAL relational signal supports it (shared people /
journey-or-graph connection / same theme / shared life chapter). Chapters carry deterministic
`continuity`/`centrality`; the `timeline`/`milestones`/`summary` are structured references to EXISTING
journeys/years/memories only (titles reuse real journey titles; the story title is factual span
metadata — **no narration/paragraphs**). **Undated memories never fabricate a year** (`startYear/
endYear = 0`); **NO GPT, no invented chapters/years/events, no merged disconnected journeys** —
deterministic (stable sorts, no clock/randomness). INTERNAL — **not shown in the UI** (no JSX/chip/
observation); it sits after the journey engine, and its per-memory life-story centrality feeds the
significance engine (more central to the story = more significant) via a CLEAN optional
`SignificanceContext.lifeStoryCentralityByMemoryId` extension (additive → adds 0 when absent; existing
callers unaffected). **REQUIRED input = `JourneyAnalysis`**; graph/understandings/chapters/significant
are OPTIONAL refinements (graph + understandings passed live; do NOT reorder the downstream pipeline to
feed the others). No snapshot/DB change. **FIXED pipeline order:** snapshot → memory-understanding →
memory-graph → journey → life-story → story → favourite → anniversary → significance → emotional →
personality → relationship → priority → one `<Remy>` renderer. Types (`LifeStory`/`LifeStoryChapter`/
`LifeStoryTimeline`/`LifeStoryTimelineEntry`/`LifeStoryMilestone`/`LifeStorySummary`/`LifeStoryAnalysis`)
additive in `family-types.ts`; foundation for FUTURE timeline / biography / story-book / reasoning
surfaces. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (4 lenses × 12
points, 0 findings). **Do NOT** surface the life story in the UI, fabricate/guess chapters/years/events,
merge disconnected journeys, generate prose/narration, put a clock/DB/randomness in it, reorder the
downstream pipeline, make output non-deterministic, or duplicate the significance engine.

**Remy — Reasoning Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core engine
(`lib/remy/core/reasoning-engine.ts`, `buildReasoning({ journeyAnalysis, lifeStory, graph,
understandings, …optional }) → ReasoningAnalysis`) that REASONS over the real journey/life-story/graph/
understanding layers to derive Remy's structural understanding OF a life — the foundation for future
reasoning / conversation / biography surfaces. Five structured products, all real-data-derived:
**Life Anchors** (dominant structural pillars — a theme with `≥ MIN_ANCHOR_MEMORIES` real
journey-memories; `"other"` is **never** an anchor; carries `strength` + real-signal `confidence`),
**Life Themes** (lifetime theme distribution + share), **Life Influences** (people with greatest real
influence — memory/journey counts + graph degree + optional favourite bonus), **Relationship Strengths**
(structured counts only — memory/journey/co-appearance, **NO emotional interpretation**), and **Memory
Gaps** (**FACTUAL only** — large year gaps, sparse / missing-between-present / weakly-documented life
stages; **NEVER a guess at WHY** — the `MemoryGap` type has no reason field). Everything is deterministic
(stable sorts with total-order tiebreakers, structural ids, no clock/randomness) and structured (all
scores are numbers — **no prose/narration**); **NO GPT, no fabricated anchors/people/dates/chronology,
no inference beyond the real data.** INTERNAL — **not shown in the UI** (no JSX/chip/observation); it sits
after the life-story engine, and its per-memory anchor strength feeds the significance engine (a memory
anchoring a strong life pillar = more significant) via a CLEAN optional
`SignificanceContext.reasoningStrengthByMemoryId` extension (additive → adds 0 when absent; existing
callers unaffected). **REQUIRED inputs = journey + life-story + graph + understanding** (the layers
computed at its pipeline position); emotional/personality/relationship/favourite/significant are OPTIONAL
refinements (forward-compatible; do NOT reorder the downstream pipeline to feed them). No snapshot/DB
change. **FIXED pipeline order:** snapshot → memory-understanding → memory-graph → journey → life-story →
reasoning → story → favourite → anniversary → significance → emotional → personality → relationship →
priority → one `<Remy>` renderer. Types (`ReasoningAnalysis`/`LifeAnchor`/`LifeTheme`/`LifeInfluence`/
`RelationshipStrength`/`MemoryGap`/`MemoryGapKind`/`ReasoningSummary`) additive in `family-types.ts`.
Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7 lenses — purity /
determinism / no-fabrication / platform-integrity / pipeline-order / consumption / regressions — 0
findings). **Do NOT** surface reasoning in the UI, invent anchors/people/dates/chronology, add a "why" to
a Memory Gap, generate prose/narration, put a clock/DB/randomness in it, reorder the downstream pipeline,
make output non-deterministic, or duplicate the significance engine.

**Remy — Biography Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core engine
(`lib/remy/core/biography-engine.ts`, `buildBiography({ journeyAnalysis, lifeStory, reasoning, graph,
understandings, …optional }) → BiographyAnalysis`) that assembles a STRUCTURED representation of a life
from the real journey/life-story/reasoning/graph/understanding layers — the foundation for a future
biography / story-book renderer that resolves the references to real data. **A Biography is NOT generated
prose.** **Sections** mirror the real life-story chapters 1:1 (id / title [**reuses the real chapter
title**] / journeyIds / chapterIds / memoryIds / theme / lifeStage + `coverage` [breadth] + `confidence`
[dated/media/peopled backing]); **Periods** group sections chronologically by life stage using **only
real memory years** (`startYear/endYear = 0` when undated — **never invents a date**); **References**
point **ONLY** at real journey / chapter / anchor / theme / person / memory ids (bounded by
`MAX_PEOPLE_REFS`/`MAX_MEMORY_REFS`); **Coverage** = structured metrics (memory / journey / chapter /
life-stage / timeline coverage + confidence); **Summary** = dominantTheme / dominantAnchor / coveredYears
/ coverage / confidence. **No paragraphs, no narration, no fabricated memories/people/dates/chronology** —
every output is a structured number or a real id. Deterministic (sections follow chapters order; periods
iterate a fixed stage order; structural ids `section-<chapterId>`/`period-<stage>`; no clock/randomness →
byte-identical output). INTERNAL — **not shown in the UI** (no JSX/chip/observation); it sits after the
reasoning engine, and its per-memory section coverage feeds the significance engine (a memory in a
well-covered biography section = more significant) via a CLEAN optional
`SignificanceContext.biographyCoverageByMemoryId` extension (additive → adds 0 when absent; existing
callers unaffected). **REQUIRED inputs = journey + life-story + reasoning + graph + understanding** (passed
live); favourite/emotional/relationship/significant are OPTIONAL refinements (forward-compatible; do NOT
reorder the downstream pipeline to feed them). No snapshot/DB change. **FIXED pipeline order:** snapshot →
memory-understanding → memory-graph → journey → life-story → reasoning → biography → story → favourite →
anniversary → significance → emotional → personality → relationship → priority → one `<Remy>` renderer.
Types (`BiographyAnalysis`/`BiographySection`/`BiographyPeriod`/`BiographyReference`/`BiographyReferenceKind`/
`BiographyCoverage`/`BiographySummary`) additive in `family-types.ts`. Verified tsc/lint/build + independent
MULTI-AGENT adversarial review CLEAN (7 lenses — purity / determinism / no-fabrication / platform-integrity
/ pipeline-order / consumption / regressions — 0 findings). **Do NOT** surface the biography in the UI,
generate prose/paragraphs/narration, fabricate memories/people/dates/chronology, reference a non-real
entity, put a clock/DB/randomness in it, reorder the downstream pipeline, make output non-deterministic, or
duplicate the significance engine.

**Remy — Conversation Foundation Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE
core engine (`lib/remy/core/conversation-foundation-engine.ts`, `buildConversationFoundation({
journeyAnalysis, lifeStory, reasoning, biography, graph, understandings, …optional }) →
ConversationFoundation`) that builds the deterministic groundwork a FUTURE conversational layer will
consume. **This is EXPLICITLY NOT chat, NOT GPT, NOT an LLM, NOT prompts, NOT AI responses, NOT generated
text — no deferred AI/conversation UI was built.** **Topics** = REAL recurring subjects (kind anchor /
theme / person / life-stage; each `≥ MIN_TOPIC_MEMORIES` real memories — `"other"` is excluded, a theme
already an anchor is not duplicated as a theme topic; people from real `understandings` + `reasoning.
influences`/favourites, capped `MAX_PEOPLE_TOPICS`); **Threads** = a topic's memories grouped by the real
biography chapter they live in (`≥ MIN_THREAD_MEMORIES`); **References** = pointers **ONLY** to real
memory / journey / chapter / anchor / theme / person ids (bounded); **Context**/**Summary** = structured
metrics only. **No invented topics/threads/memories/people/dates, no narration/prompts/generated
sentences** — every output is a structured number or a real id/enum (the only string literals are
structural id templates + kind/enum tags). Deterministic (sorted topics/threads with total-order
tiebreakers + fixed life-stage order + structural ids `topic-<kind>-<refId>`/`thread-<topicId>-<sectionId>`;
no clock/randomness → byte-identical output). INTERNAL — **not shown in the UI** (no JSX/chip/observation);
it sits after the biography engine, and its per-memory topic weight feeds the significance engine (a memory
in a strong conversation topic = more significant) via a CLEAN optional
`SignificanceContext.conversationStrengthByMemoryId` extension (additive → adds 0 when absent; existing
callers unaffected). **REQUIRED inputs = journey + life-story + reasoning + biography + graph +
understanding** (passed live); favourite/relationship/significant/emotional are OPTIONAL refinements
(forward-compatible; do NOT reorder the downstream pipeline to feed them). No snapshot/DB change. **FIXED
pipeline order:** snapshot → memory-understanding → memory-graph → journey → life-story → reasoning →
biography → conversation-foundation → story → favourite → anniversary → significance → emotional →
personality → relationship → priority → one `<Remy>` renderer. Types (`ConversationFoundation`/
`ConversationTopic`/`ConversationTopicKind`/`ConversationThread`/`ConversationReference`/
`ConversationReferenceKind`/`ConversationContext`/`ConversationSummary`) additive in `family-types.ts`.
Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7 lenses — purity / determinism
/ no-fabrication / platform-integrity / pipeline-order / consumption / regressions — 0 findings). **Do
NOT** build chat/GPT/LLM/prompts/AI responses/generated text on top of this without a separate approved
phase, surface it in the UI, invent topics/threads/memories/people/dates, reference a non-real entity, put
a clock/DB/randomness in it, reorder the downstream pipeline, make output non-deterministic, or duplicate
the significance engine.

**Remy — Question Understanding Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE
core engine (`lib/remy/core/question-understanding-engine.ts`, `buildQuestionUnderstanding({
conversationFoundation, biography, reasoning, lifeStory, journeyAnalysis, graph, understandings, …optional })
→ QuestionUnderstanding`) that builds the deterministic layer a FUTURE conversational layer will use to
convert a PARSED question into structured RETRIEVAL INTENT over the existing intelligence stack. **This is
EXPLICITLY NOT chat, NOT GPT, NOT an LLM, and it takes NO free-text question — there is NO natural-language
parsing and NO deferred AI/chat was built.** **Intents** = the answerable retrieval intents (kinds
memory / person / journey / theme / life-stage / relationship / timeline / event / date / **place** /
comparison / summary / reference), each derived from a REAL upstream entity (conversation topics / anchors /
journeys / chapters / milestones / influences / relationship-strengths / graph-degree memories) with its own
structured `focus` + `weight` + `confidence`. **The `place` kind is NEVER produced** — the schema stores no
locations, so a supported kind with no real backing yields ZERO intents rather than a fabricated one (the
canonical no-fabrication guarantee). **Focus** = real structured ids only (memory/journey/chapter/anchor/
theme/person/life-stage); **Constraints** = structured only (date-range / life-stage / person / theme /
journey); **References** = pointers ONLY to real memory/journey/chapter/theme/anchor/person; **Context**/
**Summary** = structured metrics only. **No natural language, no generated text, no prompts, no invented
ids** — every output is a structured number, a real id, or an enum (the only string literals are structural
id templates + kind/enum tags + a numeric `<startYear>-<endYear>` date slug). Deterministic (all foci sorted
via `makeFocus`; intents sorted [weight desc, id asc] + per-kind capped + globally capped `MAX_INTENTS`;
structural ids `intent-<kind>-<slug>`; no clock/randomness → byte-identical output). INTERNAL — **not shown
in the UI** (no JSX/chip/observation); it sits after the conversation-foundation engine, and its per-memory
intent weight feeds the significance engine (a memory in a strong retrieval-intent focus = more significant)
via a CLEAN optional `SignificanceContext.questionStrengthByMemoryId` extension (additive → adds 0 when
absent; existing callers unaffected). **REQUIRED inputs = conversation-foundation + biography + reasoning +
life-story + journey + graph + understanding** (passed live); favourite/relationship/significant/emotional
are OPTIONAL refinements (forward-compatible; do NOT reorder the downstream pipeline to feed them). No
snapshot/DB change. **FIXED pipeline order:** snapshot → memory-understanding → memory-graph → journey →
life-story → reasoning → biography → conversation-foundation → question-understanding → story → favourite →
anniversary → significance → emotional → personality → relationship → priority → one `<Remy>` renderer.
Types (`QuestionUnderstanding`/`QuestionIntent`/`QuestionIntentKind`/`QuestionFocus`/`QuestionConstraint`/
`QuestionConstraintKind`/`QuestionReference`/`QuestionReferenceKind`/`QuestionContext`/`QuestionSummary`)
additive in `family-types.ts`. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN
(7 lenses — purity / determinism / no-fabrication / platform-integrity / pipeline-order / consumption /
regressions — 0 findings). **Do NOT** build chat/GPT/LLM/free-text parsing/generated responses on top of
this without a separate approved phase, produce a fabricated `place` (or any no-backing) intent, surface it
in the UI, invent ids, reference a non-real entity, put a clock/DB/randomness in it, reorder the downstream
pipeline, make output non-deterministic, or duplicate the significance engine.

**Remy — Answer Planning Engine (authoritative, 2026-07-09 — extends the ONE platform):** a PURE core
engine (`lib/remy/core/answer-planning-engine.ts`, `buildAnswerPlan({ questionUnderstanding,
conversationFoundation, biography, reasoning, lifeStory, journeyAnalysis, graph, understandings, …optional })
→ AnswerPlan`) that builds the deterministic EXECUTION PLAN a FUTURE conversational layer will run AFTER
Question Understanding. **This is EXPLICITLY NOT chat, NOT GPT, NOT an LLM, and it produces NO answers — no
deferred AI/chat was built.** **Steps** = an ordered list of structured retrieval steps (kinds memory /
journey / chapter / theme / anchor / person / timeline / relationship / event / summary / comparison /
**reference**), each EXECUTES a real question intent via the fixed `STEP_KIND_OF_INTENT` map (the `place`
intent maps to NO step; the `reference` step kind is reserved and never produced) and points **only** at
real ids copied from the intent focus; steps are sorted by weight and `order`-numbered (capped `MAX_STEPS`).
**Sources** = the real entity pool the steps draw from — journey/chapter/anchor/theme/person from the steps,
each memory's real biography chapter, **memory sources ranked by real graph connectivity** (capped
`MAX_MEMORY_SOURCES`), plus lifeStory milestones and optional significant memories / favourite people.
**Coverage** = memory/journey/theme/person/timeline coverage; **Context**/**Summary** = structured metrics.
**No prose, no generated answers, no prompts, no invented ids** — every step/source/metric is a structured
id, enum, or number (the only string literals are structural id templates + kind/enum tags). Deterministic
(steps from ordered intents + fixed map + sort/slice + order-index; sources from ordered steps +
graph-ranked memories; structural ids `step-<kind>-<slug>`; no clock/randomness → byte-identical output).
**ALL 8 required inputs are genuinely consumed** (QU→steps, biography→chapters, graph→memory ranking,
reasoning→summary/themes, life-story→milestones/continuity, journey→totals, conversation-foundation→
confidence blend, understandings→totals/people). INTERNAL — **not shown in the UI** (no JSX/chip/
observation); it sits after the question-understanding engine, and its per-memory step weight feeds the
significance engine (a memory targeted by a strong retrieval step = more significant) via a CLEAN optional
`SignificanceContext.answerPlanStrengthByMemoryId` extension (additive → adds 0 when absent; existing callers
unaffected). **REQUIRED inputs = question-understanding + conversation-foundation + biography + reasoning +
life-story + journey + graph + understanding** (passed live); favourite/relationship/significant/emotional
are OPTIONAL refinements (forward-compatible; do NOT reorder the downstream pipeline to feed them). No
snapshot/DB change. **FIXED pipeline order:** snapshot → memory-understanding → memory-graph → journey →
life-story → reasoning → biography → conversation-foundation → question-understanding → answer-planning →
story → favourite → anniversary → significance → emotional → personality → relationship → priority → one
`<Remy>` renderer. Types (`AnswerPlan`/`AnswerPlanStep`/`AnswerPlanStepKind`/`AnswerPlanSource`/
`AnswerPlanSourceKind`/`AnswerPlanContext`/`AnswerPlanCoverage`/`AnswerPlanSummary`) additive in
`family-types.ts`. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7 lenses —
purity / determinism / no-fabrication / platform-integrity / pipeline-order / consumption / regressions — 0
findings). **Do NOT** build chat/GPT/LLM/generated answers on top of this without a separate approved phase,
surface it in the UI, invent ids/steps, reference a non-real entity, put a clock/DB/randomness in it, reorder
the downstream pipeline, make output non-deterministic, or duplicate the significance engine.

**Remy — Answer Assembly Engine (authoritative, 2026-07-09 — extends the ONE platform; the FINAL
deterministic intelligence layer):** a PURE core engine (`lib/remy/core/answer-assembly-engine.ts`,
`buildAnswerAssembly({ answerPlan, questionUnderstanding, conversationFoundation, biography, reasoning,
lifeStory, journeyAnalysis, graph, understandings, …optional }) → AnswerAssembly`) that assembles ONLY the
structured, FACTUAL answer PACKAGE a FUTURE conversational layer will VERBALIZE. **This is EXPLICITLY NOT
chat, NOT GPT, NOT an LLM, and it generates NO answers — no deferred AI/chat was built.** **Sections** = the
answer-plan steps rendered as structured sections (fixed `SECTION_KIND_OF_STEP` map; kinds memory / journey /
chapter / timeline / relationship / theme / anchor / comparison / summary), real ids + weight/confidence/
order only. **Chronology** = deterministic order from the real life-story chapters (ids/order/confidence
only — no generated timeline text). **Evidence** + **references** = real supporting entities (memory /
journey / chapter / anchor / theme / person) aggregated + deduped + weight-ranked + bounded (each memory's
real biography chapter added; memories additionally ranked by real graph connectivity). **Coverage** =
memory/journey/chapter/theme/anchor/person coverage + timeline/answer completeness + confidence + context
depth (all clamped 0–100). **No prose, no narration, no generated answers, no prompts, no invented ids** —
every field is a structured id, enum, or number; **if data doesn't exist it produces ZERO output, never
fabricated.** Deterministic (sections from ordered steps + fixed map + sort/slice + order-index; evidence Map
drained by `sort(weight desc, kind asc, refId asc)`; graph-ranked memories; structural ids `assembly-<slug>`;
no clock/randomness → byte-identical output). **ALL 9 required inputs are genuinely consumed** (answerPlan→
sections, QU→confidence, conversation-foundation→confidence, biography→memory-chapters, reasoning→summary/
themes/anchors, life-story→chronology/continuity, journey→totals, graph→memory ranking, understandings→
totals/people). INTERNAL — **not shown in the UI** (no JSX/chip/observation); it sits after the
answer-planning engine, and its per-memory section weight feeds the significance engine (a memory backing a
strong assembled section = more significant) via the FINAL CLEAN optional
`SignificanceContext.answerAssemblyStrengthByMemoryId` extension (`Math.min(2, x/50)`; additive → adds 0 when
absent). **REQUIRED inputs = answer-plan + question-understanding + conversation-foundation + biography +
reasoning + life-story + journey + graph + understanding** (passed live); favourite/significant/relationship/
emotional are OPTIONAL refinements (forward-compatible; do NOT reorder the downstream pipeline to feed them).
No snapshot/DB change. **FIXED pipeline order:** snapshot → memory-understanding → memory-graph → journey →
life-story → reasoning → biography → conversation-foundation → question-understanding → answer-planning →
answer-assembly → story → favourite → anniversary → significance → emotional → personality → relationship →
priority → one `<Remy>` renderer. Types (`AnswerAssembly`/`AnswerSection`/`AnswerSectionKind`/`AnswerEvidence`/
`AnswerEvidenceKind`/`AnswerChronology`/`AnswerAssemblyContext`/`AnswerAssemblyCoverage`/`AnswerAssemblySummary`)
additive in `family-types.ts`. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7
lenses — purity / determinism / no-fabrication / platform-integrity / pipeline-order / consumption /
regressions — 0 findings). **This COMPLETES the deterministic intelligence stack** (memory-understanding →
… → answer-assembly). The next Remy layer would be the conversational/LLM RENDERING layer that CONSUMES this
package — a separate approved phase, NOT to be built without explicit approval. **Do NOT** build chat/GPT/LLM/
generated answers on top of this without that separate approved phase, surface it in the UI, invent
ids/sections, reference a non-real entity, put a clock/DB/randomness in it, reorder the downstream pipeline,
make output non-deterministic, or duplicate the significance engine.

**Remy — Conversation Rendering Engine (authoritative, 2026-07-09 — extends the ONE platform; the FIRST
PRESENTATION-LAYER engine):** a PURE core engine (`lib/remy/core/conversation-rendering-engine.ts`,
`buildConversationRender({ answerAssembly, tone?, verbosity?, perspective? }) → ConversationRender`) that
adds NO intelligence. The deterministic intelligence stack is COMPLETE; this is the FIRST presentation
layer. It consumes **ONLY** the already-complete `AnswerAssembly` (+ optional deterministic tone/verbosity/
perspective controls) and prepares deterministic RENDER INSTRUCTIONS (`ConversationRender`: sections/
metadata/summary/context) for a FUTURE conversational/LLM layer. **It does NOT retrieve / search / rank /
reason / infer / compare / evaluate-evidence / build-or-change-chronology / generate-facts, and it generates
NO natural language — NOT chat, NOT GPT, NOT an LLM.** **Sections** = the top-`maxSections` (per verbosity:
brief 4 / normal 8 / detailed 16) assembly sections as render instructions (structural `render-<sectionId>`
id + `style` hint [highlight/standard/supporting/summary, from the section's own kind + weight] + importance
+ the section's own real `evidenceIds`; no text). **Metadata** = `preferredOpening`/`preferredClosing` are
structural render-section-id **POINTERS** (never opening/closing TEXT) + `emphasis` (ids) + continuity +
confidence (carried from the assembly coverage). **Context** = the resolved tone/verbosity/perspective
controls + section budget + includeChronology flag + depth (the controls are deterministic metadata that
generate NO language). **Summary** = section/evidence counts + confidence + renderComplexity. **No prose, no
narration, no generated answers, no prompts, no invented ids** — every field is a structured id, enum, or
number; empty assembly → empty render. Deterministic (assembly sections arrive already sorted → slice + map
with `renderOrder` index; evidence Set drained by sort; structural ids; no clock/randomness → byte-identical
output). **CRITICAL: this presentation engine deliberately does NOT feed the significance pipeline** (it must
never rank memories; it is presentation prep, not a memory signal) — so there is **NO `significance-engine`
change and NO prior deterministic engine changed this phase**; in `RemyRelationship` it is computed
immediately after answer-assembly and `void`-ed (its consumer is the FUTURE conversational layer). INTERNAL —
**not shown in the UI** (render path byte-unchanged; exactly one `RemyMomentChip`). **REQUIRED input =
`AnswerAssembly` ONLY**; tone/verbosity/perspective are OPTIONAL controls. **FIXED pipeline order:** …
answer-assembly → conversation-rendering → story → favourite → … → priority → one `<Remy>` renderer. Types
(`ConversationRender`/`ConversationRenderSection`/`ConversationRenderMetadata`/`ConversationRenderContext`/
`ConversationRenderSummary`/`ConversationTone`/`ConversationVerbosity`/`ConversationPerspective`) additive in
`family-types.ts`; exported from `@/lib/remy` for the future conversational layer. Verified tsc/lint/build +
independent MULTI-AGENT adversarial review CLEAN (7 lenses — purity / no-language-generation /
consumes-only-assembly / determinism / platform-integrity+pipeline / consumption-intent / regressions — 0
findings). **Do NOT** make this engine retrieve/rank/reason/build-chronology/generate language, feed it into
significance/ranking, surface it in the UI, invent ids/sections, reference a non-real entity, put a clock/DB/
randomness in it, or make output non-deterministic. The next Remy layer would be the actual conversational/
LLM layer that CONSUMES this render + the AnswerAssembly — a separate approved phase, NOT to be built without
explicit approval.

**Remy — Conversation Composer Engine (authoritative, 2026-07-09 — extends the ONE platform; the FIRST
natural-language-PLANNING layer):** a PURE core engine (`lib/remy/core/conversation-composer-engine.ts`,
`buildConversationComposition({ conversationRender, answerAssembly, style?, audience?, intent? }) →
ConversationComposition`) that adds NO intelligence. It consumes **ONLY** the already-approved
`ConversationRender` + the `AnswerAssembly` it renders (+ optional deterministic style/audience/intent
controls) and prepares a deterministic COMPOSITION PLAN of how a FUTURE LLM/API provider would compose the
answer. **It generates NO language** (no sentences/paragraphs/prose/prompts/LLM calls — NOT chat, NOT GPT,
NOT an LLM) and performs **NO** retrieval / search / ranking / reasoning / chronology-construction /
significance / evidence-scoring / factual decisions. **Composition sections** map each render section → a
structural role hint (lead/body/aside/summary) + paragraph plans; **paragraph plans** group **sentence
plans** whose `kind` is a structural ROLE (opening/topic/evidence/transition/closing — **never text**);
**reference plans** point at real entity ids (the kind is looked up from the real answer section via a
`kindMapOf` JOIN — not retrieval/ranking); **flow** = opening/closing section-id POINTERS + transition ids +
section order; metadata/context carry the render's tone/verbosity + counts. **No prose, no narration, no
generated text, no prompts, no invented ids** — every field is a structured id, enum, or number; empty
render → empty composition. Deterministic (iterates render sections in their existing renderOrder; structural
ids `compose-<renderId>`/`<sectionId>-p<i>`/`-s<i>`/`-r<i>`; Maps/Sets query-only; no clock/randomness →
byte-identical output). **CRITICAL: this presentation-side engine deliberately feeds NOTHING** — there is
**NO `significance-engine` change and NO prior deterministic engine changed** (among `lib/remy/core/*.ts`
only `family-types.ts` [additive] changed); in `RemyRelationship` it is computed immediately after the render
and `void`-ed (its consumer is the FUTURE LLM/API conversational layer). INTERNAL — **not shown in the UI**
(render path byte-unchanged; exactly one `RemyMomentChip`). **REQUIRED inputs = `ConversationRender` +
`AnswerAssembly` ONLY**; style/audience/intent are OPTIONAL controls. **FIXED pipeline order:** …
answer-assembly → conversation-rendering → conversation-composer → story → favourite → … → priority → one
`<Remy>` renderer. Types (`ConversationComposition`/`ConversationCompositionSection`/
`ConversationCompositionMetadata`/`ConversationCompositionContext`/`ConversationCompositionSummary`/
`ConversationStyle`/`ConversationAudience`/`ConversationIntent`/`ConversationFlow`/`ConversationParagraph`/
`ConversationSentencePlan`/`ConversationReferencePlan`) additive in `family-types.ts`; exported from
`@/lib/remy` for the future LLM/API provider. Verified tsc/lint/build + independent MULTI-AGENT adversarial
review CLEAN (7 lenses — purity / determinism / consumes-only-render / no-language-generation /
platform-integrity / pipeline-integrity / regressions — 0 findings). **Do NOT** make this engine
retrieve/rank/reason/build-chronology/generate language, feed it into significance/ranking, import any other
engine, surface it in the UI, invent ids, reference a non-real entity, put a clock/DB/randomness in it, or
make output non-deterministic. The next Remy layer would be the actual conversational/LLM PROVIDER that
verbalizes this composition + the AnswerAssembly — a separate approved phase, NOT to be built without
explicit approval.

**Remy — Conversation Verbalizer Engine (authoritative, 2026-07-10 — extends the ONE platform; the FIRST
provider-boundary layer):** a PURE, deterministic, SYNCHRONOUS core engine
(`lib/remy/core/conversation-verbalizer-engine.ts`, `buildConversationOutput({ conversationComposition,
conversationRender, answerAssembly, provider?, model?, temperature? }) → ConversationOutput`). It is
architecturally the FIRST conversational PROVIDER layer — the only place natural language WOULD be produced —
**but the actual LLM verbalization is DEFERRED** (consistent with the launch-only priority and the
codebase-wide AI-connection deferral). **The engine makes NO network/LLM call**; it consumes ONLY the
already-complete `ConversationComposition` (+ the `ConversationRender`/`AnswerAssembly` it composes) read-only
and assembles the deterministic **PROVIDER REQUEST** a FUTURE provider adapter (OpenAI/Anthropic/…) would
send: **(1) the strict prompt** with the mandatory **PROMPT CONTRACT** embedded VERBATIM — "You are not
allowed to retrieve information / rank memories / infer new facts / change chronology; You must verbalize
ONLY the supplied ConversationComposition; Every factual statement must trace to supplied references; If
information is missing, do not invent it" — plus the structured composition serialization; **(2) citations**
(paragraph → sentence ids → reference ids → real entity ids, for traceability); **(3) provider metadata**
(provider [default `"deferred"`]/model/temperature); **(4) token** estimate (`ceil(prompt.length/4)`,
completion 0); **(5) generation** metadata (prompt + contract + status). **`text` is empty `""`,
`metadata.verbalized=false`, `generation.status="deferred"`.** It does **NO intelligence** (no retrieve /
search / rank / infer / compare / evaluate-evidence / decide-chronology / score-significance / build-plans /
render-metadata / composition / hallucinate-facts / invent-references — every refId resolves from an EXISTING
`referencePlan`). **PROVIDER BOUNDARY / LLM RESPONSIBILITIES:** a real provider ADAPTER (the ONLY place a
`fetch`/network/LLM call may EVER live) is **NOT built** — a future phase plugs it in behind the provider
seam and fills `text`; the LLM may choose **WORDING** but NOT **content** (it may not change chronology /
importance / ordering / references / facts / memory-ids — the prompt contract enforces this).
**DETERMINISTIC vs NON-DETERMINISTIC BOUNDARY:** all inputs + this pure output are deterministic (structural
ids, ordered iteration, query-only Maps, `ceil` token estimate, no clock/randomness → byte-identical
output); the ONLY non-determinism (a future LLM's wording) is not present in this output (`text=""`).
**CRITICAL: this provider-side engine feeds NOTHING** — there is **NO `significance-engine` change and NO
prior deterministic engine changed** (among `lib/remy/core/*.ts` only `family-types.ts` [additive] changed);
in `RemyRelationship` it is computed immediately after the composer and `void`-ed (consumer = the future
provider adapter). INTERNAL — **not shown in the UI** (render path byte-unchanged; exactly one
`RemyMomentChip`). **REQUIRED inputs = `ConversationComposition` + `ConversationRender` + `AnswerAssembly`**;
provider/model/temperature are OPTIONAL controls. **FIXED pipeline order:** … answer-assembly →
conversation-rendering → conversation-composer → conversation-verbalizer → story → favourite → … → priority
→ one `<Remy>` renderer. Types (`ConversationOutput`/`ConversationOutputMetadata`/`ConversationCitation`/
`ConversationGeneration`/`ConversationTokenUsage`/`ConversationProvider`) additive in `family-types.ts`;
exported from `@/lib/remy` for the future provider adapter. Verified tsc/lint/build + independent MULTI-AGENT
adversarial review CLEAN (7 lenses — purity / provider-isolation / no-intelligence / prompt-safety /
determinism-boundaries / platform-integrity / regressions — 0 findings). **Do NOT** make the pure engine
call a real LLM/network/fetch (that belongs ONLY in a future provider adapter behind the seam), do
intelligence, weaken the prompt contract, feed it into significance/ranking, import any other engine, surface
it in the UI, invent ids, reference a non-real entity, put a clock/DB/randomness in it, or make the output
non-deterministic. The next Remy layer would be the actual provider ADAPTER (real OpenAI/Anthropic call) that
verbalizes this request — a separate approved phase, NOT to be built without explicit approval.

**Remy — Conversation Provider Interface (authoritative, 2026-07-10 — extends the ONE platform; the provider
ABSTRACTION layer):** the provider abstraction the FUTURE provider adapters implement, in a new
`lib/remy/providers/` subsystem. **It does NOT connect to OpenAI/Anthropic/Gemini/Azure/Ollama or any network —
NO fetch, NO SDK, NO async, NO network, NO wiring.** It creates ONLY the abstraction. Four PURE files:
**`conversation-provider.ts`** = the sole `ConversationProviderAdapter` interface (`generateConversation(request:
ConversationOutput): Promise<ConversationOutput>` + `configuration(): ProviderConfiguration` + `health():
ProviderHealth`; the provider layer may **ONLY** accept a `ConversationOutput` and return one — it MUST NOT
retrieve memories / rank / reason / score / plan / render / compose). **`provider-types.ts`** = `ProviderName`
(deferred/openai/anthropic/gemini/azure-openai/ollama/lm-studio/custom-enterprise) / `ProviderCapability` /
`ProviderConfiguration` / `ProviderHealth` (+ `ProviderHealthStatus`) / `ProviderResult` / `ProviderLimits` /
`ProviderVersion`. **`provider-errors.ts`** = `ProviderErrorCode` + the throwable `ProviderError extends Error`
(code + provider) + `notImplementedError`. **`provider-registry.ts`** = a **deterministic** registry mapping
EVERY `ProviderName` to a `DeferredProvider` stub whose `generateConversation` **simply THROWS "Provider not
implemented."** (NOT async — a synchronous throw satisfying the `Promise<ConversationOutput>` return type;
`configuration().implemented=false`, `health().status="unimplemented"`), plus `getConversationProvider` /
`listProviders` / `isProviderImplemented` (all deterministic; `isProviderImplemented` always false). **FUTURE
ADAPTERS documented, NONE implemented:** OpenAI, Anthropic, Gemini, Azure OpenAI, Ollama, LM Studio, Custom
Enterprise — **each future adapter is the ONLY place a `fetch`/SDK/real LLM call may EVER live.** **NO wiring**
into RemyRelationship, **NO UI/JSX**, **NO provider call**, and **NO existing file changed** (only the new
`lib/remy/providers/` directory was added — `git diff HEAD` = pbxproj only; RemyRelationship / `lib/remy/index.ts`
/ significance-engine / family-types / all prior engines byte-unchanged; still exactly one `RemyMomentChip`).
Intentionally **NOT exported from `@/lib/remy`** (internal platform infra, not a feature API — a future adapter
imports the siblings directly). Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7
lenses — purity / provider-isolation / no-intelligence / abstraction-correctness / determinism /
platform-integrity / regressions — 0 findings). **Do NOT** implement a real provider (network/SDK/fetch/async)
in this abstraction, do intelligence in the provider layer, wire it into RemyRelationship/UI/significance, or
make the registry non-deterministic. A real provider ADAPTER is a separate approved phase — the ONLY place a
real LLM/network call may EVER live.

**Remy — Conversation Request/Response model (authoritative, 2026-07-10 — extends the ONE platform;
provider-request refactor):** a PURE ARCHITECTURAL REFACTOR (`lib/remy/core/conversation-request-engine.ts` +
additive types in `family-types.ts`) that separates the overloaded Phase-18 `ConversationOutput` — a
"provider request" object carrying an empty `text` field (architecturally a REQUEST, not an OUTPUT) — into a
dedicated **`ConversationRequest`** (provider INPUT) + **`ConversationResponse`** (provider OUTPUT
foundation), BEFORE any real provider adapter is built. **`ConversationRequest`** = `prompt` (a structured
`ConversationPrompt` system/body/full with the 7-clause contract in `prompt.system`) + `contract`
(`ConversationContract` clauses + version) + `citations` (reused `ConversationCitation[]`) + `metadata`
(provider-agnostic controls: style/audience/intent/tone/verbosity) + `summary` (counts + prompt-token
estimate); **it MUST NOT contain generated text** (no `text` field). **`ConversationResponse`** = `text` +
`provider` + `model` + `usage` + `status` (`ConversationResponseStatus`: deferred/generated/failed) +
`citations` + `metadata`; **it MUST NOT contain the prompt** — intentionally minimal, filled by a FUTURE
provider (no engine produces it yet). `buildConversationRequest({ conversationComposition, conversationRender,
answerAssembly }) → ConversationRequest` is a PURE, deterministic transform that produces a
`ConversationRequest` ONLY (never a `ConversationResponse`), carrying the SAME deterministic request info the
verbalizer produces into the dedicated model (a migration-safe drop-in). It does **NO intelligence** (no
retrieval / ranking / chronology / reasoning / language-generation — pure serialization of the ordered plans;
every refId resolves from an EXISTING referencePlan; `answerSectionById.has(...)` only annotates
`source=assembly`, not a search/rank). Deterministic (ordered iteration; query-only Maps; `ceil` token
estimate; no clock/randomness → byte-identical output). **`ConversationOutput` (Phase 18) is RETAINED** for
backwards compatibility until a future migration phase. **NO provider/network/SDK/fetch/async/Promise, NO
wiring, NO UI, NO index.ts export, NO significance/intelligence change, NO existing engine modified** — the
verbalizer, composer, rendering engine, provider interface/registry, significance-engine, RemyRelationship,
and `index.ts` are all byte-unchanged (`git diff HEAD` = `family-types.ts` [additive] + the ios pbxproj only;
the new engine is untracked; still exactly one `RemyMomentChip`). Types (`ConversationRequest`/
`ConversationRequestMetadata`/`ConversationPrompt`/`ConversationContract`/`ConversationRequestSummary`/
`ConversationResponse`/`ConversationResponseMetadata`/`ConversationResponseUsage`/`ConversationResponseStatus`)
additive in `family-types.ts`. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7
lenses — purity / determinism / no-intelligence / request-response-architecture / platform-integrity /
regressions / future-migration-safety — 0 findings). **Do NOT** remove `ConversationOutput` before the
migration phase, add `text` to `ConversationRequest` or `prompt` to `ConversationResponse`, make the request
engine call a provider / do intelligence / be non-deterministic, wire it into RemyRelationship/UI/significance,
or export it from `@/lib/remy`. **Future migration:** a later approved phase points the provider interface
(`generateConversation`) at `ConversationRequest` → `ConversationResponse` and then retires `ConversationOutput`.

**Remy — Conversation Provider Migration (authoritative, 2026-07-11 — extends the ONE platform;
provider-abstraction type-migration):** the conversation provider ABSTRACTION was migrated from the legacy
`ConversationOutput` request model to the canonical `ConversationRequest` → `ConversationResponse`
architecture. **PURE, types-only, behaviour-preserving; NO real provider implemented.** The
`ConversationProviderAdapter` interface method (`lib/remy/providers/conversation-provider.ts`) is now
`generateConversation(request: ConversationRequest): Promise<ConversationResponse>` (was `ConversationOutput
→ Promise<ConversationOutput>`). The `DeferredProvider` (`provider-registry.ts`) migrated to the same
signature and its **BODY is byte-unchanged** — still the synchronous `void request; throw
notImplementedError(this.name)` (NO async introduced — a `never`-typed throw satisfies the
`Promise<ConversationResponse>` return; execution model preserved; `configuration()`/`health()`/
`getConversationProvider`/`listProviders`/`isProviderImplemented` unchanged). **`ConversationOutput` is
`@deprecated` but RETAINED** (JSDoc pointing at `ConversationRequest`; its 5 fields byte-unchanged; a future
phase removes it) — the verbalizer (`buildConversationOutput`), `RemyRelationship`, the `index.ts`
re-export, and `provider-types.ts` `ProviderResult.output` still reference it and compile (the `@deprecated`
JSDoc adds NO lint warnings — `no-deprecated` isn't enabled). **NO network/SDK/fetch/async, NO wiring/UI/
index.ts change, NO significance/intelligence change, NO other engine modified.** Only 3 files changed
(`conversation-provider.ts`, `provider-registry.ts`, `family-types.ts`); the request/verbalizer/composer/
rendering/significance engines, `RemyRelationship`, `index.ts`, `provider-types.ts`, `provider-errors.ts`
are byte-unchanged. Verified tsc/lint/build + independent MULTI-AGENT adversarial review CLEAN (7 lenses —
provider-abstraction-correctness / migration-correctness / backwards-compatibility / platform-integrity /
purity / regressions / future-provider-readiness — **0 confirmed blocking**). **KNOWN FOLLOW-UP (pre-existing
from Phase 20, non-blocking, NOT introduced here):** `ConversationResponse.provider` /
`ConversationResponseMetadata.provider` are typed by `ConversationProvider` (family-types — 5 values:
deferred/openai/anthropic/azure/local) which DIVERGES from the registry's `ProviderName` (providers — 8
values: +gemini/azure-openai/ollama/lm-studio/custom-enterprise). A future real adapter for those 5 extra
providers cannot set `provider` from its own `name` without reconciling the two enums (it is LATENT — the
deferred stub only throws, never builds a `ConversationResponse`; baseline tsc clean). **The future
real-adapter phase MUST reconcile `ConversationProvider` ↔ `ProviderName` first** (out of scope here — would
require editing `provider-types.ts`, and this migration was restricted to the 3 files above). **Do NOT** make
the deferred provider return a value instead of throwing (behaviour must stay preserved) or become async,
implement a real provider here, re-add `ConversationOutput` as the provider input, or remove
`ConversationOutput` before the removal phase.

**Remy — OpenAI Provider Adapter (authoritative, 2026-07-11 — extends the ONE platform; the FIRST real
production provider):** `lib/remy/providers/openai-provider.ts` is the first production implementation of
`ConversationProviderAdapter`, registered in `provider-registry.ts` for `"openai"` (every OTHER name still
maps to the `DeferredProvider` stub, preserved — still throws). **`OpenAIProvider` is a PURE EXECUTION
layer:** it receives the immutable `ConversationRequest` (built by the deterministic request engine), sends
`request.prompt.full` to OpenAI **EXACTLY as supplied** (a single `user` message — **NO rewriting / injecting
intelligence / reordering / enriching**), passes `request.citations` through **UNCHANGED**, and returns a
`ConversationResponse` (`text` / `provider:"openai"` / `model` / `usage` / `status:"generated"` / `citations`
/ `metadata`). It does **NO intelligence** (no retrieve/rank/reason/score/plan/render/compose/chronology) —
the deterministic Remy intelligence pipeline is entirely upstream and **UNCHANGED**. **The official OpenAI
SDK + network + env + async are ISOLATED inside `openai-provider.ts`** (the ONLY `"openai"` import in the
Remy provider layer; the OpenAI SDK was already a project dependency, used by `lib/openai.ts`/`app/api/
memory-chat` — **NO `package.json` change**). **Construction is side-effect-free** (constructor reads no env /
creates no client; `resolveApiKey`/`resolveModel` read `process.env.OPENAI_MODEL`/`OPENAI_API_KEY` lazily;
`new OpenAI({ apiKey })` is created inside `generateConversation`) so the registry stays deterministic and
makes NO network call at load. **Error handling:** missing `OPENAI_API_KEY` → `ProviderError("invalid-request")`
before any call; SDK/network failures are caught and converted via `toProviderError` (429→`rate-limited`,
≥500→`provider-failure`, else `invalid-request`; unknown→`provider-failure`) — **the raw SDK exception is
NEVER leaked** (a new generic-message `ProviderError` is thrown). **No retries/timeouts/fallbacks yet** (later
phases). **The adapter is DORMANT** — nothing in `app/`/`lib/`/`components/` outside the provider layer
invokes it (server-side, env-gated), so it changes **no runtime behaviour** of the app; it is infrastructure
ready for a FUTURE activation phase (activation — wiring a provider into a user-facing flow — is a SEPARATE
approved phase, NOT to be built without explicit approval). **Enum handling (no mapping layer):** the
response's `provider`/`metadata.provider` use the `ConversationProvider`-typed literal `PROVIDER_TAG =
"openai"` (`"openai"` ∈ BOTH the `ConversationProvider` [5-val] and `ProviderName` [8-val] unions); `this.name`
stays `ProviderName`. **Pre-work (enum unification):** investigated and **PRESERVED** the existing design —
full unification needs either a core→providers dependency inversion or a breaking change to
`ConversationProvider`'s members, neither "without changing public architecture"; OpenAI needs no unification,
and NO temporary mapping layer was introduced. **STILL-OPEN follow-up:** reconcile `ConversationProvider` ↔
`ProviderName` before a real adapter for gemini/azure-openai/ollama/lm-studio/custom-enterprise is built. Only
`provider-registry.ts` + the new `openai-provider.ts` changed; `family-types.ts` (`ConversationRequest`/
`ConversationResponse` unchanged), the request/verbalizer/composer/rendering/significance engines,
`RemyRelationship`, `index.ts`, `conversation-provider.ts`, `provider-types.ts`, `provider-errors.ts`, and
`package.json` are byte-unchanged; still exactly one `RemyMomentChip`. Verified tsc/lint/build + independent
MULTI-AGENT adversarial review CLEAN (7 lenses — provider-correctness / sdk-correctness / error-handling /
architecture-purity / regressions / platform-integrity / future-multi-provider-readiness — 0 findings). **Do
NOT** invoke this provider from RemyRelationship/UI/significance (activation is a future approved phase), add
intelligence/retrieval/ranking to the provider, rewrite/modify the prompt or citations, un-isolate the SDK
(network/SDK stays ONLY in `openai-provider.ts`), read env / create the client at construction, add a new
dependency, or leak SDK exceptions. **A second real adapter** (Anthropic/Gemini/…) implements the SAME
interface and must first reconcile the two provider-identifier enums.

**Remy — Provider Registry Activation (authoritative, 2026-07-11 — extends the ONE platform; makes the
registry the SINGLE authoritative provider resolver, still DORMANT):** an architectural activation phase
that makes `lib/remy/providers/provider-registry.ts` the ONE canonical mechanism for resolving conversation
providers, **while preserving existing behaviour and WITHOUT activating any user-facing AI** (it only
prepares for Phase 24). **NO provider is wired into any user-facing execution path; no provider executes.**
Confirmed pre-work: **nothing outside `lib/remy/providers/` imports/constructs/resolves a provider** (repo
sweep = zero external importers; `getConversationProvider` is not even *called* yet) — so the layer is fully
self-contained + dormant. **What changed (comment/type-neutral except the two additive registry exports):**
**(1)** the registry gained a resolution-only production seam — **`PRODUCTION_PROVIDER: ProviderName =
"openai"`** (a **fixed deterministic literal**, never env-derived) + **`getProductionProvider():
ConversationProviderAdapter`** which **delegates to `getConversationProvider(PRODUCTION_PROVIDER)`** (the
single canonical resolver — **no second/competing resolution path**). Both **RESOLVE ONLY** — they return an
adapter instance and **NEVER call `generateConversation`, open a network connection, read env, or execute a
provider**. Nothing invokes `getProductionProvider` yet; **Phase 24 will** use this seam to actually run the
provider. **(2)** now-false post-Phase-22 docstrings across the provider layer (`conversation-provider.ts`,
`provider-types.ts`, `provider-registry.ts`) that still claimed **"NONE implemented" / "always false" /
"always reports unimplemented" / "the ONLY registered adapter"** were corrected to the truth (**OpenAI is
implemented; every other name is deferred**) — **interface signatures + type definitions are byte-identical**
(comment-only). **`"openai"` resolves to the real `OpenAIProvider`; every other name resolves to
`DeferredProvider`, whose `generateConversation` still THROWS `notImplementedError`** (behaviour byte-unchanged
from Phase 22). **Registry construction stays deterministic** — no network, no SDK creation, no env read at
module load or at construction (the OpenAI adapter's client + env stay lazy inside its own
`generateConversation`, in the byte-unchanged `openai-provider.ts`). The legacy **`ProviderResult`** type (still
typed on the deprecated `ConversationOutput`) was **deliberately left byte-unchanged** — it belongs to the
separate `ConversationProvider`(5)↔`ProviderName`(8) reconciliation follow-up, not this phase. **Only 3
provider-layer files changed** (`provider-registry.ts` + `conversation-provider.ts` + `provider-types.ts`) +
docs; **byte-unchanged:** `family-types.ts`/`ConversationRequest`/`ConversationResponse`, the request/
verbalizer/composer/rendering/significance engines, `openai-provider.ts`, `provider-errors.ts`,
`lib/remy/index.ts`, `RemyRelationship.tsx`, all UI/routes/API, `package.json`, `package-lock.json`; still
exactly one `RemyMomentChip`. Verified tsc/lint/build green + independent MULTI-AGENT adversarial review CLEAN
(7 lenses — registry correctness / provider-abstraction correctness / platform integrity / regression
detection / deterministic construction / future multi-provider readiness / architectural purity — every raw
finding adversarially refuted; 0 confirmed blocking, 0 confirmed non-blocking). **Phase 24 will ACTIVATE** —
wire `getProductionProvider()` into a user-facing execution path and actually call `generateConversation`
(a separate approved phase, NOT built here). **Do NOT** invoke a provider / call `generateConversation` from
the registry, RemyRelationship, UI, routes, or significance (activation is Phase 24); add a second resolution
path or duplicate the registry; make `PRODUCTION_PROVIDER` env-derived or the registry construction
non-deterministic (no network/SDK/clock/env at construction); or migrate `ProviderResult` / reconcile the
provider-identifier enums here (that is the divergent-adapter phase).

**Remy — Production Provider Activation (authoritative, 2026-07-11 — extends the ONE platform; the FIRST
end-to-end conversation EXECUTION path, still uninvoked):** activates the provider architecture built in
Phases 18–23 by wiring the already-built deterministic pipeline into the production provider. **NOT a
redesign, NOT prompt engineering, NOT retrieval** — just the first execution of the already-built pipeline.
**The ONLY change is ONE new file:** `lib/remy/providers/conversation-execution.ts`, exporting the single
async **`executeConversation(input): Promise<ConversationResponse>`** (input = the request engine's
`ConversationRequestInput` = `{ conversationComposition, conversationRender, answerAssembly }`). It composes,
in order: **(1)** `buildConversationRequest(input)` (the pure Phase-20 request engine — builds the immutable
`ConversationRequest`, incl. `prompt.full`), **(2)** `getProductionProvider()` (the Phase-23 registry seam —
resolves the authoritative production provider, currently `OpenAIProvider`), **(3)**
`provider.generateConversation(request)` → `ConversationResponse`. **The provider receives `request.prompt.full`
EXACTLY as produced by the request engine** — NO rewriting/injection/enrichment/prompt-manipulation here (the
OpenAIProvider itself sends it verbatim). It performs **NO intelligence** (no retrieval/ranking/chronology/
reasoning/significance/planning/language-generation); it **uses `getProductionProvider()`** (never instantiates
a provider, **never imports OpenAI**, **never bypasses the registry**); and it preserves `ConversationRequest`/
`ConversationResponse` and every deterministic engine **exactly**. **Placement:** the file lives in the
**provider layer** (the network-capable boundary — it is `async` and can trigger a real provider call); it
imports only the pure `buildConversationRequest` from core (a safe one-way **providers→core** dependency — core
stays provider-free, no import cycle). **Deterministic-vs-nondeterministic boundary:** the request BUILD stays
pure/deterministic; the ONLY non-determinism is the provider's LLM call itself, exactly at
`generateConversation` — this file adds no clock/`Math.random`, reads no env, and constructs no provider state
at module load (side-effect-free import; the OpenAI client/env stay lazy inside the byte-unchanged
`openai-provider.ts`). **Verbalizer note:** the deprecated Phase-18 `buildConversationOutput` verbalizer
produces the `@deprecated ConversationOutput` (empty-text/deferred) — NOT the provider's input type — so Phase
20's `buildConversationRequest` superseded its request-building role and it is intentionally **NOT** in the
live path (the request engine builds the prompt; the OpenAIProvider is the runtime verbalizer). **DORMANT:**
**nothing invokes `executeConversation` yet** — no UI, no route, and it is **NOT** wired into `RemyRelationship`
(doing so would fire a real OpenAI call on every app-open — a forbidden behaviour change). It is the callable
activation seam exactly like `getProductionProvider()`; a future **Phase 25** wires it into a user-facing
conversational surface. **Exactly ONE execution path, no duplicate provider resolution.** Only the one new file
changed (+ docs); **byte-unchanged:** `family-types.ts`/`ConversationRequest`/`ConversationResponse`, the
request/verbalizer/composer/rendering/significance engines, `openai-provider.ts`/`provider-errors.ts`/
`provider-types.ts`/`provider-registry.ts`/`conversation-provider.ts`, `lib/remy/index.ts`,
`RemyRelationship.tsx`, all UI/routes/API, `package.json`/`package-lock.json`; still exactly one
`RemyMomentChip`. Verified tsc/lint/build green + independent MULTI-AGENT adversarial review CLEAN (7 lenses —
execution-correctness / provider-correctness / architecture-purity / runtime-regression / platform-integrity /
deterministic-execution / future-multi-provider-readiness — 0 findings). **Do NOT** invoke `executeConversation`
from `RemyRelationship`/UI/an app-open path (that is Phase 25 — a user-facing conversational surface), add a
second execution path or duplicate provider resolution, instantiate a provider directly / bypass the registry /
import OpenAI outside the provider layer, move intelligence/retrieval/ranking/planning into the execution seam,
rewrite/enrich `request.prompt.full`, or add retries/streaming/timeout/fallback/persistence here.

**Remy — Live Conversation Integration (authoritative, 2026-07-11 — the FIRST user-facing AI execution of the
conversation platform; supersedes Phase 24's "dormant" state):** `executeConversation` is now invoked by a
real user action. **Investigation that shaped the design (source-verified):** the deterministic companion
pipeline is **NOT** a question-answering flow — it is a life-story/significance analysis computed in
`RemyRelationship` on **app-open** (no question input), and the real **Ask Remy chat** (`answerAskRemy`,
`app/(app)/remy/ask-action.ts`) is a **separate, already-live AI-intelligence layer** (retrieval →
`answerAskQuestion` → `lib/openai.ts`) that never builds `ConversationComposition`/`ConversationRender`/
`AnswerAssembly`. So wiring `executeConversation` into `RemyRelationship` would fire a paid OpenAI call on
**every app-open** (a forbidden behaviour change), and splicing it into the live chat would need a forbidden
pipeline/retrieval redesign. **Operator-chosen solution: a NEW, isolated, OPT-IN, user-triggered surface —
"Remy narrates your story" (`/remy/story`).** **Files (4 new + 1 tiny edit):** **(1)**
`lib/remy/story-pipeline.ts` — a **PURE** orchestrator `buildStoryConversationInputs(snapshot)` that
**SEQUENCES the EXISTING 12 engines in the EXACT order + inputs `RemyRelationship` uses**
(memory-understanding → memory-graph → journey → life-story → reasoning → biography → conversation-foundation
→ question-understanding → answer-planning → answer-assembly → conversation-rendering → conversation-composer)
and returns `{ conversationComposition, conversationRender, answerAssembly }`. **NOT a new engine / new
intelligence / new pipeline architecture** — the same engines, deliberately duplicating `RemyRelationship`'s
inline sequence so the **app-open path stays byte-unchanged**; pure/deterministic (no network/DB/clock/random).
**(2)** `app/(app)/remy/story-action.ts` — a `"use server"` action `narrateStoryConversation()` that
**auth-gates + workspace-scopes** a snapshot load **mirroring `/api/remy/relationship-snapshot` exactly**
(My Nest = `memory_profile_id null` + `user_id`; care = active-profile cookie; people by
`created_by_account_id`), runs the orchestrator, calls **`executeConversation`** (→ `getProductionProvider()`
→ `OpenAIProvider`), and returns a **structured result `{ text, status, memoryCount }` that NEVER throws**
(the whole body + the loader are try/guarded; provider/network/auth/context failure — incl. an unconfigured
`OPENAI_API_KEY` — degrades to `status:"unavailable"`; a genuinely empty workspace → `status:"empty"`
**without** calling the provider). **The prompt is SERVER-AUTHORITATIVE** — the client passes **nothing**, so
it cannot craft or bill arbitrary provider calls. **(3)** `components/remy/RemyStoryConversation.tsx` — a
`"use client"` button that calls the action and renders `response.text` (+ `AIDisclaimer`, loading/empty/
unavailable states). **(4)** `app/(app)/remy/story/page.tsx` — the `/remy/story` page. **(edit)**
`app/(app)/remy/page.tsx` — one discovery `<Link>` card (no chat-logic change). **`executeConversation` now
has EXACTLY ONE caller** (`story-action.ts`); **no dormant seam remains.** **Reuse-not-redesign:** the live
Ask Remy chat, `RemyRelationship`/app-open path, every deterministic engine, and the whole provider layer
(`conversation-execution.ts`/`provider-registry.ts`/`openai-provider.ts`/…) are **byte-unchanged**; no new
provider/registry/engine; `executeConversation`/`getProductionProvider()`/`OpenAIProvider` used exactly as
built; no OpenAI import outside the provider layer; no prompt engineering; no retrieval rewrite;
`package.json` unchanged. Citations/metadata are preserved through the response (the MVP UI renders `.text`
per spec). **Naming note:** the orchestrator is `lib/remy/story-pipeline.ts` (a flat file) — deliberately NOT
`lib/remy/conversation/…` to avoid a basename collision with the existing `lib/remy/conversation.ts`.
**Activation:** requires a server-side `OPENAI_API_KEY` (operator env); iOS purchase-compliance is unaffected
(this is not a purchase). Verified tsc/lint/build green + independent MULTI-AGENT adversarial review CLEAN (7
lenses — execution / provider / architecture-purity / runtime-regression / security-scoping / determinism /
platform-integrity — every raw finding adversarially refuted, 0 confirmed blocking; 3 refuted-but-worthwhile
robustness fixes then applied + re-verified SOUND). **Do NOT** invoke `executeConversation` from
`RemyRelationship`/the app-open path or the live Ask Remy chat, add a second `executeConversation` caller or
execution path, let the client supply the prompt/inputs (keep it server-authoritative), instantiate a
provider directly / import OpenAI outside the provider layer, or make `narrateStoryConversation` throw.
**Follow-ups (not blockers):** per-question cost has no quota/entitlement gate yet (parity with the existing
chat), and the story surface's provider-call is not rate-limited — add a quota/rate-limit before heavy use.

**Remy — AI Usage, Billing & Observability (authoritative, 2026-07-11 — production hardening of the live AI
execution layer; instrumentation ONLY, no redesign):** every real AI execution is now measurable, cost-tracked,
quota-ready, and observable — WITHOUT redesigning Remy/providers/prompts/engines and WITHOUT a second execution
path. **KEY CONSTRAINT honoured:** the Phase-24 LOCKED decision forbids persistence INSIDE `executeConversation`,
so instrumentation lives in a **wrapper that is now `executeConversation`'s SINGLE caller** — `executeConversation`
and the entire provider layer are **byte-unchanged**. **The ONE execution path is unchanged:** UI → story-action
→ **`executeConversationWithUsage`** (instrumentation) → **`executeConversation`** → `getProductionProvider()` →
`OpenAIProvider`. The wrapper never reaches the provider itself — it is a decorator, NOT a second path.
**Files (all new + 1 edit):** **(1)** `supabase/migrations/20260711120000_ai_usage_foundation.sql` — the
**`ai_usage`** table (`id, user_id, workspace_id[=memory_profile_id, null=My Nest], provider, model, operation,
prompt/completion/total_tokens, estimated_cost numeric(12,6), latency_ms, status[success|error], error_code,
created_at`) + indexes + **RLS (SELECT-own only; NO insert policy → inserts are service-role only)** + a
**SERVICE-ROLE-ONLY `SECURITY DEFINER` aggregate `ai_usage_summary(user, workspace, since)`** (execute REVOKED
from public/anon/authenticated, granted to `service_role` — no IDOR via PostgREST). **(2)** `lib/ai/usage/cost.ts`
— the **SINGLE, isolated, provider-independent, model-aware** price table (`MODEL_PRICES`, published USD/1M rates,
operator-updatable) + `estimateCostUsd()` (unknown model → 0, never a guess; a longest-known-prefix fallback
handles OpenAI's dated snapshot ids like `gpt-4o-mini-2024-07-18` so costs aren't 0). **(3)** `lib/ai/usage/ai-usage.ts`
— usage types + **`classifyAiError()`** (maps `ProviderError.code` → taxonomy `missing_api_key` / `timeout` /
`rate_limited` / `provider_unavailable` / `invalid_request` / `invalid_response` / `unknown`) + **`recordAiUsage()`**
(service-role insert scoped by an explicit session-derived `user_id`; **NEVER throws AND never hangs the caller** —
degraded writes are swallowed, a stalled write is bounded by a 3 s timeout so it can't sit on the response path).
**(4)** `lib/ai/usage/quota.ts` — **`getUsageToday` / `getUsageThisMonth` / `getEstimatedMonthlyCost` /
`canExecuteConversation`** (**ARCHITECTURE ONLY, NOT ENFORCED** — `AI_USAGE_LIMITS` default `null` = unlimited, so
`canExecuteConversation` ALWAYS allows and short-circuits with **no DB read** while limits are off; reads degrade to
zeros, never throw; the single ready enforcement seam). **(5)** `lib/remy/execute-conversation-with-usage.ts` — the
wrapper: consults the gate **per-user** (cost control isn't bypassable by switching workspaces; the row still
records the actual workspace), times the call, records REAL usage from the `ConversationResponse` (tokens/model/
provider) + estimated cost on success, records a classified error on failure, and **RE-THROWS the original error**
(behaviour preserved — the action's try/catch still maps it to `"unavailable"`). **(edit)** `app/(app)/remy/story-action.ts`
— `loadStorySnapshot` now also returns `userId` + `workspaceId`; the action calls `executeConversationWithUsage(inputs,
{ userId, workspaceId, operation: "story_narration" })`; its never-throws/server-authoritative contract is unchanged.
**Uses REAL provider values** (tokens/model from OpenAI); **cost is one isolated model-aware layer** (no scattered
costs). **INERT until activated:** the code degrades silently until the operator applies the migration (writes/reads
never break execution), so the deploy is a no-op until then. **`executeConversation` has EXACTLY ONE caller (the
wrapper); the wrapper has exactly one caller (the story action); ONE execution path; no duplicate AI architecture.**
Byte-unchanged: `conversation-execution.ts` (`executeConversation`), provider-registry/openai-provider/provider-types/
conversation-provider/provider-errors, `family-types.ts`, all conversation/significance engines, `RemyRelationship`,
Ask Remy (`ask-action.ts`), `story-pipeline.ts`, `package.json`. No OpenAI import outside the provider layer.
Verified tsc/lint/build green + independent MULTI-AGENT adversarial review CLEAN (7 lenses — execution-integrity /
observability-correctness / never-breaks-execution / cost-correctness / security-scoping / quota-architecture /
scope-and-regression — 0 confirmed blocking; 2 worthwhile fixes then applied [bounded the awaited log write with a
timeout; made the dormant gate per-user]). **Do NOT** add a second `executeConversation`/wrapper caller or execution
path, move persistence INTO `executeConversation` (LOCKED), let `recordAiUsage`/quota throw or block/alter execution,
enforce quotas without setting `AI_USAGE_LIMITS`, scatter cost rates outside `cost.ts`, expose `ai_usage_summary` to
non-service-role, or import OpenAI outside the provider layer. **Operator step:** apply the migration + ensure
`SUPABASE_SERVICE_ROLE_KEY` is set (already required by other service-role features) to activate logging. **Follow-ups
(not blockers):** no usage UI yet; quotas are architecture-only (enforcement OFF); `ai_usage` has no retention/rollup.

**Remy — AI Subscriptions, Quotas & Usage Dashboard (authoritative, 2026-07-11 — production hardening; turns
the Phase-26 dormant quota architecture into REAL, subscription-aware enforcement + a usage dashboard/API +
server-only admin analytics; NO provider/prompt/architecture redesign, still ONE execution path):** the single
execution path is unchanged (UI → story-action → `executeConversationWithUsage` → `executeConversation` →
`getProductionProvider()` → `OpenAIProvider`); `executeConversation` still has EXACTLY ONE caller (the wrapper),
the wrapper EXACTLY ONE caller (the story action). **Entitlements (SINGLE config):**
`lib/ai/usage/entitlements.ts` — **`AI_PLAN_LIMITS`** keyed by `BillingPlan` (**FREE = 5/day + 50/month**;
**PREMIUM/FAMILY/ENTERPRISE = unlimited**) + `resolveAiEntitlement(profile)` (built on the existing
`resolveSubscription` — Premium ⇒ unlimited) + a neutral `AI_UPGRADE_MESSAGE`. **Do NOT scatter AI limits
elsewhere — change them here.** No Stripe/`plans.ts`/schema change (AI limits are AI-specific config, not a
Stripe product). **Quota enforcement (REAL):** `lib/ai/usage/quota.ts` — `canExecuteConversation(userId,
entitlement)` returns a STRUCTURED result (`allowed`/`tier`/`reason`/`daily+monthlyRemaining`/`upgradeMessage`),
**premium bypasses with NO DB read**, Free is enforced on **SUCCESSFUL** conversation counts (a failed provider
call never consumes quota), degrades to zeros, **NEVER throws**; a pure `evaluateConversationGate` lets the
dashboard reuse already-read counts. **Enforcement lives in the STORY ACTION as a PRE-check** (after the empty
check, BEFORE the expensive pipeline build) so a blocked Free user gets a structured `status:"quota_exceeded"`
(reason/remaining/upgradeMessage/tier) with **NO provider call**; the action still NEVER throws + stays
server-authoritative. **The wrapper's old dormant gate was REMOVED** (it can only return a
`ConversationResponse`); it is now pure execution + observability. **iOS anti-steering (Apple 3.1.1/3.1.3):**
`RemyStoryConversation` shows the upgrade copy **only on web** (`useIsNativePlatform` gate) — **NO purchase
link/CTA on native**. **Usage dashboard/API/settings:** `lib/ai/usage/overview.ts` `getAiUsageOverview` (today/
month windows, daily/monthly cost, remaining quota, **provider+model read via the registry seam
`getProductionProvider().configuration()` — provider-INDEPENDENT**, never OpenAI-specific), the presentational
`components/remy/AiUsageDashboard.tsx`, the display-only **`/settings/ai`** page (+ one `ProfileSection` link on
`/settings`), and **`GET /api/remy/usage`** (auth-gated, per-user, future-ready-for-mobile JSON; degrades, no
500). **Admin analytics (SERVER-ONLY):** `lib/ai/usage/admin-analytics.ts` — global conversations / success+error
rates / avg latency / avg tokens / spend / most-used model; **NOT wired to any public route** (there is no
admin-gate in the repo — server-only is the correct read of "never exposed publicly"). **Migration**
`supabase/migrations/20260711130000_ai_usage_analytics.sql` — service-role-only `SECURITY DEFINER` aggregates
`ai_usage_overview` (per-user) + `ai_usage_admin_overview`/`ai_usage_admin_model_usage` (global) with execute
**revoked from public/anon/authenticated** (no IDOR). **Provider-independence:** the missing-key classifier in
`ai-usage.ts` no longer probes `process.env.OPENAI_API_KEY` — it detects a missing key from the error MESSAGE
(agnostic), so **no OpenAI-specific logic remains in the AI-usage layer**; Claude/Gemini/Azure/Ollama plug in
via the provider registry with no change to this phase. Byte-unchanged: `executeConversation` + the whole
provider layer, `family-types.ts`/`ConversationRequest`/`ConversationResponse`, all conversation/significance
engines, `story-pipeline.ts`, Ask Remy (`ask-action.ts`), `RemyRelationship`, `lib/ai/usage/cost.ts`,
`package.json`. Verified tsc/lint/build green + independent MULTI-AGENT adversarial review CLEAN (7 lenses —
execution-integrity / quota-enforcement / entitlement-billing / security-scoping / provider-independence /
data-correctness / scope-regression — 0 confirmed blocking; the provider-independence fix above was then
applied). **Operator step:** apply BOTH `ai_usage` migrations + set `SUPABASE_SERVICE_ROLE_KEY` (already set)
to activate logging/quotas. **Do NOT** scatter AI limits outside `entitlements.ts`, add a second
`executeConversation`/wrapper caller or execution path, make the quota gate throw / block the UI / be
client-controllable, expose admin analytics or the `ai_usage_*` aggregates to non-service-role, put OpenAI-
specific logic outside the provider layer, or show a purchase link on native. **Known limitation (not a
blocker):** the quota gate is read-then-act (a soft cost-control cap, not a security boundary) — concurrent Free
requests could transiently exceed by up to N−1; the single-client UI serializes, so it's negligible.

**Remy — Memory Intelligence Engine V2 (authoritative, 2026-07-11 — the "advanced AI memory intelligence"
post-launch item, built ADDITIVELY as a reusable capability + data layer; NOT wired into any live path):** a
new self-contained subsystem **`lib/remy/memory-intelligence/`** introducing adaptive importance scoring,
relationship weighting, deterministic decay, reinforcement, cached classification, event clustering, forgotten
detection, and a configurable combined ranking — while PRESERVING the current architecture (the existing
`match_memories` semantic search + `lib/remy/retrieval.ts` blended ranker remain the foundation). **THE SINGLE
CONFIG is `config.ts`** — `MEMORY_IMPORTANCE_WEIGHTS`, `RELATIONSHIP_WEIGHTS`/tier values (spouse/partner/parent/
child **High** · sibling/friend/caregiver **Medium** · acquaintance **Low**), `DECAY_CONFIG`, `REINFORCEMENT_CONFIG`,
`RANKING_WEIGHTS`, `FORGOTTEN_CONFIG`, `MEMORY_CATEGORIES` taxonomy, `MEMORY_CLUSTER_TYPES` — **every weight/
threshold derives from here; do NOT scatter weights elsewhere.** **Pure deterministic engines** (no clock/DB/
`Math.random`/network — the caller passes `now`): `importance-engine` (weighted-sum/total → 0..1; revives the
previously-dead `ai_importance` string + emotional signals), `relationship-weighting` (`people.role` → tier →
0..1), `decay-engine` (**PINNED + medical/emergency/health NEVER decay; milestone/childhood/family decay very
slowly; frequent recall rewinds effective age; floored so nothing fully vanishes**), `reinforcement-engine`
(confidence rises with recall / falls with down-rank; pure `reinforce`/`downRank`; **down-rank designed for
FUTURE feedback, no UI**), `classification-engine` (**deterministic** free-form `ai_category`→controlled
taxonomy, CACHEABLE — not a GPT rebuild; medical/emergency bias applies **only on a real keyword hit**, so a
keyword-less memory correctly falls through to `miscellaneous` and is never mis-promoted to a protected class),
`clustering-engine` (deterministic event clusters — wedding/hospital-stay/university/holiday/moving-house/
employment/school/family-event/birthday), `forgotten-engine` (never-recalled/stale/lost-significance; INTERNAL,
no UI), `ranking-engine` (final 0..1 = weighted blend of **Semantic+Importance+Relationship+Recency+
Reinforcement+Confidence**, configurable), `engine.ts` orchestrator (`scoreMemoriesV2`). **Data layer** (the
ONLY DB module, `store.ts`, service-role, scoped by explicit session-derived `user_id`, BATCH reads = no N+1,
lazy defaults so a missing row needs no backfill, **NEVER throws**) + **migration**
`20260711140000_memory_intelligence.sql` — a NEW `memory_intelligence` side table (1:1 FK `memory_id`→memories
on delete cascade; retrieval_count/last_recalled_at/reinforcement/down_rank/conversation/pinned/favourite/cached
classification+cluster) + **RLS select-own; writes service-role only** + `backfill_memory_intelligence` +
atomic `reinforce_memory` RPCs (both SECURITY DEFINER, execute revoked from public/anon/authenticated → no IDOR)
+ a touch trigger. **It does NOT ALTER the `memories` table** (honours "never modify production tables in
place") and is **reversible** (rollback block in the migration). The `store.ts` write path is **user-scoped**
(scoped update-then-insert — a foreign-user row can never be re-owned). **DORMANT/ADDITIVE:** nothing imports
the subsystem yet — the live Ask Remy retrieval, story pipeline, execution path (`executeConversation` + wrapper
each still ONE caller, ONE execution path), provider layer, billing, quota, and usage dashboard are all
**byte-unchanged**; there is **no second execution path, no duplicate retrieval pipeline, no OpenAI import**
(provider-independent). Activation (wiring V2 ranking/reinforcement into a retrieval path) is a FUTURE approved
phase. Verified tsc/lint/build green + a 28-assertion runtime formula check + independent MULTI-AGENT
adversarial review (7 lenses — algorithm-correctness / purity-determinism / single-config / additive-no-
regression / security-scoping / performance / migration-datalayer): the one blocking finding (classification
bias) and the one non-blocking finding (write scoping) were fixed and independently re-verified CLEAN.
**Operator step:** apply `20260711140000_memory_intelligence.sql` to activate persistence (reads/writes degrade
silently until then). **Do NOT** wire V2 into Ask Remy/story/the execution path without a separate approved
phase, scatter weights outside `config.ts`, put a clock/DB/`Math.random` in a pure engine, alter the `memories`
table, make `store.ts` throw or an unscoped write, or classify a keyword-less memory into a protected class.

**RC2 — Security Hardening (authoritative, 2026-07-11 — production security posture; NO feature/UI/architecture
change):** the RC1 audit's code-implementable security items are DONE. **(1) HTTP security headers**
(`next.config.js` `headers()` on every response): CSP, HSTS (2y, preload), `X-Frame-Options: DENY`, nosniff,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies:
none`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`. **CSP compatibility (LOCKED reasoning):** the
Capacitor iOS app loads the LIVE site via `server.url`, so headers reach the native app — the CSP is
deliberately permissive (`script-src` allows `unsafe-inline`/`unsafe-eval`; `connect/img/media-src` allow
`https:`/`wss:`) to NOT break Next/Supabase-realtime/Stripe/OneSignal/Sentry, while `frame-ancestors 'none'` /
`object-src 'none'` / `base-uri 'self'` / `form-action` stay strict. A **nonce-based `script-src`** (drop
`unsafe-inline/eval`) + tightened `connect-src` allowlist is the documented FUTURE hardening — do NOT tighten
the CSP without testing the Capacitor webview + realtime + Stripe. **(2) API rate limiting** —
`lib/security/rate-limit.ts` (dependency-free in-memory sliding window; ONE `RATE_LIMITS` config; `enforceRateLimit`
→ 429 + `Retry-After`, `isRateLimited` for actions; **fails OPEN**, `MAX_KEYS` eviction). Applied, keyed by
session `user.id` AFTER auth, to: `upload-url`, `memory-chat`, `memories/create`, `memories/[id]/enrich` (its own
`enrich` preset ≥ create), `stripe/checkout`, `stripe/portal`, `gdpr/export`, `gdpr/delete-account`, and the
`story-action`. In-memory = **per-warm-instance baseline**; a distributed Upstash/Redis store keyed identically
is the documented **operator upgrade** for multi-instance guarantees. **(3) Logging hardening** — `lib/logger.ts`
(`debug`/`info` DEV-ONLY; `warn`/`error` always → Sentry unaffected). **NEVER log PHI/PII** (memory content/
titles, names, emails, sensitive ids). `lib/retrieve-memory-context.ts` no longer logs memory content/context
(was `console.log(matches)`/context — the RAG PHI leak); the `stripe/checkout` `USER EMAIL` log removed; webhook/
checkout/create/insights narration gated to `logger.debug/info`. **(4) Dead code** — deleted the 3 orphan routes
`app/api/{search,create-reminder,send-reminders}` (zero callers; `app/api/search/global` is a DIFFERENT live
route; the live reminder cron is `/api/cron/send-due-reminders`) + cleaned residual middleware/e2e references.
**(5) OWASP fixes** (verified via a MULTI-AGENT ASVS/API-Top-10 review — authorization was otherwise CLEAN: no
IDOR, no unscoped service-role query, no missing auth gate): `POST /api/active-profile` now auth-gates +
`userCanAccessProfile`-checks the target profileId BEFORE writing the CARE cookie; `inviteCaregiver` resolves the
invitee via a **scoped** `.ilike(email)` (LIKE metacharacters escaped) instead of a full-table fetch; the
**middleware top-level catch FAILS CLOSED** (redirect `/login`) for non-public routes; `send-notification` no
longer returns the raw DB error/exception; `app/auth/logout` uses `new URL("/login", request.url)` (was a
hardcoded `http://localhost:3000`); `/api/health` no longer discloses the commit SHA. **Session/cookies** were
already SOLID (Supabase httpOnly/secure/sameSite; the active-context cookie httpOnly+secure(prod)+sameSite=lax);
**error leakage** otherwise well-contained (generic client messages). Verified tsc/lint/build green + independent
MULTI-AGENT adversarial review CLEAN (7 lenses; 0 confirmed blocking; all 6 non-blocking findings fixed +
re-validated). **KNOWN REMAINING (do NOT re-flag as new; scheduled):** ~~**(HIGH, deferred)** the memory-EDIT
kept-attachment storage-quota bypass~~ — **RESOLVED (see the RC2-follow-up note below).** **(Product decision):**
the live **Ask Remy chat + `/api/memory-chat`**
call OpenAI with NO `canExecuteConversation` quota gate / no `recordAiUsage` (rate-limited now, but not
quota-gated) — decide whether Ask Remy counts against the AI quota before gating it. **Do NOT** tighten the CSP
without Capacitor/realtime/Stripe testing, remove `unsafe-inline` without a nonce pipeline, log PHI/PII, or
re-introduce the deleted orphan routes.

**RC2 follow-up — memory-EDIT kept-attachment storage-quota bypass FIXED (authoritative, 2026-07-11 —
surgical security fix, closes the RC2 deferred HIGH):** the storage ledger trigger projects each attachment's
`->>'size'` from `memories.attachments` jsonb, so `PUT /api/memories/[id]` trusting the CLIENT-reported `size`
of KEPT attachments let a client under-count the ledger and bypass the storage quota (the create/new-attachment
path was already authoritative). **Fix:** in BOTH edit branches — the active JSON direct-to-storage branch AND
the dormant multipart rollback branch — every KEPT attachment's `size` is now re-derived from AUTHORITATIVE
storage metadata via `getStorageObjectInfo(supabase, a.storagePath ?? a.url)` (the **same** helper the
new-attachment path uses) BEFORE the array is persisted / passed to `buildMemoryMediaPayload`; only `size` is
corrected (`{ ...a, size: info.size }` when `info.exists && info.size != null`, else the attachment is kept
unchanged — no data loss, and a missing/foreign path cannot under-report a real object). `Promise.all` preserves
order; url/name/type/mimeType/storagePath/schema/cover/API-shape/ownership-guard all unchanged. **The multipart
fix lives in the ROUTE, not the shared media pipeline** (`normalizeAttachments`/`handleMemoryMediaUpload` stay
byte-unchanged — they still trust the reported size; the route now hands them corrected sizes). The pre-existing
final owner-scope guard (`isOwnedStoragePath` over the whole final set) 400-rejects foreign/planted kept paths,
so a client cannot point a kept attachment at another user's smaller object to under-report. Verified tsc/lint/
build green + a focused adversarial review (quota-bypass / client-trust / spoofing / TOCTOU / mixed-edits — the
HIGH is FULLY ELIMINATED). **Residuals are PRE-EXISTING + orthogonal (NOT re-opened by this fix, do not re-flag
as new):** the documented orphan-object gap (a dereferenced object stays in the bucket uncounted — needs the
not-yet-built orphan-sweep cron), the non-forceable `exists=true && size=null` fallback (Storage, not the
client, controls whether size is surfaced), the coarse read-then-persist TOCTOU shared with the create path, and
the ledger's `DISTINCT ON (attachment_id)` dedup (a duplicate-`id` under-count that predates + is orthogonal to
this size fix — a ledger-architecture item, out of scope). **Do NOT** re-trust the client kept `size`, move the
kept-size re-derivation into the shared media pipeline, or change the ledger/quota/attachment-schema/upload flow.

**RC3 — GDPR & Privacy Compliance hardening (authoritative, 2026-07-11 — compliance-hardening ONLY,
NO feature/behaviour change; every feature preserved):** a 10-dimension multi-agent source audit
(score 70/100 baseline → ~80 after this pass) drove a LOW-RISK, clearly-correct code+doc hardening set.
**Implemented (code):** **(1)** GDPR **export completeness** — `lib/gdpr/collect-user-data.ts` now also
exports `people`, `ai_usage`, `memory_intelligence`, `storage_ledger` (owner-scoped, additive,
schemaVersion 1.1; the operator-gated tables degrade to `[]` because supabase-js returns `{data:null}`
on a missing relation, never throws) — closes the Art 15/20 `people` omission. **(2)** **Sentry PII
scrubbing** — new `lib/observability/sentry-privacy.ts` (`sendDefaultPii:false` + a `beforeSend` that
strips request cookies/headers/body and redacts emails, **never dropping events**) wired into all three
`sentry.*.config.ts`. **(3)** **PII log minimisation** — new `logger.errorMessage()`; raw error
**objects** (a Postgres `.details` can echo row PII e.g. an invitee email) replaced with message-only
logs across `dashboard/actions.ts`, `active-profile`/`profile`/`timeline`/`build-relationships`/
`memory-chat` routes + `onboarding`; a client console log of the plan removed from `DashboardAccountStatus`;
AI-chat narration dev-gated (`logger.debug`). **(4)** **Transparency copy** — `app/privacy/page.tsx`
corrected (self-service deletion IS live — was "being finalized"; +Art 22 no-ADM/no-training line);
`app/cookies/page.tsx` per-cookie transparency list; `components/CreateProfileForm.tsx` a **non-blocking**
authority-attestation note (Art 6/14 at third-party collection). **Implemented (docs):** privacy-policy
§13 subprocessor table corrected (removed the GA/PostHog + Resend rows that are **NOT** in the code — no
analytics SDK exists; Supabase sends auth email; de-hedged Stripe/Sentry; OneSignal data expanded to
notification content); deletion policy discloses the processor-side erasure gaps; export report refreshed;
**six NEW `docs/compliance/13–18`** authored (ROPA, Subprocessor List, Data Retention, Incident Response,
Responsible Disclosure, DPIA — all DRAFT, grounded in the implementation, `[CONFIRM]` markers); plus
`docs/compliance/RC3-GDPR-AUDIT-REPORT.md`. Data-classification/retention/erasure-gap **comments** added
across the deletion/storage/media/cookie/AI-usage files + two migrations. Verified: tsc/lint/build green +
main-loop 5-lens self-review (GDPR/DPO/healthcare/Apple/Google — behaviour preserved, no blocking finding;
the multi-agent review workflow itself hit the subagent session limit and was completed inline).
**ROADMAP — intentionally NOT done in RC3 (behaviour/feature/legal; do NOT re-flag as a NEW defect):**
Stripe subscription-cancel + customer-delete AND OneSignal device-delete on account deletion (Art 17
processor-side — interim: policy tells users to cancel first); per-memory-delete + edit-removed-attachment
storage orphan removal + an orphan-sweep cron; `auth_pending` retry cron; `reminder_local_confirmations`
enrolment in the deletion RPC; `ai_usage` TTL/rollup; care-profile-name + own-DOB/country **rectification**
endpoint (Art 16); granular **AI opt-out** toggle (Art 21); export **media binaries/signed URLs** (Art 20);
live-legal-page↔`docs/compliance` reconciliation + **legal entity/DPO/jurisdiction** resolution + executed
**DPA** + OpenAI **ZDR** confirmation; `security.txt` (needs a one-line middleware allowlist); the
cognitive/Alzheimer-risk **insights** disclose-or-remove decision (also an App-Store risk). **Do NOT**
re-trust raw error objects in logs, remove the Sentry scrubbing, re-add analytics/Resend to the
subprocessor list, make the export non-owner-scoped, or gate care-profile submission on the authority note.

**RC4 — Production Launch Readiness hardening (authoritative, 2026-07-11 — production-hardening ONLY,
NO feature/behaviour change; reminder engine untouched):** an 8-dimension multi-agent audit (74/100 →
~85) drove a low-risk hardening set. **Implemented (code):** **(1)** closed a hot-path **PHI/PII log
leak** the RC3 pass missed — `lib/profile-access.ts` (runs on every navigation) logged `user.email` +
full care-recipient rows, and `lib/build-people.ts` logged extracted person names; both now use the
dev-gated `logger` with IDs/counts only + `errorMessage()`. **(2)** extended `lib/observability/
sentry-privacy.ts` `beforeSend` to redact emails across the **event message, captured exception values,
AND console breadcrumbs** (the SDK captures `console.*` as breadcrumbs, so a PHI log line would otherwise
ride to Sentry un-redacted) — still **never returns null**. **(3)** message-only'd residual
raw-`PostgrestError` logs (`memory-enrichment`, `memories/create` [`logPipelineError`], `gdpr/export`,
`register-device`, `send-notification`, `memories/route`). **(4)** added `export const maxDuration` to 8
long/AI routes (memory-chat 60, `remy/story` page 60, memories search/create 60, upload-url 30, gdpr
export/delete 60, build-relationships 60) so a slow OpenAI call (the existing 30s `AbortSignal` on
memory-chat, `OPENAI_TIMEOUT_MS`) reaches the route's **graceful** error/degrade instead of a raw
platform 504 (the platform default ~15s was killing the function before the abort could fire). **(5)**
gave the story provider call a 30s `AbortSignal.timeout` in `lib/remy/providers/openai-provider.ts`
(parity with every other OpenAI caller → `toProviderError` → the action's never-throws "unavailable"
degrade). **(6)** `memories/create` now removes the just-uploaded storage objects on a DB-insert failure
(mirrors the over-quota cleanup; `normalizedAttachments`, best-effort). **Implemented (config/store):**
`next.config.js` `poweredByHeader:false`; committed **`.env.example`** (allowlisted in `.gitignore`,
placeholders only); iOS `Info.plist` `ITSAppUsesNonExemptEncryption=false`; **new
`ios/App/App/PrivacyInfo.xcprivacy`** app privacy manifest (`NSPrivacyTracking=false`; data types =
email/name/photos-videos/other-user-content/user-id/device-id/crash/performance, all linked-not-tracking;
`NSPrivacyAccessedAPICategoryUserDefaults` CA92.1). **Docs:** `FINAL_LAUNCH_BLOCKERS.md` HB1 reconciled
with the master-state backup decision; `docs/RC4-PRODUCTION-READINESS-REPORT.md` added. Verified
tsc/lint/build green + main-loop 7-lens self-review (Senior Staff/SRE/DevOps/Perf/Security/Apple/Google —
behaviour preserved, 0 blocking; the multi-agent audit ran, the review was done inline to conserve the
subagent budget). **OPERATOR STEPS (native, like migrations/pbxproj — NOT done from code):** add
`PrivacyInfo.xcprivacy` to the **App target's Copy Bundle Resources** in Xcode (a file in the folder is
NOT bundled without target membership) + `pod install` + native rebuild; verify/extend the
required-reason-API list against Xcode's Privacy Report; confirm daily Supabase backups are enabled +
establish a **Storage-bucket (`memory-media`, PHI) backup strategy** + run a **test restore** (the one
HIGH residual — Postgres daily backups do NOT cover Storage objects). **ROADMAP (do NOT re-flag as a NEW
defect):** `select('*')` embedding-column trim on the memory feed/timeline/detail (medium-risk column
enumeration); Stripe per-event idempotency/ordering ledger; `auth_pending` retry cron; `pg_trgm` GIN
search index (operator/DBA); central env-var startup validation + `requestId`→Sentry correlation; offline
UI; **Android Play-readiness (deferred — no `google-services.json`/FCM, `allowBackup=true`, versionCode 1).**
**Recommendation: READY FOR APP STORE (with the operator steps); Google Play deferred.** **Do NOT**
re-trust raw error objects / log PHI (email/names/rows/device tokens), remove the Sentry
breadcrumb/exception scrubbing, drop the `maxDuration` budgets, or modify the frozen reminder engine.

**RC5 — App Store & Production Release Certification (authoritative, 2026-07-11 — final certification; NO
feature/behaviour change; reminder engine untouched):** an 8-lens multi-agent certification (Apple / Google
Play / QA / Senior Staff / SRE / Security / Accessibility / Privacy) + synthesis re-verified every RC2–RC4
hardening claim against code and found **0 NEW code-level release blockers** — **overall 94/100** (Security
96, Reliability 97, Performance 95, Privacy 95, Store 97, A11y 83). **Verdict: ✅ CERTIFIED FOR APP STORE
SUBMISSION + ✅ CERTIFIED FOR PRODUCTION RELEASE (iOS + web); Google Play deferred** (decided — `versionCode 1`,
no signing/`google-services.json`/FCM, so it cannot be accidentally shipped and is a post-iOS operator
workstream). **Two NEW low-risk findings were fixed in the RC5 commit (additive, behaviour-preserving):**
**(1)** the `(auth)` login/signup/forgot-password/reset-password inputs were placeholder-only → added
`aria-label`s (WCAG 1.3.1/3.3.2/4.1.2; the `(app)/*` UI was already AA-solid). **(2)** `lib/ai-memory.ts`
`logAIStage`/`logAIError` now route through the dev-gated `logger` (matching the RC4 standard); the
JSON-parse error logs its **name only** (a `SyntaxError` message can embed a snippet of the model's
health-derived output) and the AI-request error uses `errorMessage()`. Verified tsc/lint/build green.
**Confirmed-in-code (do NOT re-open):** Apple 3.1.1/3.1.3 native purchase-UI gating is comprehensive
(`lib/platform.ts` on every checkout/portal/upgrade CTA — UpgradeButton/UpgradeModal/Storage*Modal/
BillingSection/PricingActions/RemyStoryConversation), self-service in-app deletion (5.1.1(v)), caregiver
sharing is private invite-only (no public UGC), `PrivacyInfo.xcprivacy` + usage strings + encryption
exemption valid, no PHI in logs, no client secrets, no universal-links/Restore-Purchases needed
(remote-URL WebView + web-only subscription). **Remaining = OPERATOR/infra ONLY** (Xcode manifest target
wiring + native rebuild; confirm daily backups + a Storage-bucket backup + a test restore; prod env +
probe-gated migrations) **+ the documented roadmap** — none a code defect. **Do NOT** re-flag any certified
item, re-open the frozen reminder engine, or treat the operator/roadmap deferrals as new blockers. See
`docs/RC5-RELEASE-CERTIFICATION.md`.

**STILL POST-LAUNCH — DEFERRED, do NOT implement now (authoritative, 2026-06-28 — narrows the
blanket 2026-06-23 deferral to EXCLUDE the foundation above):** the Remy companion's
**CONTENT + behavior** — **real Rive/Lottie animations + final artwork, emotional reactions +
state transitions, live companion behavior, conversation UI, and AI connection** — plus
**Voice-recording memories, voice transcription, AI memory summaries, Semantic Search V2,
advanced AI memory intelligence**, and **audio / document / PDF uploads**. None of these are
started pre-launch. **Current priorities remain launch-only (1) Storage Subscription System →
(2) Media Expansion → (3) Productization → (4) Launch Readiness.**
**Reminders + push are production-stable and FROZEN** (reaffirmed): do not modify
reminder scheduling, push-notification delivery, OneSignal integration, iOS
notification permissions, or the notification infrastructure.
**Storage model (authoritative):** enforcement is by **TOTAL STORAGE USED PER USER**
(the purchased capacity), **NOT by individual file size**. The user *purchases storage
capacity*. At the limit: uploads are **blocked** → the usage UI reflects **full**
capacity → the **storage-upgrade modal** appears → the user is **directed to storage
plans**. **All future media types (audio/voice/documents/PDF) MUST reuse the same
byte-based storage-accounting architecture** (`storage_ledger` + `enforceUploadQuota`).
**Single source of truth (authoritative, 2026-06-23):** `subscription_plan →
BILLING_PLANS → storageGB → storage quota`. Storage is **bundled with subscription
tiers** (NOT standalone add-ons; do not create storage-only Stripe products). Launch
tiers: **FREE 1 GB · PREMIUM 25 GB · FAMILY 100 GB** (enterprise later). The limit comes
from `lib/billing/plans.ts` `storageGB`; `getStorageUsage` resolves the user's plan via
`resolveSubscription(profile)`. The **per-file 25 MB cap is REMOVED** — any supported
media size uploads as long as `used < plan_limit`; the only bounds are the Supabase
object size limit + the total quota. Do not reintroduce a per-file size gate.

## Mandatory documentation maintenance (Definition of Done)
A task is **not complete** until, in the **same commit**:
- `docs/handoffs/HANDOFF_CURRENT.md` is updated;
- the relevant `docs/features/*` is updated **if** architecture/behavior changed;
- `docs/roadmap/launch-roadmap.md` is updated **if** priorities changed.

**Documentation Maintenance Rule.** Any completed implementation that changes
**architecture · navigation · authentication · billing · database schema · AI
behavior · memory architecture · mobile behavior · deployment workflow ·
integrations · user-facing workflows** MUST, in the **same commit**, update **both**:
1. `docs/handoffs/HANDOFF_CURRENT.md`; **and**
2. **`CLAUDE.md`** — whenever the change establishes, retires, or supersedes an
   architectural decision or standard. Record it as **authoritative** (with a date)
   so future sessions don't re-investigate, re-litigate, or reintroduce it.

### HANDOFF_CURRENT.md must always contain
Current status · Completed work · Open issues · Active branch · Next priorities ·
Blockers · Recent commits.

## Completion protocol (end every EXECUTION task with)
1. Summary
2. Files Changed
3. Documentation Updated
4. Tests Run
5. Build Status
6. Commit Hash
7. Next Recommended Action
