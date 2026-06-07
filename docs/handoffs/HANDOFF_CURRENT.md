# Handoff — Current

> Update every session (it's part of Definition of Done — see CLAUDE.md). Keep
> short and truthful. Sections below are the mandated HANDOFF standard.

**Last updated:** 2026-06-06

## Current status
Web app **live in production** (Vercel → `www.remynest.com`). **Delete Account
shipped and validated** end-to-end. Single authoritative workflow established in
`CLAUDE.md` (Investigation/Execution modes).

## Completed work
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
- **Deploy fix**: `/api/billing/status` `force-dynamic` (DYNAMIC_SERVER_USAGE).
- **Docs + workflow**: `/docs` system + consolidated `CLAUDE.md`.
- **Mobile**: Capacitor remote-URL wrapper; iOS build verified (`feat/capacitor-mobile`).

## Open issues
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
- `399625a` docs: consolidate to a single authoritative Claude workflow
- `c000ae8` fix(api): force-dynamic on `/api/billing/status`
- `e227abe` test(gdpr): add delete account validation harness
- `c78415e` fix(gdpr): remove invalid profile_name from tombstone provisioning
- `cb739d4` feat: complete GDPR delete account system
