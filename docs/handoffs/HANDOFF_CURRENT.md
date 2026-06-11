# Handoff — Current

> Update every session (it's part of Definition of Done — see CLAUDE.md). Keep
> short and truthful. Sections below are the mandated HANDOFF standard.

**Last updated:** 2026-06-11

## Current status
Web app **live in production** (Vercel → `www.remynest.com`). **Delete Account
shipped and validated** end-to-end. Single authoritative workflow established in
`CLAUDE.md` (Investigation/Execution modes). **Dashboard V3** shipped (reminder-driven
command center). **Reminder Lifecycle Sprint 1** is paused pending operator migration
(`20260609120000_reminder_lifecycle_foundation.sql` committed, NOT applied).

## Completed work
- **Remy Activity Feed V1** (read-only; no schema/migrations/cron/notifications):
  Remy's **evidence layer** — "what Remy noticed", not a notification center or raw
  audit log. New `lib/remy/activities.ts` is deliberately separate from observation
  generation (Signals→Observations *and* Signals→Activities, both off existing
  dashboard data): pure `buildRemyActivities(sources, limit)` + best-effort
  `fetchRemyActivitySources`. New `RemyActivity`/`RemyActivityKind` types. Activity
  kinds (existing data only): **Historical memory preserved** (memory_date set →
  shows the memory date label), **Memory added** (non-historical → memory title),
  **Reminder completed** (reuses the dashboard's `focusReminders` + `completed_at`),
  **New theme discovered** (`memory_clusters`, user-scoped). Every item is
  human-readable (icon + plain title + detail + relative time); no internal system
  language. **Memory updated is intentionally skipped** — no reliable update signal
  on `memories` (no maintained `updated_at`); deferred per spec. New client
  `components/remy/RemyActivityFeed.tsx` renders 5–10 newest-first under the Remy
  Companion ("Remy Activity · Recent things I've noticed"). Built for reuse by future
  notifications / digests / push / family updates. Clusters are user-scoped (same
  limitation as the intelligence count). Gracefully degrades to an empty state.
- **Remy Dashboard Intelligence** (read-only; no schema/migrations): the dashboard
  Remy card is now an intelligence summary engine, not a placeholder counter.
  Added an optional `intelligence` block to `RemySignals` (`RemyIntelligence`),
  computed best-effort in `buildRemySignals` from existing stored data, scoped like
  the dashboard (active care profile / My Nest): historical memories preserved
  (total + this-week + shared decade/era), top + most-recent memory category/theme,
  earliest `memory_date` year (timeline reach), and user-scoped `memory_clusters`
  count. `generateRemyObservations` gained priority-ranked rules that surface real
  summaries — e.g. "Mary's memory archive grew this week — 3 memories from the 1980s
  were preserved.", "I've found 12 memories connected to Family.", "Most recently
  preserved memories relate to Childhood.", "I've grouped your memories into 5
  themes.", "Your timeline now reaches back to 1962." The plain "N new memories this
  week" placeholder is replaced (historical preservation leads; plain weekly count is
  the fallback). All deterministic (no LLM/hallucination), gracefully degrading on
  sparse data; `intelligence` is optional so Insights' `deriveRemySignals` is
  unaffected. Dashboard stays fast (best-effort reads in parallel; one ~250-row
  sample drives the category/era signals). `memory_relationships` left untouched
  (per-profile counting needs a join — too heavy for a fast dashboard).
- **Insights V2 — Remy Insights Center** (read-only; no schema/queries added; all
  existing telemetry preserved): reframes Insights from a statistics dashboard into
  a companion experience. Reuses the existing user-scoped memory/reminder telemetry
  (`fetchInsightsTelemetry`) plus Remy Signals + Observations — added a pure
  in-memory `deriveRemySignals(memories, opts)` to `lib/remy/signals.ts` so Insights
  feeds the SAME observation engine as the dashboard (zero extra queries). New
  `lib/remy/insights.ts` (`buildRemyInsights`) produces the sections: **Remy
  Summary** (reuses `generateRemyObservations` + `RemyCompanion`), **Memory Health**,
  **Routine Health** (follow-through), **Family Engagement** (category breadth /
  family-moment proxy — forward-compatible with caregiver data), **Trends**
  (week-over-week + mood direction), **Achievements** (unlock badges), **Gentle
  Recommendations** (reuses gentle/actionable observations + insight-specific
  nudges). New `components/insights/RemyInsightsCenter.tsx` renders them above the
  charts. `InsightsClient` computes the model in-memory, leads with the center, and
  **keeps every existing chart** under a "Detailed analytics" heading. No
  cron/lifecycle/billing/auth changes.
- **Historical Memory Creation** (additive; existing memories unchanged;
  migration LIVE in production): memories can be dated to any past moment. A
  memory carries `created_at` (insertion, unchanged) plus optional `memory_date`
  + `memory_date_precision` (`day`/`month`/`year`/`decade`); the **effective date
  = memory_date ?? created_at** drives the timeline + memories list, so rows
  without a memory_date behave exactly as before. Shared model
  `lib/memories/memory-date.ts` (`buildMemoryDate`, precision-aware
  `formatMemoryDate`/group label, `validateAndResolveMemoryDate` guard,
  `selectionFromMemoryDate` for edit prefill).
  - **Full UX coverage (2nd pass)**: new shared `components/memories/MemoryDateField.tsx`
    (Today/Yesterday/Custom/Month/Year/Decade) wired into BOTH **CreateMemoryModal**
    (memories page) and **EditMemoryModal** — the modal posts multipart, so
    `create/route.ts` now reads `memoryDate`/`memoryDatePrecision` in its FormData
    branch too. Edit persists via `PUT /api/memories/[id]` (validated; only touched
    when the field is sent). `CreateMemoryForm` (dashboard) retains its own inline
    control (JSON path).
  - **Date hierarchy (3rd pass — presentation only)**: Memory Date is now the
    PRIMARY date everywhere; created_at is secondary "Added" metadata. Two canonical
    formatters in `lib/memories/memory-date.ts`: `formatMemoryDateLabel` (always the
    actual event date, NEVER relative — day "July 4, 1980", month "May 1980", year
    "1980", decade "1980s") and `formatAddedDate` ("June 11, 2026"). Applied to
    **MemoryCard** (+ memories-page search results), **memory detail page**,
    **TimelineCard**, and **RelatedMemories** preview: each shows "🕰 Memory Date: …"
    prominently and "Added to RemyNest on …" subtly. No relative labels
    (Today/Yesterday) anywhere. Standalone `/search` page is unchanged — it uses the
    `match_memories` RPC whose projection lacks date columns (surfacing them would
    require an RPC/schema change). No schema/grouping/effective-date logic changed.
- **Remy Companion Foundation** (read-only; no schema/migration/cron/lifecycle/
  billing/auth changes): the AI companion layer (NOT a chatbot) that turns
  existing data into calm, supportive observations. Engine + presence are
  decoupled so the future avatar plugs into the same system. `lib/remy/`:
  `types.ts` (`RemyObservation`/`RemySignals`, with `mood` as the avatar seam),
  `persona.ts` (`REMY`, tone→mood map, `remyVoice()` for human grammar —
  "Mary has" vs "You have"), `observations.ts` (`generateRemyObservations` —
  pure, priority-ranked rules over reminders + memory activity/trend/staleness +
  invites + onboarding + calm-presence fallback), `signals.ts`
  (`buildRemySignals` — read-only `memories` counts scoped like the dashboard,
  best-effort → 0 on failure, never throws). `components/remy/`:
  `RemyAvatar.tsx` (mood-aware mark + **the documented avatar plug-in point** —
  future animated avatar swaps internals behind the same `{mood,size}` props),
  `RemyCompanion.tsx` (reusable client presence usable on any surface). Dashboard
  renders a Remy section below the header; the old "Remy Insight Preview" teaser
  in DashboardFocus was superseded and removed. No LLM call — deterministic and
  production-safe.
- **Dashboard V3 — command center** (build-safe; no lifecycle/cron/notification
  changes): replaced the admin "Today's Focus" metric list with a reminder-driven
  focus surface — **Right Now · Upcoming Today · Routine Progress · Reminder Summary ·
  Remy Insight Preview** — rendered in the user's local timezone. New shared Focus
  model `lib/reminders/focus.ts` (`deriveDashboardFocus`) is the single source both
  the Dashboard (now) and the future status-based Focus engine / Reminder Center
  consume; forward-compatible with the lifecycle `status` column (falls back to
  `completed`). New client widget `components/.../DashboardFocus.tsx`. Dashboard
  fetches reminders read-only (existing columns only) scoped to the active care
  profile; My Nest shows a gentle "enter a care profile" state. Administrative
  context (Care Snapshot, Memory Insights, invites, account status) moved under a
  separate **Account & Workspace** section.
- **Launch hardening** (merged to `main`): Playwright security automation, AI
  disclaimers, premium 402, GDPR export, legal pages, CRON_SECRET, `/api/health`,
  error-message sanitisation, Sentry wiring + error boundaries.
- **Core product**: memory CRUD + AI enrichment/embeddings, reminders, semantic
  search, memory chat, insights, caregiver sharing, Stripe subscriptions, GDPR export.
- **Settings v1** (`/settings`): account info, export, privacy links, Delete Account.
- **Delete Account — DONE**: migration applied; tombstone provisioned
  (`TOMBSTONE_USER_ID` set local + Vercel); A–F scenarios **validated PASS** against
  the live DB (own-only, transfer, retain/delete contributed, storage, auth
  recovery). `memories.user_id → auth.users` (CASCADE, NOT NULL) confirmed.
- **Care-profile paywall**: plan-limit no longer crashes — server returns a
  structured result; client opens the upgrade modal (Premium/Family) instead of a
  Server Components error.
- **Caregiver collaboration gated (FAMILY-tier)**: `inviteCaregiver()` now
  enforces the entitlement server-side via `checkPremium()` +
  `getUsageLimits(plan).caregiverCollaborationEnabled` (single source of truth =
  `BILLING_PLANS`). FREE/PREMIUM → structured `{ code: "UPGRADE_REQUIRED", plan }`
  (never throws, mirrors `createProfile`); FAMILY/ENTERPRISE → proceeds.
  `InviteCaregiverForm` opens `UpgradeModal` on `UPGRADE_REQUIRED`. `UpgradeModal`
  gained an optional `requiredFeature` filter so a Family-only feature never
  offers PREMIUM (still BILLING_PLANS-derived — no duplicate logic). `inviteCaregiver`
  is the sole invite-creation path (accept/decline only update existing invites;
  `acceptInvite` requires a pre-existing pending invite), so no bypass route.
- **Account identity single source of truth**: `lib/account-identity.ts`
  (`resolveAccountIdentity`) now feeds both `/settings` and the app-layout navbar;
  removed hardcoded placeholder identity from `AppNavbar`/`UserProfileDropdown`.
  Settings and navbar always show the same account/plan.
- **Workspace context visibility**: persistent color-coded `WorkspaceIndicator`
  in the navbar + Care-mode `WorkspaceBanner` (active profile + "Switch to My
  Nest"), resolved in `(app)/layout.tsx` from the existing active-context cookie.
  Workspace switches now `revalidatePath("/", "layout")` so all routes reflect
  the change immediately. No new workspace system introduced.
- **FAMILY drift fixed (webhook)**: `customer.subscription.updated` no longer
  hardcodes `subscription_plan: "PREMIUM"`. Added `planFromPriceId(priceId)`
  (reverse lookup over `BILLING_PLANS`) and the webhook now derives the plan from
  the Stripe price → FAMILY stays FAMILY across renewals/updates. Unknown price →
  preserve existing plan + `console.warn`; inactive → FREE. checkout (metadata
  plan) and deleted (FREE) paths unchanged; `subscription.created` writes no plan
  (can't downgrade). Verified PREMIUM→PREMIUM, FAMILY→FAMILY.
- **Contact page** (`/contact`, public): General Contact + Enterprise Solutions +
  Investors & Partnerships sections. All emails sourced from `lib/contact.ts`
  (`CONTACT.general`/`enterprise`/`investors` → `contact@`/`enterprise@`/
  `investors@remynest.com` — placeholders, update before launch). Linked from the
  landing footer. No billing/checkout/subscription/Stripe/DB changes.
- **Identity stale-cache fix**: Settings/Navbar showed "Free Member" for a premium
  account because the identity read was served from Next's cache (pre-upgrade row),
  while billing/dashboard bypass caching. Added `noStore()` to
  `resolveAccountIdentity` and `force-dynamic` to `(app)/layout.tsx` so identity is
  always fresh per user.
- **Subscription resolution unified**: `lib/billing/resolve-subscription.ts` is
  the single authoritative resolver (premium if `is_premium` OR status
  active/trialing OR plan PREMIUM/FAMILY) used by `checkPremium`,
  `resolveAccountIdentity`, `/api/billing/status`, and the dashboard. Removed all
  inline plan logic; logs a warning on contradictory rows. Fixes `checkPremium`
  previously mis-gating premium users whose `subscription_plan` was stale `FREE`.
- **Workspace switching repaired** (was architecturally broken): added
  `EnterCareProfileList` (My Nest → Care entry that calls `setActiveProfile` →
  writes `remynest-active-context`); fixed `ProfileSwitcher` guard to use the real
  `activeProfileId` (selecting a profile from PERSONAL now switches); unified the
  account menu to call `setPersonalWorkspace` (removed the divergent `?context=`
  URL system). Single source of truth = the cookie.
- **Stripe Customer Portal shipped**: new `app/api/stripe/portal/route.ts`
  (auth → RLS-scoped read of `profiles.stripe_customer_id` →
  `stripe.billingPortal.sessions.create({ customer, return_url })` → returns
  hosted URL). `BillingSection` "Manage Subscription" now opens the portal
  (`/api/stripe/portal`) instead of routing through checkout. Gated by the
  existing `customerPortalEnabled` flag (= profile has `stripe_customer_id`).
  Verified: real customer → valid `billing.stripe.com` session URL (portal is
  configured/active in Stripe). No checkout/webhook/resolver/pricing changes.
- **Reminder push delivery wired (Phase 1)**: `OneSignalInit` was never mounted
  and the OneSignal Web SDK was never loaded → `device_registrations` stayed empty
  → cron could never deliver. Fix: `OneSignalInit` now loads the v16 page SDK
  (`OneSignalSDK.page.js`, matches the existing `/public` v16 service workers) and
  is mounted in `(app)/layout.tsx` (self-guards on an authenticated user).
  Verified end-to-end (minted session → `POST /api/register-device` → row created:
  `user_id` matches, `player_id` saved; duplicate registration prevented via
  upsert; unauth bounced by middleware). Cron/sender logic unchanged.
- **Reminder timezone correction (Phase 2)**: reminder times were stored by
  reinterpreting the naive `datetime-local` value on the UTC server → wrong fire
  time for non-UTC users. New `ReminderDateTimeField` converts local→UTC in the
  browser (DST-aware) and submits a hidden `remind_at_utc`; the create server
  action prefers it (idempotent passthrough), falling back to the raw value for
  no-JS. No schema change; existing reminder rows untouched. Verified: NY summer
  14:00→18:00Z, NY winter 14:00→19:00Z (DST), Manila 14:00→06:00Z.
- **Design-system / UI modernization (visual only)**: established a unified brand
  language — Tailwind tokens (`sage`/`sand`/`gold`/`moss`/`charcoal`, `shadow-soft`,
  `rounded-4xl`), Fraunces serif headings + Inter body wired via `--font-serif`/
  `--font-sans` in the root layout, brand-aligned `globals.css` tokens + softened
  `.card` + reusable `@layer` primitives (`.rn-card`/`.rn-eyebrow`/`.rn-btn`).
  Adopted on the highest-leverage surfaces: AppNavbar (sticky, soft, sage avatar),
  NavLinks (active states), DashboardHeader/Stats/AccountStatus, MemoryCard,
  Reminders page, BillingSection — replacing clinical blue/indigo/emerald/gray with
  warm sage/sand/gold. No logic/schema/API/billing/reminder-functionality changes.
- **Post-UI-pass regression fixes**:
  - *Insights ChunkLoadError / `GET /_next/undefined 404`*: root cause was **stale
    build artifacts** — the UI pass changed `tailwind.config.js`/`layout.tsx`(fonts)/
    `globals.css` with only incremental builds, desyncing the webpack chunk manifest.
    No source bug (InsightsClient dynamic imports are all correct). Fixed by a clean
    rebuild (`rm -rf .next && npm run build`). Verified: `/insights` → 200, 17 chunks
    all resolve (0 broken), no `/_next/undefined`. Browsers with a stale client/SW
    need a hard refresh; production self-resolves on next deploy.
  - *Profile panel scrolling*: `UserProfileDropdown` had no height bound, so the
    long `ProfileHub` scrolled the whole page. Added `max-h-[calc(100vh-5rem)]
    overflow-y-auto overscroll-contain` (isolated scroll, no chaining) and made the
    close button `sticky`. Visual-only; no redesign.
- **Profile dropdown: removed duplicate Billing nav item**: deleted the "Billing"
  entry from `PROFILE_MENU_ITEMS` (`components/profile/config/profile-menu.config.ts`)
  — it pointed at `/dashboard` (duplicate nav that redirected users to the
  dashboard). Dropdown "Account" menu is now Switch to My Nest / Settings / Logout.
  No handlers/imports/state were billing-only, so nothing else to remove.
  Subscription controls are UNCHANGED — they live in `BillingSection`, rendered as
  the **"Billing" section of the profile dropdown panel** (`PROFILE_SECTIONS`), not
  the removed link. ⚠️ Note: the standalone `/settings` route does NOT render
  `BillingSection` (only Account Info / Export / Privacy / Delete) — subscription
  management is reached via the profile dropdown's Billing section. Slot reserved
  for a future Vault entry (not implemented).
- **My Nest semantic search FIXED + care-leak closed**: `/api/memories/search`
  previously filtered via `match_memories(workspace_type_input)`. Verified RCA:
  personal memories are stored `workspace_type='care'` (creation never sets it),
  the RPC can't scope to a profile and doesn't return `memory_profile_id`, so
  `'my-nest'` → 0 results, and `'care'` returned ALL the user's memories
  (personal + every care profile = cross-workspace leak). Fix (app-layer, no DB
  change): use `match_memories` purely for vector RANKING (over-fetch 100, no
  workspace param), then SCOPE by `memory_profile_id` server-side via
  `resolveActiveProfileId()` — the SAME authoritative discriminator the memories
  list path uses (NULL = My Nest; profile id = that care profile). The route now
  ignores client-supplied workspace/profile (resolves from the cookie). Verified
  on prod data: My Nest 2 results (was 0), Care 20 results scoped to the active
  profile, My Nest∩Care overlap = 0. `workspace_type` is now **deprecated/unused
  by search** (kept for backward compat; no data migration required since
  `memory_profile_id` was already correct).
- **Production SEO shipped**: central `lib/seo.ts` (SITE_URL, brand strings,
  `pageMetadata` helper). Root `app/layout.tsx` now sets `metadataBase`, default
  title + `%s — RemyNest` template, description, `robots: index/follow`, default
  Open Graph + Twitter (with image), icons. Added `app/robots.ts` (allow
  marketing, disallow `/dashboard /memories /timeline /reminders /insights
  /memory-chat /settings /onboarding /api/ /auth/ /callback`, sitemap ref) and
  `app/sitemap.ts` (6 public routes). Homepage (`app/page.tsx`) gets metadata +
  JSON-LD (`Organization` + `SoftwareApplication`) via `components/seo/JsonLd`.
  Marketing/legal pages (privacy, terms, cookies, contact, account-deletion) now
  carry per-page canonical + description + OG/Twitter via `pageMetadata`. Verified
  on the prod build: correct titles (single suffix), distinct canonicals,
  og:image on every page, robots.txt/sitemap.xml return 200. No FAQPage (no FAQ
  content). Authenticated routes kept out of the index via robots Disallow (no
  `(app)` files modified). FOLLOW-UP: og image is `/logo.png` (not a 1200×630
  card) and `/public` icons are ~2.27 MB each — optimize before heavy promotion.
- **Plan price labels unified (display-only)**: Dashboard Account Status omitted
  the Family price ("Family" with no "€19.99/mo") because `UpgradeButton`
  hardcoded its labels and forgot Family. Added a single source of truth
  `PLAN_PRICE_LABELS` + `getPlanPriceLabel()` in `lib/billing/plans.ts`
  (PREMIUM=€9.99/mo, FAMILY=€19.99/mo) and refactored all three consumers —
  `UpgradeButton` (dashboard), `UpgradeModal` (billing modal), `BillingSection`
  — to use it. No hardcoded prices remain in those components. Display-only;
  checkout still resolves real prices from Stripe price ids via `getPriceId()`.
  Verified: Account Status now shows "Premium (€9.99/mo)" / "Family (€19.99/mo)".
- **Two billing/profile UX fixes**:
  - *Outside-click closes the profile drawer*: `AppNavbar` now attaches a
    `pointerdown` listener (mouse + touch; desktop/iOS/Android) while the dropdown
    is open, closing it when the event target is outside a `menuRef` wrapping the
    toggle button + drawer. Listener is attached only while open and removed on
    close/unmount (no leaks); the X button still works; inside clicks don't close.
  - *Billing CTA matches current plan*: `BillingSection` now derives the CTA from
    `currentPlan` (from `useBillingStatus`) + `selectedPlan` (no new flags). The
    current tier shows "✓ Current Plan" (disabled), downgrades are hidden, and the
    upgrade CTA only renders for strictly-higher tiers using `effectiveSelectedPlan`.
    Verified matrix: FREE→Upgrade to PREMIUM/FAMILY; PREMIUM→Upgrade to FAMILY only
    (never "Upgrade to PREMIUM"); FAMILY→no upgrade CTA (Manage Subscription). No
    Stripe/checkout/subscription/pricing logic changed (checkout still posts to
    `/api/stripe/checkout`).
- **Password reset flow shipped** (Supabase Auth): new public `/forgot-password`
  (`resetPasswordForEmail` → redirectTo `/reset-password`, anti-enumeration generic
  success) and `/reset-password` (establishes the recovery session via PKCE
  `?code` `exchangeCodeForSession` OR the hash `PASSWORD_RECOVERY` event, then
  `updateUser({ password })` → redirect to `/memories`). Both routes added to
  middleware `PUBLIC_ROUTES`; both `noindex`. Login page links to it. Login/
  registration logic untouched; shared `/callback` route untouched. Pages are
  brand-styled + mobile-friendly (email/new-password autocomplete). Build verified;
  routes return 200 unauthenticated. ⚠️ OPERATOR: add the reset redirect URL(s)
  (`https://www.remynest.com/reset-password` + localhost) to Supabase Auth
  "Redirect URLs", and confirm the recovery email template, before relying on it.
- **Media privacy migration (private bucket + signed URLs)** — *launch blocker*:
  audit proved `memory-media` was PUBLIC (anonymous GET → 200 on real photos).
  New `lib/memory-media-signing.ts` mints short-lived (1h) **signed URLs**
  server-side via the service-role client (rows already authorized by RLS),
  batched (`createSignedUrls`), backward-compatible (derives the storage path
  from `storagePath` OR a legacy public URL → **no data migration**). Applied at
  every emit/render surface: `/api/memories` (list), `/api/memories/search`,
  `/api/memories/create` (response), `/api/timeline`, `timeline/page.tsx`,
  `memories/[id]/page.tsx`. Write side now stores **paths only** (upload +
  `normalizeAttachments` strip any public/signed URL → no token ever persisted).
  Validated: private bucket → public URL 400, signed URL 200; restored to public.
  ⚠️ **OPERATOR (final go-live step, AFTER this code deploys):** set bucket
  `memory-media` `public=false`. Signed URLs work whether the bucket is public or
  private, so deploy-then-flip has zero broken-image window. Rollback = flip back
  to `public=true` (signed URLs still resolve) and/or revert the commit.
- **Media privacy migration validated (zero regressions) + 2 fixes**: full
  validation of the signed-URL migration. Phase 1 PASS — `/api/memories` (My Nest
  + Care), `/api/memories/search`, `/api/timeline`, and the memory-detail page all
  serve `/object/sign/` URLs (0 public; signed GET → 200; dashboard renders no
  media). Validation found and fixed TWO regressions introduced by storing paths:
  (1) edit (`resolveCoverImageUrl`) persisted a SIGNED `cover_image_url` → now
  strips to a storage PATH; (2) retain-mode GDPR delete (`snapshotRetainedMediaPaths`)
  parsed only public URLs → would wrongly delete transferred media → now resolves
  paths from `storagePath`/bare path/public/signed. Re-validated: create + edit
  persist PATH only (no signed/public URL ever stored). Phase 3 export represents
  media via `storagePath`. Phase 4: per-memory delete removes the row only —
  **storage file is RETAINED** (orphaned); account-deletion cleanup removes files
  under `users/{id}/` (legacy bucket-root `<uid>/<file>` objects are a PRE-EXISTING
  gap). Phase 5: no `getPublicUrl` remains anywhere. **Safe to flip bucket private
  after deploy.**
- **Reminder IDOR write FIXED** (security): `POST /api/create-reminder` had no
  auth, used the **service-role client** (bypassing RLS), and took `user_id` +
  `memory_profile_id` from the **request body** → any authenticated user could
  inject a reminder into another user's account (push-notification injection).
  **Exploit proven** (User A created a reminder owned by User B → 200) then fixed:
  the route now authenticates via the session, derives `user_id` from the session
  (never the body), verifies care-profile access against the DB
  (`lib/profile-ownership.ts` — owner OR caregiver, same model as
  `getAccessibleProfiles`) returning **403** on a foreign profile, and inserts
  with the RLS-scoped client. The reminders-page `createReminder` server action
  got the same `userCanAccessProfile` check (the active-context cookie is
  client-settable). Re-validated: foreign create → 403 (0 planted), authorized
  My Nest + own-care create → 200. Reminder edit/delete have no API endpoint
  (RLS-scoped server actions).
- **Dead AI reminder-parser endpoint removed**: deleted the unused, broken
  natural-language reminder route (no callers; service-role + random `user_id`;
  inserted a non-existent `message` column → always 500, so it could not even
  write; localhost notify fallback). Audit confirmed it was unreachable
  unauthenticated and not IDOR-targetable; only residual was authenticated
  OpenAI cost-abuse. Scrubbed all doc references. Reminder creation remains via
  `/api/create-reminder` (session-auth + ownership) and the reminders-page server
  action. If NL reminders return in V2, rebuild securely.
- **Caregiver authorization P0 (two-part)**: audit proved any authenticated user
  could directly INSERT `profile_relationships` / `caregiver_invites` rows for ANY
  profile (write-IDOR; confidentiality was contained by ownership-based RLS on
  memories/memory_profiles, but integrity + the `userCanAccessProfile` gate were
  undermined). Plus logic gaps: `inviteCaregiver` didn't verify profile ownership,
  `acceptInvite` didn't verify the invitee email. Fixes:
  - **App layer (shipped + validated):** added `userOwnsProfile()`; `inviteCaregiver`
    now requires the caller OWNS the target profile; `acceptInvite` now requires
    `invite.email === user.email` AND `status==="pending"`. Validated: A→B.profile
    invite rejected; A accepting a foreign invite rejected; owner/own-invite allowed.
  - **DB layer (OPERATOR MUST APPLY — the actual direct-IDOR fix):** new migration
    `supabase/migrations/20260608180000_caregiver_authz_rls.sql` adds least-privilege
    INSERT/UPDATE/DELETE RLS on both tables (owner-only invite/manage; invitee-only
    accept; no self-grant). ⚠️ **Until applied, the direct PostgREST IDOR is STILL
    OPEN** (verified: A's direct insert still succeeds). Cannot apply from repo (no
    DDL access) — run in Supabase SQL editor, then re-run the direct-insert probe to
    confirm BLOCKED. SELECT policies intentionally unchanged (reads already scoped).
- **OneSignal/notification hardening**: audit found (HIGH) `/api/send-reminder` —
  any authenticated user could push **attacker-controlled content to any
  `external_user_id`** with zero authorization; and (MEDIUM) `/api/register-device`
  would **reassign a `player_id` already owned by another user** (service-role
  upsert onConflict player_id → device-notification hijack). Fixes:
  - **P1:** removed `/api/send-reminder` (only caller was the `test-notification`
    demo page, also removed) + scrubbed docs. Verified: `POST /api/send-reminder`
    → 404.
  - **P2:** `register-device` now rejects (409) a `player_id` already registered to
    a different account; same-user re-registration unaffected. Verified: A reusing
    B's player_id → 409 (B's device intact); A new device → 200; A re-register same
    device → 200 (1 row).
  - Device-registration confidentiality already solid (RLS: A can't read/insert/
    update/delete device rows). Cron senders remain `CRON_SECRET`-gated.
  Follow-up (not done): remove broken `save-onesignal`/`save-subscription`; scrub
  `player_id` from logs.
- **Reminder Center V2 — Phase 1 shipped** (UX overhaul, current schema, no DDL):
  new client `components/reminders/ReminderCenter.tsx` restructures the flat list
  into a calm, hierarchical center — **Today's Focus (hero: next/overdue/today)**,
  **Upcoming (Tomorrow/This Week/Later)**, **Daily Routines (recurring)**,
  **Caregiver context**, **Completed history**, plus forward-compatible
  **Priority/Pinned** sections that light up once Phase-2 columns exist. **Timezone
  fixed:** times now render **client-side in the user's local tz** (no more
  server-side UTC `en-IE`). Lifecycle chips read `sent`/`completed`
  ("Awaiting confirmation" appears once the Phase-2 cron sets `sent`). Create form
  is now a collapsible "Add a reminder"; all server actions preserved. Verified:
  `/reminders` → 200, all sections render, old UTC formatting gone.
  - **Phase 2 (operator + code, NOT applied):** migration
    `supabase/migrations/20260608210000_reminder_center_v2.sql` adds `priority`,
    `pinned`, `notified_at`, `completed_at`, `skipped` (+ indexes, idempotent).
    Pairs with code (per the migration's footer): cron sets `sent`/`notified_at`
    instead of auto-completing (decouples delivery from completion — fixes the
    "Sent = Completed" problem); new skip/priority/pin actions; AI-insight hooks
    via the timestamps. Deferred because DDL is operator-only and `main`
    auto-deploys (code referencing new columns must land AFTER the migration).
- **Reminder Lifecycle Foundation — Sprint 1 Phase 1** (foundation only; no cron/
  notification/UI/dashboard behavior change): new `lib/reminders/lifecycle.ts`
  (`REMINDER_STATUS` constants + best-effort `logReminderEvent` via service role)
  and migration `supabase/migrations/20260609120000_reminder_lifecycle_foundation.sql`
  (adds `status` + `missed_at/snoozed_until/snooze_count/completed_by/skipped_by/
  actor_role`, the append-only **`reminder_events`** audit table + RLS (read =
  owner/caregiver; writes service-role only), `completed→'completed'` backfill).
  Wired best-effort event logging + a best-effort `status`/`completed_at`/
  `completed_by` mirror into create / complete / delete — writes that **never block
  the primary action**. Verified: build/typecheck pass; create/complete/delete all
  still succeed; lifecycle writes no-op gracefully (`PGRST205`/`PGRST204`) while the
  migration is unapplied. ⚠️ OPERATOR: the migration is **NOT applied yet** (verified:
  `reminders.status` 42703 / `reminder_events` PGRST205). Apply it to activate event
  writes (no code change needed), then verify events populate. Phase 2 (cron decouple)
  is NOT started.
- **Deploy fix**: `/api/billing/status` `force-dynamic` (DYNAMIC_SERVER_USAGE).
- **Docs + workflow**: `/docs` system + consolidated `CLAUDE.md`.
- **Mobile**: Capacitor remote-URL wrapper; iOS build verified (`feat/capacitor-mobile`).

## Open issues
- **Operator migration pending — Reminder Lifecycle**: apply
  `20260609120000_reminder_lifecycle_foundation.sql` (see Completed work).
- `users` table missing → `save-onesignal` / `save-subscription` broken.
- `/api/stripe/cancel` missing → BillingSection cancel broken.
- Sentry env vars not set in Vercel (no prod error visibility).
- Data drift: the webhook now writes a correct, price-derived `subscription_plan`
  (future drift prevented). **Pre-existing** drifted rows (e.g. `admin@remynest.com`:
  is_premium=true, plan=FREE) are not auto-corrected until their next
  subscription event with a known price — a one-time data reconciliation is still
  advisable. `resolveSubscription` tolerates drift for premium/free.
- Dev uses prod Supabase (no staging); media bucket `memory-media` is public.
- Tech debt: duplicate export logic; two profile render paths; two search
  endpoints; schema not version-controlled; `npm audit` advisories.

## Active branch
`main` (production; auto-deploys). `feat/capacitor-mobile` holds mobile work
(pushed, unmerged).

## Next priorities
P0: fix `/api/stripe/cancel`; fix/remove broken OneSignal endpoints; confirm Sign
in with Apple. P1: set Sentry env in Vercel; native push;
Android build + store submission.

## Blockers
None blocking web production. Mobile store submission blocked on Apple Developer /
Play Console accounts + native push + Android SDK.

## Recent commits
- `feat(remy)` Remy Activity Feed V1 — evidence layer (historical/added/reminder/theme)
- `187229f` feat(remy): dashboard intelligence engine (real workspace summaries)
- `f9cb9c1` feat(memories): Memory Date is the primary date; Added date is metadata
- `3e36338` feat(memories): complete Historical Memory UX (create modal, edit, cards)
- `649993b` feat(insights): Insights V2 — Remy Insights Center (companion-led, telemetry preserved)
- `b2eaa36` feat(memories): Historical Memory Creation — effective-date dating + timeline
- `c7e61f4` feat(remy): Remy Companion Foundation — observation engine + avatar-ready presence
- `18581e4` feat(dashboard): Dashboard V3 — reminder-driven command center
- `962db0c` feat(reminders): Reminder Center V2 — Phase 1 (sectioned UX + local timezone)
- `b35a668` feat(reminders): Reminder Lifecycle Foundation — Phase 1 (events + status, deploy-safe)
- `866acce` fix(security): remove send-reminder injection vector + block device hijack
- `22fc8ff` fix(security): caregiver authz P0 — ownership checks + RLS write hardening
- `399625a` docs: consolidate to a single authoritative Claude workflow
- `c000ae8` fix(api): force-dynamic on `/api/billing/status`
- `e227abe` test(gdpr): add delete account validation harness
- `c78415e` fix(gdpr): remove invalid profile_name from tombstone provisioning
- `cb739d4` feat: complete GDPR delete account system
