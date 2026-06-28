# RemyNest — Claude Workflow (authoritative)

The **single source of workflow truth**. `/docs` is the source of **content truth**.
Do not create parallel workflow/instruction files — enhance this one.

## Start every session (mandatory) — Session Continuity Rule
1. **Read `docs/handoffs/HANDOFF_CURRENT.md` FIRST**, then the **relevant sections of
   this `CLAUDE.md`** second. **Continue from the documented project state.**
2. Read **only the docs relevant to the task** (map below). Trust docs over rediscovery.
3. **Do not scan unrelated files** or run repository-wide analysis unless the task
   explicitly requires an audit. Identify the smallest set of files first.
4. **Do not repeat investigations already documented** (HANDOFF / this file), and
   **do not reintroduce retired features or re-litigate already-approved decisions**
   (e.g. the Workspace-navigation note below — the My Nest drawer row is retired).
5. **Treat documented architectural decisions as source-of-truth** — follow them
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
