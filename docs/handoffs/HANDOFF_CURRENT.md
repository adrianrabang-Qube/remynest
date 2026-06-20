# Handoff — Current

> Update every session (it's part of Definition of Done — see CLAUDE.md). Keep
> short and truthful. Sections below are the mandated HANDOFF standard.

**Last updated:** 2026-06-17

## Remy AI Architecture Rule (authoritative)
**Remy is the sole AI identity within RemyNest.** All intelligence capabilities are
implementation layers *behind* Remy — they are NOT user-facing AI products. Capabilities
include (non-exhaustive): Memory Retrieval, People Intelligence, Relationship Intelligence,
Timeline Intelligence, Reminder Intelligence, Biography Generation, Search, and any future
intelligence systems. **Users interact only with Remy.** Every intelligence request — "Who is
John Smith?", "What happened in 2023?", "Tell me about my relationship with Dad", "Summarise my
childhood", "What memories mention Galway?" — is answered *as Remy*.
- **No future PR may introduce a separate AI assistant, AI chat, AI agent, AI tab, AI page, or
  AI brand** (e.g. "Memory Chat", "Relationship AI", "Timeline AI", "Biography AI", "RemyNest
  AI") without explicit architectural approval. New capabilities ship as internal layers routed
  through Remy.
- **User-facing naming:** "Remy" (the identity / chat header) and "Ask Remy" (the entry point /
  nav). Internal module/route/function names (e.g. `/memory-chat`, `answerAskRemy`, `build-people`)
  are implementation details, not brands.
- **Consolidation — RESOLVED:** `/remy` is the **single** Ask Remy surface. Nav "Ask Remy" + the
  dashboard CTA point at `/remy`, and **`/memory-chat` now redirects to `/remy`** (server
  `redirect()`). The route + the `/api/memory-chat` API + `retrieve-memory-context` are kept as
  **internal implementation** (no capability removed; semantic retrieval lives on inside `/remy`'s
  hybrid). One AI surface; all intelligence (memory/people/relationship/timeline/reminder) are
  internal layers behind Remy. *(`/memory-chat`'s old retriever was account-scoped, not
  workspace-isolated — consolidating onto `/remy` also closed that isolation gap.)*

## Current status
Web app **live in production** (Vercel → `www.remynest.com`). **Delete Account
shipped and validated** end-to-end. Single authoritative workflow established in
`CLAUDE.md` (Investigation/Execution modes). **Dashboard V3** shipped (reminder-driven
command center). **Reminder Lifecycle Sprint 1** is paused pending operator migration
(`20260609120000_reminder_lifecycle_foundation.sql` committed, NOT applied).

- **Native iOS Local Notifications for reminders — DEPLOYED to production (web, `36107ed`); native Build 7 PENDING OPERATOR.** Pushed to `origin/main` (Vercel auto-deploy) and `pod install` run (CapacitorLocalNotifications linked, OneSignal pod intact, `project.pbxproj` unchanged). The remote-URL app now serves the on-device path; it only fires once the operator archives a fresh **Release** native build (the installed binary predates the plugin + the production APNs entitlement). Reminders now schedule **on-device** via `@capacitor/local-notifications` (UNUserNotificationCenter), so they fire **offline / without OneSignal / cron / APNs**. A client reconcile engine (`lib/native-reminders.ts`) mirrors the server-rendered reminder list (`<NativeReminderSync>` mounted on the reminders page, above `<ReminderCenter>`) into iOS schedules on every CRUD revalidate; **no-op on web/Android**. Linked via **CocoaPods** (`ios/App/Podfile` `capacitor_pods` +1 line) to match main's other 5 plugins — the Capacitor-8 `cap sync` SPM output (`CapApp-SPM/Package.swift`) was **removed as inert** (the Xcode project links via Pods, 0 SPM refs). **OneSignal pod (`OneSignalXCFramework 5.5.2`) / AppDelegate / entitlements untouched.** Lint **0 new errors**, web build **✓ compiled**. **On-device unverified** — operator runs `cd ios/App && pod install` + a native build (test plan in `docs/features/local-notifications.md`). `cognition-v2` was the throwaway prototype (stale UI, 180 behind) — **not to be merged**.
- **OneSignal identity registration made resilient — FIXED in code (root cause of `invalid_aliases`: external_id never reliably attached).** Investigation found the old `OneSignalInit` ran **once** (module guard + `useEffect([])`) and on native was **fire-and-forget with no ack**, so a single race (`getUser()` null during hydration, Web SDK not loaded, native bridge handler not yet registered) left an **active push subscription with no `external_id`** → `invalid_aliases` at reminder send. **Fix:** `components/OneSignalInit.tsx` **rewritten** to a resilient lifecycle driven by `supabase.auth.onAuthStateChange` (**INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED**) — it **re-attempts `OneSignal.login(user.id)` on every valid-user event until it succeeds** (idempotent via per-userId `*ConfirmedFor` module state), and **never marks success until login completes** (web: `login()` resolves; native: an ack). **Native ack path (`ios/App/App/AppDelegate.swift`):** after `OneSignal.login(externalId)` it now calls `window.__oneSignalBridgeAck({externalId,status:"ok"})` via `evaluateJavaScript`; the web installs that receiver and flips `native-bridge-login-confirmed`. **Structured diagnostics added** (`[onesignal-identity]`): `login-attempted` / `login-succeeded` / `login-failed` / `native-bridge-login-requested` / `native-bridge-login-confirmed`. SIGNED_OUT detaches identity (resets trackers + best-effort `logout`, using the existing bridge logout handler). **Preserved:** web SDK init+permission, `/api/register-device` (best-effort), native subscription creation, and ALL reminder logic (untouched). `public/types/onesignal.d.ts` gained `logout()`. Validated: lint **164=baseline (0 new)**; build **✓ compiled** (TS typecheck clean). **Deploy split:** the web rewrite ships via `git push` → Vercel (remote-URL, immediate); the **AppDelegate ack requires a new native iOS build/archive** to take effect — until then the web simply keeps re-posting login (harmless, idempotent), so the resilient-retry benefit is live on web/native immediately and the *confirmation* arrives once Build N+1 ships. **On-device end-to-end not yet validated.**
- **Reminder delivery RELIABILITY hardened — FIXED in code (false-success + retry-safety + diagnostics).** Runtime log proved the false-success bug: `notification-response { id, external_id:null, errors:{ invalid_aliases } }` → `reminder-completed` (the old check `notificationData.id || recipients>0` marked success on a bare id while 0 devices were reached, permanently completing an undelivered reminder). **Fix (single file, `app/api/cron/send-due-reminders/route.ts`):** (1) `sendOneSignalNotification` now returns `{ ok, status, data }` with a non-throwing JSON parse (4xx/5xx/HTML bodies no longer throw); (2) new `isDeliveryConfirmed()` requires **HTTP 2xx AND no targeting errors (`errors` array or object — incl. `invalid_aliases`) AND `recipients`>0** — `id` alone is no longer success; (3) on unconfirmed delivery the reminder is **not** completed — it stays recoverable and retries on later ticks (per-row lock keeps each tick idempotent), **bounded** by `MAX_DELIVERY_RETRY_WINDOW_MS=10min` after which it ABANDONS *loudly* (`reminder-delivery-abandoned` error; recurring series kept alive via reschedule, non-recurring completed) so a broken target can't loop forever; (4) `reminder-timing` structured log (`scheduledTime`/`cronExecutionTime`/`deliveryRequestTime`/`deliveryResponseTime`/`schedulerToCronMs`/`oneSignalRoundTripMs`/`processingDurationMs`) to attribute delay; (5) `reminder-invalid-aliases` diagnostic (reminderId/userId/externalIdUsed/response summary — no reminder content); (6) guard against a null/blank `user_id` (never sends `[null]`). **Verified `reminder.user_id` flows VERBATIM** into `include_aliases.external_id` (no trim/case/format/transform) — no formatting bug found. Recurring/daily/weekly/monthly preserved (`calculateNextReminderDate` untouched). Validated: **9/9 decision-logic unit tests pass** (incl. the exact runtime invalid_aliases response → now `false`); lint **164=baseline (0 new)**; build **✓ compiled**. **NOT YET on-device-validated end-to-end** (needs the cron live on Vercel + a due reminder + the physical devices) — post-deploy step. **Lateness finding (separate):** no code-level scheduling/buffer/grace/rounding/next_trigger exists; the 2–3 min is Vercel cron invocation timing (`cron-started` fired at :41s into the minute) + OneSignal/device delivery — infra, not code. **Open (deferred):** full "recoverable as re-firing" on abandon would need a `delivery_status` column (migration); `notified_at` still unwritten.
- **Reminder delivery retargeted to OneSignal External ID — FIXED in code (root cause: single-device player_id targeting).** Confirmed via dashboard: External ID `25d053b5-…` has 3 Subscribed subs (Chrome + 2× iPhone 14), yet reminders never reached iOS. Root cause: the only scheduled cron `app/api/cron/send-due-reminders/route.ts` selected ONE `device_registrations` row (`.limit(1).single()`) and sent `include_player_ids:[device.player_id]` — and `device_registrations` is web-only (native iOS never registers there), so reminders went to Chrome only; brittle to multi-device, reinstall, and id rotation. **Fix (single file, per requirements):** `sendOneSignalNotification` now targets `include_aliases:{ external_id:[reminder.user_id] } + target_channel:"push"` via `https://api.onesignal.com/notifications` (mirrors the repo's existing external_id sender `send-reminders`); the `GET DEVICE` `device_registrations` lookup was removed (also fixes a latent bug where users with no stored web player_id had reminders skipped+retried forever). **Preserved unchanged:** due-reminder query/filtering, row-lock, recurring reschedule (`calculateNextReminderDate`/`rescheduleReminder`), completion, the success check, timeouts. Reminder **creation** + OneSignal **init** untouched. Verified: lint **164=baseline (0 new)**; build **✓ compiled**. **Behavior after deploy:** OneSignal fans the reminder out to **every** active push subscription on that user's External ID (web + all iOS/Android). **Empirical multi-device receipt is a post-deploy runtime check** (needs the cron live on Vercel + a due reminder) — not on-device-verified here. Ships via `git push origin main` → Vercel (web/server route; no native build needed).
- **Build 7 / deploy status (2026-06-18): PENDING OPERATOR — not created, not uploaded.** Working tree clean; `b6d339f` (WorkspaceSelector portal fix) is at HEAD but the branch is **ahead 3 of `origin/main`, NOT pushed**. **Delivery-path correction (authoritative):** the iOS app is **remote-URL** (`capacitor.config.ts` `server.url = https://www.remynest.com`; `webDir = mobile/www` is a ~1 KB offline stub), so a native archive does **NOT** bundle web code — **Build 7 cannot "contain" `b6d339f`**. The WorkspaceSelector web fix ships via **web deploy** (`git push origin main` → Vercel prod); **existing Build 6 loads it on next launch** — no native build needed for this fix. A native **Build 7 is only needed to ship the pending NATIVE commits** `8b1af62` (OneSignal App ID) + `74b998a` (APNs entitlements) — the **push-notification work excluded from this task**. Archive + App Store Connect upload are **operator/GUI/outward-facing** (Xcode 26.5 present; signing identity + ASC credentials + authorization are the operator's) — not performed autonomously. No build number/upload exists to record (nothing was uploaded). Current `CURRENT_PROJECT_VERSION = 5`, `MARKETING_VERSION = 1.0`.
- **My Nest / Home layout corruption — FIXED in code (WorkspaceSelector drawer portaled).** Root cause (adversarially verified across two investigations): the drawer overlay `fixed inset-0` (`components/navigation/WorkspaceSelector.tsx`) was rendered **inline, non-portaled**, inside the `backdrop-blur-md` headers (`MobileTopBar.tsx:37` / `AppNavbar.tsx:62`); a non-`none` `backdrop-filter` establishes the **containing block** for `position:fixed` descendants on WebKit, re-rooting the overlay to the small status-bar-padded header box → the "Manage care profiles"/"Create profile"/"Add a person" fragments leaked at the top of Home/My Nest, **and** the dismiss backdrop collapsed (so tap-outside failed and the open state rode onto `/home` via the persistent `(app)` layout). **Minimal fix:** wrapped the overlay in `createPortal(…, document.body)` (+ `import { createPortal } from "react-dom"`) — 1 component, ~3 lines. Now the overlay resolves against the **viewport**: full-screen positioning + backdrop click-trapping restored; no detached fragments; the broken-backdrop nav-while-open enabler is closed. **State-lifecycle (close-on-nav) intentionally NOT added** — the portal restores the full-screen backdrop so no nav control is reachable while open (the verified enabler), and an effect-based close-on-route would reintroduce the prohibited `react-hooks/set-state-in-effect` lint error; per the investigation, state was the *secondary* enabler, fixed transitively. `body`/`html` carry **no** containing-block property, so `document.body` is a clean viewport-rooted target. Verified: lint **164 = baseline (0 new)**; production build **passes** (`/home` + all `(app)` routes compile). Classification: **(c) both — positioning primary, fixed at source; state enabler closed transitively.** **On-device confirmation still required (Build 7):** physical iPhone via Safari Web Inspector — open the drawer on Home and confirm full-screen modal + no top-leak + tap-outside dismiss, on both mobile + desktop breakpoints. No push/native files touched.
- **APNs entitlement split — Debug=development / Release=production (root-cause fix for "OneSignal Delivered but iPhone receives nothing").** Investigation traced silent iOS non-delivery to a single hardcoded `aps-environment=development` shared by **both** build configs (`CODE_SIGN_ENTITLEMENTS` pointed Debug **and** Release at one `App.entitlements`), so TestFlight/distribution builds registered a **sandbox** APNs token while Apple/OneSignal treated them as production → push accepted ("Delivered") then dropped. **Fix (in code):** removed `ios/App/App/App.entitlements`; added **`AppDebug.entitlements`** (`aps-environment=development`, sandbox — Xcode/dev installs) and **`AppRelease.entitlements`** (`aps-environment=production` — **required** for TestFlight/App Store); repointed `project.pbxproj` per-config (Debug→AppDebug @line 350, Release→AppRelease @line 372). Verified: `plutil -lint` OK on both; no `App/App.entitlements` reference remains; bundle id `com.remynest.app` + Push/`UIBackgroundModes: remote-notification` intact; operator's `CURRENT_PROJECT_VERSION=5` preserved. **Operator to make it deliver:** `git pull` → `npx cap sync ios` → in Xcode confirm Signing & Capabilities still shows **Push Notifications** for both configs (Automatic signing regenerates a profile with production aps-environment for Release/Archive) → archive a **Release** build → install/TestFlight → **delete the app + the stale iOS subscription in OneSignal first**, then reinstall + re-grant permission so a fresh production-environment subscription is created → send a direct test to that subscription. *(The hardcoded `development` was the launch-blocking push defect; the App-ID fix below was its prerequisite.)*
- **OneSignal native iOS App ID — SET (push-blocker #1 cleared in code).** `ios/App/App/Info.plist:59` `ONESIGNAL_APP_ID` changed from the `REPLACE_WITH_ONESIGNAL_APP_ID` placeholder to the real public id **`0783b302-cb5a-474a-9f28-79869c2c0e03`** (now matches `NEXT_PUBLIC_ONESIGNAL_APP_ID` used by the web SDK + the 3 server send routes — the cross-config mismatch is resolved). Verified: `AppDelegate.oneSignalAppId()` now returns the real id (guard `id != "REPLACE_WITH_ONESIGNAL_APP_ID"` passes) → `OneSignal.initialize(appId, …)` + `requestPermission` will execute (the "native push disabled" branch no longer fires); `plutil -lint` OK (plist valid); no other config placeholder remains (the only `REPLACE_WITH_…` strings left are the intentional AppDelegate guard + log). No notification logic changed. **Still operator/runtime to deliver a test push:** (2) upload a matching APNs `.p8`/cert to the OneSignal dashboard; (3) `npx cap sync ios` + rebuild + install on a **physical** device (Push capability); (4) grant the on-device permission; (5) for TestFlight/App Store flip `aps-environment` → `production` + production APNs key. *(Optional/feature-only: Notification Service Extension + App Group for rich media/badges; notification click/foreground listeners for tap deep-linking.)*
- **Apple Guideline 3.1.1 — FIXED (lowest-risk V1: hide all in-app purchasing on native iOS).** The #1 product blocker is resolved in code (adversarially verified GREENLIGHT).
  - **New `lib/platform.ts`:** `isNativePlatform()` (sync, client-safe — for handler guards) + `useIsNativePlatform()` (`useSyncExternalStore`, server-snapshot=`true` ⇒ **hide-first**: no iOS purchase-UI flash, no hydration mismatch, lint-clean).
  - **All purchase entry points gated on native (double-protected: `!native` render guard + `if (isNativePlatform()) return;` handler short-circuit before any `window.location.href`):** `components/UpgradeButton.tsx` (→ renders `null`), `components/UpgradeModal.tsx` (→ neutral "Premium feature" notice; no prices/plans/CTA/link), `components/profile/sections/BillingSection.tsx` (plan-price selector + "Manage Subscription" portal + "Upgrade" checkout all hidden). Both `UpgradeModal` call sites (`CreateProfileForm`, `InviteCaregiverForm`) inherit the neutral notice.
  - **Preserved on native:** the Subscription **status card** + **"Cancel Subscription"** (no redirect, no purchase) — always render.
  - **Graceful degradation (req 9):** premium semantic-search `402` on the memories page shows a **native-only** neutral notice ("Semantic search is a Premium feature.") instead of a silent dead-end; web path unchanged (falls through to existing behavior). Free-plan dashboard copy is neutralized on native ("You're on the Free plan." — no upgrade-promoting prose).
  - **Anti-steering (3.1.3):** **no** external purchase link and **no** "subscribe/manage on the web" messaging anywhere (verified by diff grep).
  - **Web unchanged:** identical buttons/handlers/checkout; only delta is a one-tick post-hydration paint of the purchase CTA (cosmetic; the unavoidable cost of client-side platform detection since the server can't distinguish iOS from web on the same remote URL).
  - **Verified (2 skeptics + synth): GREENLIGHT.** No native UI route can initiate Stripe checkout/portal. Lint 0 new (164), build ✓. *Hardening follow-ups (non-blocking): a server-side native block on `/api/stripe/{checkout,portal}` (the endpoints still mint a URL for any caller — UI is fully gated, but the API doesn't refuse native), and a Capacitor-mocked regression test.*
- **Launch readiness ≈ 88% (V1).** Infrastructure **100%** (B1–B5 done/decided). Apple **3.1.1 cleared** (the hardest App-Store gate). **Remaining ranked:** [App Store, small] replace placeholder **app icon** + set real **`ONESIGNAL_APP_ID`**/`aps-environment=production` + `cap sync`/rebuild; [High, code] **`is_premium` over-entitlement** (derive from billing state) + **signup session check** (email-confirmation); [Med, code] billing-UX batch (`cancelAtPeriodEnd` spelling, checkout `stripe_customer_id`, onboarding gate, delete dead `/api/search`). None are infrastructure; the structurally-hard blockers are done.
- **Apple Guideline 3.1.1 — VERIFIED, confirmed launch blocker for iOS App Store** (investigation only; no code changed). The #1 product-development gate.
  - **Checkout launch sites (3, all `fetch("/api/stripe/checkout") → window.location.href = data.url`):** `components/UpgradeButton.tsx:15,29`; `components/UpgradeModal.tsx:66,81`; `components/profile/sections/BillingSection.tsx:64,~88` (plus the Stripe Customer Portal redirect `handlePortal → /api/stripe/portal`, `BillingSection.tsx:~127` — secondary, exposes plan changes).
  - **Reachable on native iOS: YES.** Remote-URL Capacitor WebView loads production, so these standard web components render in-app with **no platform conditional**. A FREE iOS user reaches the purchase flow on the **dashboard** (`DashboardAccountStatus.tsx:54` `{isFree && <UpgradeButton/>}`), in the **create-profile / invite-caregiver** premium gates (`CreateProfileForm.tsx:111`, `InviteCaregiverForm.tsx:180` render `<UpgradeModal>`), and in **Settings → Billing** (`BillingSection`). `window.location.href` navigates the WebView itself to Stripe's hosted checkout = in-app web payment.
  - **Existing platform gating: NONE.** `Capacitor.isNativePlatform()`/`getPlatform()` appears nowhere in any billing/upgrade component (only `lib/haptics.ts` + `OneSignalInit`).
  - **Qualifies as a digital subscription: YES, unambiguously.** Premium unlocks **in-app digital functionality** — AI semantic search (`/api/search`, `/api/memories/search` → `402 UPGRADE_REQUIRED`) + caregiver collaboration (invite). Not a physical good, not a "reader" app, not person-to-person services → **IAP required (3.1.1); in-app web checkout is prohibited.**
  - **Minimum-change path (recommended): hide all in-app purchasing on iOS** behind `Capacitor.isNativePlatform()` — on native, don't render the upgrade CTAs / checkout button; premium-gated features show a **neutral "Premium" state with NO purchase prompt and NO external link** (also satisfies anti-steering 3.1.3). Users subscribe on the **web**; the server-side entitlement reflects automatically. Also neutralize the resulting free-user dead-ends (the search `402` UX) and gate the portal CTA on iOS. Small change in ~3–4 components; no StoreKit, no Apple 30% (for V1). *(Full StoreKit IAP is the larger alternative for V1.1.)*
  - **Risk:** as-is = near-certain App Store rejection. Fix (hide-on-iOS) = LOW risk, additive guards, **web behavior unchanged** (web ≠ native). Watch anti-steering: show no link/CTA pointing to web payment. Revenue trade-off: iOS subscribers go through the web funnel (no Apple cut, higher friction). Web production launch is unaffected.
- **Infrastructure / launch-blocker audit — CLOSED (2026-06-17).** Final outcome of B1–B5:
  - **B1 — middleware protect-by-default (auth):** ✅ **Complete** — fixed (`c8106e5`) + pushed/deployed (GitHub sync).
  - **B2 — `memory-media` storage privacy:** ✅ **Complete** — bucket flipped to **private**; PHI photos now served only via short-lived signed URLs (no anonymous public access).
  - **B3 — caregiver-authz RLS hardening:** ✅ **Complete** — migration `20260608180000` applied; the direct-INSERT write-IDOR on `profile_relationships`/`caregiver_invites` is closed.
  - **B4 — backups / PITR:** ⏸️ **PITR intentionally DEFERRED to post-launch scaling (cost decision).** Daily backups remain the recovery baseline. **Rationale & accepted risk:** PITR's value is a finer recovery granularity (recover to any second vs to the last daily snapshot); deferring it means a coarser **RPO of up to ~24h** in a worst-case restore. For V1's data volume this is an operator-accepted trade-off against PITR's ongoing cost; **revisit and enable PITR when data volume/criticality grows** (it can be turned on later with no app change). Daily-backup presence + a periodic test-restore (`docs/BACKUP_OPERATOR_CHECKLIST.md`) remain the minimum bar.
  - **B5 — production env (Stripe LIVE + Sentry):** ✅ **Verified**.
  - **Net: infrastructure launch blockers = 0.** Remaining V1 gate is **product / App-Store work**, not infrastructure (top item: Apple 3.1.1 / IAP — see Next priorities). Runbook archived at `docs/LAUNCH_BLOCKERS_OPERATOR_RUNBOOK.md`.
- **Launch blockers B2–B5 verified & runbooked — all are operator/dashboard actions, ZERO required code changes** (launch-readiness; investigation-only re-verify + operator runbooks). Authoritative runbook: **`docs/LAUNCH_BLOCKERS_OPERATOR_RUNBOOK.md`** (supersedes the stale `docs/FINAL_LAUNCH_BLOCKERS.md`).
  - **B2 — `memory-media` bucket public (PHI):** OPEN. Code is fully private-bucket-ready (path storage + signed URLs on every render path; verified each surface). Fix = operator **flip bucket to private** (zero broken-image window; signed URLs unaffected). Runbook: prereqs/flip/validation/rollback.
  - **B3 — caregiver-authz RLS migration `20260608180000` unapplied (write-IDOR):** OPEN. Migration **verified correct + idempotent**, closes the direct-INSERT IDOR on `profile_relationships`/`caregiver_invites` while matching the legit owner-create + accept-invite flows (SELECT policies untouched). Fix = operator **apply the migration** (`supabase db push` or SQL editor). Runbook incl. IDOR-probe + legit-flow regression validation + rollback.
  - **B4 — Supabase backups/PITR unverified (hard gate):** OPEN, unverifiable from repo. Operator completes `docs/BACKUP_OPERATOR_CHECKLIST.md` (plan tier + PITR + Storage backup + **test restore**).
  - **B5 — Stripe LIVE keys + Sentry env in Vercel:** OPEN, unverifiable from repo. Code requires `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_*_PRICE_ID` (non-null) + Sentry no-ops without DSN. Operator verifies/sets Vercel Production env (`vercel env ls`, `npm run validate:sentry-env`) + confirms live webhook-secret match.
  - **Updated blocker count:** **hard blockers in code = 0.** B1 is fixed in code (`c8106e5`) pending push/deploy; **B2–B5 require operator action only** (no code left). Lint 0 new (164), build ✓ (docs-only change).
  - **Adversarial verification — GREENLIGHT** (2 skeptics + synthesis): applying B3 is **safe for all four legitimate caregiver flows** (`createProfile`/`inviteCaregiver`/`acceptInvite`/`declineInvite` in `app/(app)/dashboard/actions.ts` — acceptInvite inserts the relationship while the invite is still `pending`, then flips it to `accepted`; service-role/GDPR/ownership paths bypass RLS), and **B2/B4/B5 "operator-only, zero required code changes" confirmed**. The one finding — runbook **B3 rollback** precision (the migration also `enable row level security`, so merely *dropping* the new policies = deny-all, not a true rollback) — was **incorporated** (rollback now recreates a permissive policy / disables RLS; validation adds accept-as-real-user + decline checks; B2 GDPR-export caveat tightened). No code changes.
- **Launch Blocker B1 fixed — middleware auth is now protect-by-default** (security-critical; root-cause + future-proof). Was a **live production** defect.
  **Root cause:** `middleware.ts` used a `PROTECTED_ROUTES` *allowlist* and only ran the Supabase user lookup for allowlisted/auth routes. Any route in *neither* allowlist left `user=null`, then `!user && !publicRoute` redirected **everyone — incl. authenticated users — to `/login`**. Enumeration found **10** affected authenticated routes (the audit's 7 + `/library/*` sub-pages + **`/memory-book/print`**): `/profile`, `/collections`, `/connections`, `/chapters`, `/library`, `/memory-dates`, `/reminisce`, `/memory-book/print`, all linked from the live profile dropdown / dashboard cards.
  **Fix (2 files):** (1) **`middleware.ts`** — removed `PROTECTED_ROUTES` + `isProtectedRoute`; the auth lookup now runs for `!publicRoute || isAuthRoute`, so **any non-public route is protected by default** and a forgotten authenticated route fails *closed* (→ `/login`), never the old "authed users bounced" bug. (2) **`app/(app)/layout.tsx`** — defense-in-depth `if (!user) redirect("/login")`; the `(app)` route group *is* the auth boundary, so every current/future `(app)` route is gated even if the edge is bypassed.
  **Preserved (verified):** all public routes (incl. `/reset-password` + `/callback` code-exchange), authed→`/home` redirect, public-API + static bypasses, `/api/*` protection, the pending-deletion flow; no redirect loop; `config.matcher` unchanged.
  **Adversarially verified (2 skeptics tracing concrete route classifications + synth): GREENLIGHT, both `correct`, no regression.** Lint 0 new (164), build ✓. Standard recorded in `CLAUDE.md` (Engineering rules) so no allowlist is ever reintroduced. *(Accepted trade-off: protect-by-default does a `getUser` for unmatched paths it previously skipped — the necessary cost of allowing authed users through.)*
- **Documentation governance hardening** (`CLAUDE.md` only; no app changes). Strengthened the workflow doc so future sessions inherit continuity rules and don't waste tokens / reintroduce retired work:
  - **Session Continuity Rule** (enhanced "Start every session"): read HANDOFF first → relevant `CLAUDE.md` second → continue from documented state; **don't repeat documented investigations**, **don't reintroduce retired features / re-litigate approved decisions**, and **treat documented architectural decisions as source-of-truth** unless current code proves a doc stale (then fix the doc).
  - **Documentation Maintenance Rule** (enhanced the Definition of Done): any change to architecture · navigation · auth · billing · schema · AI behavior · memory architecture · mobile behavior · deployment · integrations · user-facing workflows MUST update **both** `HANDOFF_CURRENT.md` **and** `CLAUDE.md` (when it establishes/retires an architectural decision or standard), in the same commit.
  - Completed the **Workspace-navigation** authoritative note (My Nest = workspace state, not a page; switches to Personal + → `/home`; drawer preserved on **desktop + mobile** for care switching/management; full rationale). Rules added by **enhancing existing sections in place** (no parallel/duplicate guidance); audit found **no conflicts**.
- **My Nest navigation retired from the workspace drawer → moved to the profile dropdown** (interaction-model simplification; operator-approved). No features/perf/haptics/auth/billing/schema changes; workspace switching (a critical system) **fully preserved**.
  Rather than keep patching the workspace-drawer overlay/scroll-lock, the **"My Nest" affordance was removed from the drawer** and added to the **profile dropdown** as a Settings-style entry. **What changed:**
  - **`components/profile/ProfileHub.tsx`** — new top-of-menu **"🏡 My Nest"** entry. `goToMyNest()`: `onNavigate?.()` (closes the dropdown **immediately**, like Settings) → `setPersonalWorkspace()` (writes the `remynest-active-context` cookie = personal context) → `router.push("/home")`. The switch resolves **before** the push (no context race/flicker), and both run independent of the now-unmounting menu (can't strand it open; fail-open `.catch` still navigates). Added `"use client"` (it now uses `useRouter`).
  - **`components/navigation/WorkspaceSelector.tsx`** — removed the **"My Nest" `<li>`** row (and the now-unused `setPersonalWorkspace` import). The drawer is **otherwise kept** and still rendered in `MobileTopBar` + desktop `AppNavbar`; **care-profile switching (`setActiveProfile`) + "Manage care profiles" (invite/add) are intact**, as is the prior close-immediately trap fix.
  - **`components/navigation/ProfileMenuItems.tsx`** — removed the old duplicate "Switch to My Nest" button (+ its `useRouter`/`useTransition`/`setPersonalWorkspace` imports); now renders Settings link(s) + sign-out only. **`profile-menu.config.ts`** comment updated.
  - **No dedicated "My Nest" page** was created — My Nest is a workspace context; its home is `/home`.
  - **Docs:** `CLAUDE.md` Critical-systems section now records this navigation architecture so future sessions **don't reintroduce** the drawer "My Nest" row / a dedicated page.
  - **Adversarially verified (2 skeptics + synth): GREENLIGHT, `correct`, no workspace-switching regression.** Lint 0 new (164 = 4 err/160 warn), build ✓, `tsc` clean.
- **My Nest interaction-trap fix (P0 functional)** — `components/navigation/WorkspaceSelector.tsx` only; no features/perf/UX-polish.
  **Defect (TestFlight):** opening "My Nest" could **trap** the user — the sheet wouldn't reliably close, the underlying page stayed unscrollable, and an invisible `fixed inset-0 z-50` overlay kept capturing pointer events. **Root cause:** in `switchTo`, `setOpen(false)` ran **inside `startTransition` after `router.refresh()`**, so React deferred the close as a transition update until the slow `force-dynamic` SSR refresh resolved (seconds over cellular) — or **never**, if the server action rejected (`validateProfileId` throws; no `.catch`). Meanwhile the scroll-lock effect captured/restored `previousOverflow`, which could orphan a stale `"hidden"`. **Fix (3 parts):** (1) `setOpen(false)` now runs **immediately as an urgent update, outside the transition** → the overlay unmounts and the `[open]` effect cleanup releases the scroll-lock instantly, decoupled from refresh latency/failure; (2) the action chain is `.then(router.refresh).catch(router.refresh)` so a failed switch can never strand the sheet open; (3) the scroll-lock cleanup now restores `document.body.style.overflow = ""` unconditionally (the unlocked default — only two body-lock writers exist app-wide and they're z-index-mutually-exclusive), so it can never orphan a stale `"hidden"`. The switch still runs (cookie + `revalidatePath` + `router.refresh` re-sync the chip/data); all close paths (backdrop/×/Escape/switch) release the lock; the dropdown close-on-nav (`ProfileHub`/`MobileNavDrawer`) is untouched. **Adversarially verified (2 skeptics + synth): GREENLIGHT, fixed-safe, no regression.** Lint 0 new (164), build ✓. *(Follow-up, non-blocking: a toast on a failed switch — strictly better than the old hang-open.)*
- **TestFlight UX defect fixes — modal layering · dropdown close-on-nav · drawer safe-area** (3 targeted mobile-UX fixes; no features/logic/schema/AI changes; adversarially verified, all fixed-safe).
  - **Issue 1 — Create/Edit Memory modal layering.** `components/CreateMemoryModal.tsx` + `components/EditMemoryModal.tsx` root
    `fixed inset-0` overlays had **no `z-index`**, so the page's sticky search bar (z-20) + `MobileTopBar`/`MobileBottomNav`
    (z-40) painted **above** the modal. Fix: added **`z-50`** (the app's overlay tier — matches `MobileNavDrawer`/
    `WorkspaceSelector`/`UpgradeModal`/`DeleteAccountModal`). Verified the modal sits in the **root stacking context** (no
    ancestor `transform`/`filter`/`opacity` trap), so `z-50` wins globally; all modal interactions (inputs, file picker,
    Save/Cancel) intact.
  - **Issue 2 — Profile dropdown/drawer stayed open on navigation.** The profile-menu nav links live in nested `ProfileHub`
    sections and never closed the host, so the destination rendered behind a still-open menu. Fix: `components/profile/ProfileHub.tsx`
    gains an optional `onNavigate` and a **click-delegation** handler that closes the host only when a real `a[href]` is tapped
    (covers "View profile" + every nested section link); `ProfileSection` is static and all in-form controls are `<button>`/
    `<input>`, so form/section interactions don't false-close. Wired from `UserProfileDropdown` (desktop) + `MobileNavDrawer`
    (mobile). The handler only calls `onNavigate` (no `preventDefault`/`stopPropagation`), so `<Link>` navigation is preserved
    (anchor handler fires, then the ancestor closes via idempotent `setState`).
  - **Issue 3 — Top content under the status bar (safe-area).** `components/navigation/MobileNavDrawer.tsx` is a full-height
    (`top-0`) drawer whose header had **no `safe-area-inset-top`**; under `viewport-fit=cover` the "Menu" title/close rendered
    under the notch. Fix: header `px-5 py-4 → px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]` (web no-op: `py-4`=`1rem`).
    **Audited the other overlays:** the `WorkspaceSelector` bottom sheet (hosts "Manage care profiles") is bottom-anchored at
    `max-h-[85vh]` → its top sits ~15vh below the screen edge, already clear of every iPhone notch (a speculative height-cap was
    **reverted** to avoid changing behavior). The **primary** header/My-Nest safe-area padding is already on `origin/main`
    (`MobileTopBar`/`AppNavbar`, Sprint V2 `67e3a18`) — the remaining dependency is a **production redeploy + `npx cap sync ios`
    + native rebuild + on-device confirmation**, not a code fix.
  - Validated: lint 0 new (164 = 4 err/160 warn — the 4 are pre-existing generated `cordova.js`), build ✓, `tsc` clean.
- **Mobile Launch-Readiness Sprint V3 — dashboard/auth query performance** (behavior-preserving; no new features/schema/Voice/AI/billing/architecture changes).
  Implements the high-ROI, evidence-backed fixes from the mobile-slowness investigation (every (app) page is `force-dynamic`,
  so the dashboard fan-out re-runs server-side on every navigation over cellular). **All changes verified behavior-preserving by
  a 3-skeptic adversarial workflow (greenlit) + lint 0-new + build ✓.**
  - **Phase A1 — Dashboard loaders parallelized.** `app/(app)/dashboard/page.tsx`: the six independent Remy loaders
    (`buildRemySignals`, `fetchRemyActivitySources`, `getRemyCollections`, `getRemyConnections`, `getRemyLifeChapters`,
    `getFamilyIntelligence`) were awaited **sequentially** (~6 serial network waves); now a single **`Promise.all`** (mirrors the
    existing `lib/remy/home-model.ts` pattern). `familyProfiles` moved above the wave; pure derivations (`generateRemyObservations`,
    `buildRemyActivities`, `computeCoverage`) stay after. Identical inputs/outputs, same throw-on-failure abort semantics.
    **Est. ~560–1050ms off the dashboard critical path.**
  - **Phase A2 — Redundant profile query removed.** The dashboard fetched `profiles` **twice** (`select('*')` by id AND by
    email). Now the email fallback runs **only when the id-row isn't already premium** (`idIsPremium` short-circuit) — provably
    selection-identical (the id-row is first in `candidates`, so it always wins when premium), saving one round-trip + payload
    for premium users.
  - **Phase A3 — Request-level dedup via React `cache()`.** New **`lib/auth/current-user.ts`** (`getCurrentUser`, `cache()`-wrapped —
    `auth.getUser()` is a network JWT validation, not a local read). `getAccessibleProfiles` (`lib/profile-access.ts`) and
    `resolveAccountIdentity` (`lib/account-identity.ts`) are now `cache()`-wrapped and route their `getUser` through
    `getCurrentUser`; the layout, dashboard, profile page, and search route also use it. Result per request: **`getUser` ~6→1**,
    **`getAccessibleProfiles` 2→1** (the layout + page no longer duplicate it). `cache()` is strictly per-request (no
    cross-user/cross-request leakage; `noStore()` still prevents cross-request Data-Cache reuse — they're orthogonal). Benefits
    **every page under the layout**, not just the dashboard. **Est. ~400–900ms/nav.**
  - **Phase A4 — DEFERRED (documented).** `retryPendingDeletionForUser` (`app/(app)/layout.tsx`, a per-nav service-role GDPR
    check) can't be safely gated to once-per-session without an auth-flow cookie: Next 14 RSC layouts can't set cookies during
    render, and `cache()` only dedups within one request. The safe fix (set a flag cookie in **middleware** or a **post-login
    route handler**, read it in the layout, clear on logout) touches the auth flow → out of this sprint's scope. Recommended as
    a follow-up. (The `cache()` work already removed the layout's *duplicate* `getUser`/`getAccessibleProfiles`.)
  - **Phase B — Destructive haptic.** `components/memories/CompactMemoryRow.tsx` delete action now fires `hapticWarning()`
    (additive; native-only). Primary-button/nav/create/save/login/workspace haptics + global press states + per-route skeletons
    already shipped in V1/V2.
  - **Phase C — Reminders responsive gutters.** `app/(app)/reminders/page.tsx` `px-6 py-10 → px-4 py-8 md:px-6 md:py-10`
    (no mobile cramping on a 375px screen; desktop unchanged). Presentation-only.
  - **Phase D — My Nest = the V2 safe-area fix** (`safe-area-inset-top` on all 14 top surfaces + `contentInset:'never'`),
    verified intact. It "still appeared broken" on Build 3 only because V2 is **unpushed** (the device ran pre-V2 production).
    Permanent resolution is in code; needs deploy + `npx cap sync ios` + rebuild + on-device confirmation.
  - **Net (once deployed): ~1.5–2.5s of stacked round-trips removed per dashboard navigation**, plus reduced Supabase load
    (cost) on every authenticated page. No DB schema change. **Operator: verify the hot indexes** (`memories(memory_profile_id,
    created_at)`, `memories(user_id, memory_date)`) in the Supabase SQL editor — assumed present, not verifiable in-repo.
- **Mobile Experience Sprint V2 — My Nest safe-area fix + perceived-perf + caching** (behavior-preserving; no new features/schema/Voice/AI/billing changes).
  Responds to TestFlight Build 3 feedback (haptics dead, My Nest still broken, nav slow, feels like a website). **Root-cause
  finding first:** Build 3 ran the **pre-Sprint web app** because **`65fb730` (Sprint V1) was never pushed** — `server.url`
  loads production (`origin/main` = `da4d334`), so haptics/skeletons/press-states/login were never on the device even though the
  operator installed the native `CapacitorHaptics` pod. **The #1 fix is to push.** This commit adds the code-side improvements:
  - **My Nest (P0) — real root cause = iOS status-bar occlusion, not horizontal overflow.** `viewport-fit=cover` (app/layout.tsx)
    draws the WebView under the status bar / Dynamic Island, but `env(safe-area-inset-top)` was applied **nowhere** (all 4
    prior usages were bottom-only). Fix: `MobileTopBar` + desktop `AppNavbar` headers now pad
    `pt-[max(…,env(safe-area-inset-top))]` + left/right insets; **`capacitor.config.ts` `ios.contentInset: 'always'→'never'`**
    so CSS `env()` is the single source of inset truth (the `always`↔`cover` pair double-inset and shifted the sticky header).
    The earlier `overflow-x: clip` fix (da4d334) chased the wrong axis. *(contentInset is native → needs `npx cap sync ios` +
    rebuild to take effect; verify on a notched device.)*
  - **Coherent safe-area system (every WebView-reachable top surface).** Because `contentInset:'never'` makes the web layer own
    all insets, padding was added to **every** top-of-screen surface so none renders under the status bar: `(app)` headers,
    `app/(auth)/layout.tsx`, the marketing landing header, the legal shell (`components/legal/LegalPage.tsx` → privacy/terms/
    cookies), `app/contact`, `app/account-deletion`. The 6 coupled sticky sub-header offsets (Search/Timeline/Memories/Library
    `top-14`, `MemorySection` `top-[6.75rem]`, `TimelineDayGroup` `top-[12.5rem]`) were coupled to `+ env(safe-area-inset-top)`.
    **All safe-area edits are provable web no-ops** (`env()=0` off-device → byte-identical rendering), verified by lint+build +
    emitted CSS; they only affect notched native rendering.
  - **Perceived performance (P0).** New **`components/navigation/NavigationProgress.tsx`** — a slim top bar giving immediate
    (<100ms) in-flight feedback on every internal-link navigation while the `force-dynamic` route renders server-side. Purely
    passive (one capture-phase listener that only sets local state; never `preventDefault`/`stopPropagation`), so it cannot
    affect routing. Guarded so nested controls (e.g. MemoryCard Edit/Delete buttons inside the card `<Link>`) don't trigger it,
    with an 8s failsafe auto-reset. Mounted in `app/(app)/layout.tsx`.
  - **Caching / cost (P0).** `components/QueryProvider.tsx` `QueryClient` now sets `defaultOptions` (`staleTime 60s`,
    `gcTime 5m`, `refetchOnWindowFocus:false`, `retry:1`) — a sensible floor that cuts redundant Supabase/API refetches on
    mobile. **Behavior preserved**: call-site options override defaults (the memories list keeps its own 2-min staleTime +
    optimistic `setQueryData`/`invalidateQueries`).
  - **Misc responsiveness/interaction.** `app/(app)/error.tsx` `h-screen → min-h-[100dvh]` (iOS dynamic-viewport bug);
    haptic feedback on workspace switch (`WorkspaceSelector`).
  - **Adversarial verification (2 workflow passes).** First pass caught **2 real HIGH regressions** — both fixed before commit:
    (1) NavigationProgress would stick at 84% on MemoryCard Edit/Delete (nested-button-in-Link cancels nav) → fixed via the
    nearest-interactive-ancestor guard + failsafe; (2) `contentInset:'never'` occluding unpadded marketing/auth/legal pages →
    fixed by padding every top surface. Second pass confirmed both fixes safe + caught the legal/contact/account-deletion gap
    (now closed). Validated: **lint 0 new (164 = 4 err/160 warn)**, **build ✓**, safe-area CSS emitted.
  - **Remaining (operator / device / next sprint):** **PUSH `65fb730` + this commit** (highest-impact — restores haptics +
    deploys all fixes), then `npx cap sync ios` + rebuild for the contentInset change, then verify My Nest + safe-area on a
    notched device. Not addressed here (deliberate scope/risk): header touch targets <44px (needs coordinated header+sticky-offset
    retune), the global marketing-scale typography + `p{muted}` defaults, the Card/Button/Modal design-system primitives, and
    the dominant "website-feel" which is the **remote-URL WebView architecture** (a separate, larger project).
- **Mobile Experience Sprint V1 — perceived-responsiveness layer** (interaction polish only; no new features, no Voice Engine, no schema, no Android).
  Targets the "feels like a website wrapped in an app" deadness identified in the Mobile Experience audit — adds the missing
  tactile + feedback layer over the existing remote-URL Capacitor WebView. **5 phases, all additive:**
  - **Phase 1 — Native haptics.** New **`lib/haptics.ts`** (client-safe; native-only via `Capacitor.isNativePlatform()`,
    dynamic `import("@capacitor/haptics")`, fully guarded/try-caught — a no-op on web/desktop so SSR + browser are unaffected).
    Exposes `haptic("light"|"medium"|"heavy")`, `hapticSuccess()`, `hapticWarning()`. Wired into the primary interaction points:
    `MobileBottomNav` (tab tap = light, center "New" = medium, "More" = light), `RemyAsk` (send = light), `CreateMemoryModal`
    (save = medium + success on create), `EditMemoryModal` (save = medium + success on update), `LoginClient` (submit = light,
    error = warning). Added `@capacitor/haptics@^8.0.2` to `package.json` (matches the v8 Capacitor line).
  - **Phase 2 — Global press states.** `app/globals.css`: `-webkit-tap-highlight-color: transparent` on all elements +
    an `@media (hover: none)` `:active { opacity: 0.6 }` rule for links/buttons/role=button (opacity-only so it never
    overrides existing `active:scale-*` transforms; `:not(:disabled)` so disabled controls stay inert). Gives every tappable
    element instant visual acknowledgement on touch.
  - **Phase 3 — Loading skeletons (no blank screens).** Upgraded the shared **`app/(app)/loading.tsx`** from bare
    "Loading…" to a real pulse skeleton, and added tailored route skeletons for the five high-traffic routes:
    `dashboard` (stat-card grid + widgets), `memories` (search bar + rows), `timeline` (chronological rows), `search`
    (bar + filter chips + results), `remy` (header + Ask box + cards). These render during Next's client-side RSC route
    transitions (in-app `<Link>` navigations), so navigating between pages no longer flashes blank. *(The initial cold
    document load is still a native splash — route skeletons cover soft navigations, which dominate in-session use.)*
  - **Phase 4 — Login experience.** `LoginClient` rewritten around a real `<form onSubmit>` (Enter-to-submit), correct
    mobile keyboard semantics (`type="email" inputMode="email" autoComplete="email" autoCapitalize="none"`; password
    `autoComplete="current-password"`), an inline spinner, `active:scale-[.98]` press feedback, and a **sustained** loading
    state (stays true through navigation — no flash back to "Login"), plus haptics (light on submit, warning on error).
  - **Phase 5 — Remove debug overhead.** Stripped all leftover diagnostic `console` markers from `app/(app)/dashboard/page.tsx`
    (`[DASHBOARD_RUNTIME_MARKER]`, the `getAccessibleProfiles` BEFORE/AFTER/FAILED/final markers — the catch now routes through
    `logDashboardError("accessible-profiles-failed", …)`, `[ACTIVE_PROFILE_RESOLUTION]`, `[BILLING_DEBUG]`, the two
    `[PROFILE_SWITCHER_*]` markers, `[dashboard-page] billing-state`). Removing the switcher logs orphaned the
    `switcherProfiles` dedupe block (the live switcher reads `accessibleProfiles` directly), so it was deleted too. The
    structured `logDashboardStage`/`logDashboardError` helpers are kept.
  - **Validated:** lint **0 new** (164 = 4 err/160 warn, exact baseline), build ✓ (compiled successfully; `/remy`, `/search`,
    `/timeline`, `/dashboard`, `/memories` all built with their new `loading.tsx`). **Desktop / mobile-web:** haptics are a
    guarded no-op, press states are `hover:none`-gated, skeletons are platform-agnostic → zero desktop regression by
    construction. **Capacitor iOS:** native haptics + press feedback are live device behaviour — **operator must run on a
    physical device** (the simulator does not emit haptics; the WebView here can't be exercised without a signed build).
  - **Remaining mobile-experience gaps (next sprint candidates):** the dominant "website-in-an-app" feel is the **remote-URL
    WebView** (full SSR site in WKWebView) — true native-feel needs page transitions / a prefetch+cache strategy / or a
    bundled-asset move, all out of this sprint's scope. Also unaddressed here: haptics on delete-confirm / reminder-create /
    dashboard card actions, pull-to-refresh, optimistic mutations, and the cold-start splash→content handoff.
- **Mobile header sticky-position fix** (real root cause of the "My Nest" selector clipping; mobile-only, no desktop change).
  The sticky mobile header (`MobileTopBar`) rendered horizontally shifted off-screen (left edge / Workspace Selector
  clipped). **Root cause:** `body { overflow-x: hidden }` (`app/globals.css:43`) makes `<body>` a horizontal scroll
  container, which breaks `position: sticky` on WebKit/iOS — the sticky header positions against the body's scroll extent
  instead of the viewport. The earlier `MobileTopBar` flex fix (`w-full`/`flex-1`/`shrink-0`, commit `5c46a73`) only fixed
  intra-header distribution, not the mis-positioned header *box*, so it couldn't help. **Fix:** `body { overflow-x: clip }`
  (was `hidden`) — `clip` still prevents horizontal overflow but does NOT create a scroll container, so sticky positions
  correctly. `clip` clips identically to `hidden` on desktop → no desktop regression. **Overflow-source diagnostic:** the
  shared mobile shell has **no in-flow element exceeding the viewport** — `WorkspaceSelector` is `max-w-[11rem]`,
  `MobileBottomNav` items are all `flex-1` in a `fixed inset-x-0` bar, drawers/dialogs are `fixed` (only when open), `<main>`
  is `w-full max-w-[1600px] px-4`, `UserProfileDropdown` (`w-[360px]`) is desktop-only, `FamilyOverview`/`WorkspaceBanner`
  don't render in My Nest — so the defect is the `overflow-x: hidden`↔`sticky` interaction itself, which `clip` resolves.
  1 file (`app/globals.css`), lint 0 new (4/160), build ✓. *Note: live 390px visual confirmation needs an authenticated
  WebView session (the `(app)` pages are auth-gated) — verified here by lint/build + the shared-shell code audit.*
- **Remy Identity Consolidation V1 + "Who is X?" routing fix** (branding + one-line client fix; no functionality removed).
  Establishes the **Remy AI Architecture Rule** (see top of this doc): Remy is the sole AI identity; all capabilities
  are internal layers behind Remy.
  - **Branding (Task 1/3):** user-facing "Memory Chat" / "RemyNest AI" → **Remy / Ask Remy**: nav label
    (`nav-config.ts` "Memory Chat"→"Ask Remy"), `/memory-chat` page header ("RemyNest AI"→"Remy") + subtitle/placeholder/
    button ("Search Memories"→"Ask Remy"), dashboard CTA ("Continue memory chat"→"Ask Remy"), `manifest.ts` description,
    and the memory-chat LLM persona ("You are RemyNest AI"→"You are Remy, the RemyNest companion"). Routes/function names
    unchanged (implementation details). `landing-backup.tsx` left as-is (dead, unimported). No "Relationship/Timeline/
    Biography/People/Search/Caregiver AI" brands exist — those capabilities were already internal-only.
  - **"Who is John Smith?" fix (Task 2):** `ask-intent.ts` `LEAD_STRIP_RE` gained present-tense `who is|who are|who s`
    (mirrors existing `who was|who were`). Previously "Who is X?" produced a null `extractAskQuery` → `resolveAskTurn`
    `{kind:"none"}` → the client's fixed "doesn't know" notice **before** any server call. Now it resolves to a memory
    turn → `answerAskRemy` → the existing C3/C4 person-aware pipeline resolves the person from the raw query tokens.
    Verified: "Who is John Smith?", "Who are Mary and John?", "Who's Dad?", "Who is Sarah?" all reach `answerAskRemy`
    (QUESTION mode); "What happened in 2020?" + "Who was Dad?" unchanged (regression-safe). No new AI; C4/C5 untouched.
- **Phase C5 — Relationship Intelligence Foundation** (derived-on-read metrics over **existing** data; additive).
  Derives relationship signals from `people` + `memory_person_links` + `memories` — **no** new extraction/embeddings/
  schema/AI/graph/persistence/UI. Read-only, owner+workspace scoped, authenticated client (never service role).
  - **Files:** **`lib/remy/relationship-intelligence.ts`** (new, server-only). **`app/(app)/remy/ask-action.ts`** —
    a thin C5 branch in `answerAskRemy`.
  - **Architecture:** one scoped IO fetch (`getRelationshipDataset`: people `.eq(created_by_account_id)`+`status=active`+
    workspace; links `.in(workspace personIds)`; memories `.eq(user_id)`+workspace; **links then filtered to memories
    that passed the scoped fetch**), then everything is **pure derivations** (unit-testable). Public API:
    `getRelationshipMetrics`, `getTopPeople` (by mention|strength), `getRecentPeople`, `getPersonTimeline`,
    `getPersonCoOccurrences`, `buildPersonRelationshipContext`.
  - **Formulas:** `mentionCount` = **distinct memories** per person (defensive). Co-occurrence = per memory, distinct
    persons → canonical `a|b` (a<b) pairs (**self-pairs excluded, dup pairs removed**), counted across memories;
    `coOccurrenceTotal` sums a person's pairs once each. **Relationship strength** (deterministic, explainable, no AI):
    `0.5·saturate(mentions) + 0.2·recency(latest) + 0.3·saturate(coOccur)`, where `saturate(n)=n/(n+5)` ∈ [0,1) and
    `recency=0.5^(ageDays/1825)` (5-yr half-life). All ranking sorts tie-break on `personId.localeCompare` → stable.
  - **Ask integration (Step 6, limited):** `detectRelationshipIntent` (pure) routes — **aggregate** ("who do I mention
    most / spend the most time with / appears together most / mentioned recently") → a **deterministic, no-LLM** answer
    built from real counts/co-occurrence + **cited memory titles** (`NO_DATA` when empty); **single-person**
    ("tell me about my relationship with Dad") → the C4 grounded answer with a **factual facts block** appended to
    context (counts/dates/co-occurrence only, labelled "do NOT infer feelings, health, or psychology"; best-effort).
    Non-relationship queries are the **unchanged** C4 path. No psychological profiling, no sentiment inference.
  - **Validation (Step 7):** ~28 pure unit tests (co-occurrence self/dup exclusion + canonical keys + counts; totals;
    strength deterministic+monotonic+bounded; distinct mentionCount ignoring a dup link; metrics dates; stable ranking;
    intent detection 7/7). **A/B isolation** (cross-user, cross-workspace) by construction — every query pins owner +
    `memory_profile_id`; **C** no duplicate pairs; **D/E** deterministic/stable ranking; **F** no new OpenAI calls
    (grep-verified — DB-only; aggregate is no-LLM; single-person reuses the same `answerAskQuestion`); **G** no new
    schema; **H** `delete_user_account` unchanged (read-only). Lint 0 new (4/160), build ✓. *Live-DB metric checks are
    operator-run (no DB here); scoping verified statically.*
  - **Adversarial review (2-agent): both PASS** — all 21 break attempts (cross-user/workspace leakage, ranking
    manipulation, duplicate counting, pair inflation, retrieval poisoning, GDPR, service-role, new-AI-call, integration
    regression) **blocked-safe**. Findings: one **minor fixed** (mentionCount now counts distinct memories, not raw
    links); one **minor pre-existing** (active-workspace cookie unvalidated — C5 safe because owner `.eq` is load-bearing).
  - **Future graph dependencies (C6+):** the co-occurrence pair map is the raw **edge list** for a future relationship
    graph; `relationshipStrength` is the candidate **edge weight**; `merged_into_person_id` (C1) is the hook for entity
    de-dup/merge UX. A graph/family-tree/visualization, caregiver-relationship modelling, and any relationship UI are
    **out of scope** and not started.
- **Phase C4 — Ask Remy Person-Aware Retrieval Integration** (wires C3 into the **live** Ask answer path; additive).
  When a user asks about people ("Dad", "what did Dad and I do in Galway?", "John Smith"), Ask Remy now auto-retrieves
  person-linked memories and uses them in the grounded answer. No schema/migration/extraction/UI/embeddings/relationship-
  intelligence; no GDPR-flow change; no new OpenAI calls.
  - **Files:** **`app/(app)/remy/ask-action.ts`** — `answerAskRemy` now calls `retrievePersonAware` instead of
    `retrieveAskRecordsHybrid`; propagates `matchedPersonIds`/`matchedPersonNames` in `AskAnswer`; logs **counts only**
    (no PII names). **`lib/remy/person-retrieval.ts`** — `retrievePersonAware` tags each record with `retrievalReasons`
    (`semantic`/`keyword`/`person_match`). **`lib/remy/retrieval.ts`** — `MemoryRecord.retrievalReasons?` + pure
    `retrievalReasonsFor` helper.
  - **Retrieval flow (before → after):** *Before:* `answerAskRemy → retrieveAskRecordsHybrid (semantic ∪ deterministic)
    → buildAskContext → answerAskQuestion`. *After:* `answerAskRemy → retrievePersonAware { hybrid base ∪
    person-linked memories, person-boosted, reasons-tagged } → buildAskContext → answerAskQuestion`. The base hybrid
    call (and its single embedding) is unchanged; the person arm is **DB-only** and runs in parallel.
  - **Metadata (Step 3/5):** `AskAnswer` gains `matchedPersonIds`/`matchedPersonNames` (for logging/explainability/future
    use — **not rendered**; RemyAsk reads only `answer/count/failed`). Each record carries `retrievalReasons` so
    person-linked memories are identifiable. Server log emits counts only.
  - **Invariants preserved:** no-AI-on-empty (guard still keys on `records.length===0`, before any AI), grounding
    (context built **only** from retrieved records; `ask-intelligence` untouched), workspace/owner scoping (every
    person/memory/link query pins `owner = auth.uid()` + `memory_profile_id`), no duplicates (union deduped by id),
    **non-person queries identical** to pre-C4 (no resolved people → base set, re-rank == prior order).
  - **Validation (Step 6):** 6 pure unit tests (`retrievalReasonsFor`; F person-boost; E/B person-less == `rankRecords`)
    + C3's 14. **G: no new OpenAI calls** (only the pre-existing hybrid embedding; person arm DB-only — grep-verified).
    A/C/D (live person-linked retrieval + workspace/cross-user isolation) are owner+workspace-scoped by construction;
    live-DB confirmation is operator-run (no DB here). Lint 0 new (4/160), build ✓ (`/remy` 5.65 kB), `tsc` clean.
  - **Adversarial review (2-agent): both PASS** — all 24 break attempts (cross-user/workspace leakage, cookie
    manipulation, ranking corruption, duplicates, retrieval poisoning, GDPR, service-role, new-AI-call) **blocked-safe**.
    Findings: one **minor fixed** (person names were logged → now counts only); one **minor pre-existing** (active-
    workspace cookie unvalidated — safe here because owner `.eq` is load-bearing; documented).
  - **Known limitations:** inherits C3 (unigram+bigram name detection; relationship-word resolution needs role indexing;
    client-set workspace cookie — safe via owner `.eq`). `matchedPersonNames` returned but intentionally unused by UI.
  - **Future relationship-intelligence hooks (C5):** `matchedPersonIds`/`matchedPersonNames` (Ask explanations);
    `retrievalReasons` (UI "why this memory"); `mention_count` + co-occurrence over `memory_person_links` (metrics);
    a person-summary path could reuse `retrievePersonLinkedRecords` + the existing `answerAskQuestion`.
- **Phase C3 — Person Retrieval Foundation** (retrieval **only**; read-only, additive). A standalone, composable
  person-aware retriever — **not** wired into Ask Remy (foundation for a future phase). No schema/extraction/UI/
  relationship-intelligence changes; the existing hybrid + `ask-action`/`ask-intelligence` are untouched.
  - **Files:** **`lib/remy/person-retrieval.ts`** (new, server-only) — `resolvePeopleInQuery`,
    `retrievePersonLinkedRecords`, `retrievePersonAware`. **`lib/remy/retrieval.ts`** — new **pure** helpers
    `extractNameTokens`, `matchPeopleByTokens`, `rankWithPersonBoost`, `PERSON_RANK_BOOST`, types `PersonRow`/`ResolvedPerson`.
  - **Architecture / flow:** `retrievePersonAware(supabase, question, query, owner, profile)` runs, in parallel,
    the existing `retrieveAskRecordsHybrid` (base set, **unchanged**) and person resolution; then unions the
    person-linked memories in and re-ranks with a person boost, returning `{records, matchedPersonIds,
    matchedPersonNames}` (explainability metadata for future Ask explanations). **Resolution:** `extractNameTokens`
    (non-stopword unigrams + adjacent bigrams) → **two parameterized, indexed** lookups (exact `normalized_name`;
    `aliases` overlap), owner + workspace scoped → `matchPeopleByTokens` (exact name beats alias; deduped). **Linked
    retrieval:** links → memory ids (`order created_at desc`, capped, deterministic) → memories re-fetched
    `eq(user_id=owner)` + `eq/is(memory_profile_id)`.
  - **Ranking rule:** person-linked memories get `PERSON_RANK_BOOST = 2` added to their blended score (which is
    `<= 1.0`), so a linked memory **always ranks above** every non-linked one while **both still appear** — a boost,
    **never a hard filter**. With no resolved people the boost set is empty → identical to the standard order
    (existing retrieval unchanged).
  - **Safety:** read-only (no create/update of people/links/extraction); **authenticated owner client** (RLS), never
    service role; **no AI/embeddings/OpenAI**; person resolution + memory retrieval are owner + workspace scoped, so
    personal "Dad" and care "Dad" stay distinct and people never resolve across users/workspaces. **GDPR unchanged**
    (no schema/state; `delete_user_account` already purges people/links). No duplicate memories (union deduped by id).
  - **Validation:** 14 pure unit tests pass — token extraction (incl. stopword filtering, bigrams), A (Dad by name),
    B (Father by alias → same person), name-beats-alias dedupe, no-substring match, boost (linked > perfect non-linked,
    both appear), E (person-less == `rankRecords`). **Adversarial review (2-agent): both PASS** — every break attempt
    (cross-workspace/cross-user resolution, link leakage, duplicates, ranking corruption, N+1, token-injection)
    **blocked-safe**; only **minor** findings, fixed (strict boost; deterministic link order) or documented. Lint
    0 new (4/160), build ✓, server-only (no client-bundle leak). *Live DB scoping tests (C/D isolation) are operator-run
    — no DB here; scoping verified statically + by the owner+workspace `.eq` on every query.*
  - **Known limitations (C-phase candidates):** (a) name detection is unigram+bigram — 3+ word names ("Mary Jane
    Smith") aren't matched as one token; (b) relationship-word resolution ("who is my father") works only if that word
    was a stored alias/name (role-based resolution is a future phase); (c) the active workspace comes from a
    client-set cookie — safe here because **every** query pins `owner = auth.uid()` (the load-bearing discriminator).
  - **Future C4 dependencies:** `matchedPersonIds`/`matchedPersonNames` (explanations), `mention_count`/co-occurrence
    over `memory_person_links` (relationship metrics); wiring `retrievePersonAware` into Ask is a deliberate later step
    (keep the owner `.eq` on every query when doing so).
- **Phase C2 — Person Extraction Foundation** (extraction **only**; no retrieval/Ask/relationship/UI). Grounded person
  mentions are persisted into `people` + `memory_person_links` as a **best-effort cognition task** that never blocks or
  fails memory creation.
  - **Files:** **`lib/build-people.ts`** (new) — `buildPeople(memoryId, content, ownerAccountId, memoryProfileId,
    prefetchedPeople?)` + the pure `groundPeople` gate. **`lib/ai-memory.ts`** — `MemoryInsightResponse` extended with
    `people: ExtractedPerson[]` (`{name, role?, mention, confidence}`), `sanitizePeople`, person-only prompt. **`lib/remy/
    retrieval.ts`** — exports `norm` + `containsWord` (reused for grounding). **`app/api/memories/create/route.ts`** —
    `buildPeople` wired as a 3rd cognition task via `Promise.allSettled`, passed `ai?.people ?? []` (**no 2nd AI call**).
  - **Extraction flow:** create → enrich (existing `generateMemoryInsights`, now returns `people`) → after insert, the
    cognition task: **grounding gate** (keep only candidates whose `mention` is a verbatim, **word-bounded** substring of
    content via `containsWord`; dedupe by normalized name) → **resolve/create person** (by `(owner, workspace,
    normalized_name)`; `normalized_name` is trigger-derived, never set here; 23505 re-resolve for races) → **add alias**
    (lowercased surface form, dedup) → **link** (`upsert onConflict(memory_id,person_id) ignoreDuplicates`) → **recompute**
    `mention_count` (= count of links) + `max_mention_confidence` (monotonic).
  - **Merge policy:** same normalized name folds onto one person (aliases accumulate); different normalized names
    ("John" vs "John Smith") stay **separate** (no bare-name auto-merge); cross-owner/workspace merge impossible by
    construction (resolve scoped by `created_by_account_id` + `memory_profile_id`).
  - **Safety:** runs as the **authenticated owner** (`createClient`, never service role); writes satisfy C1 RLS
    (owner-write + link requires person-owner + memory-author + same workspace); **never throws** (outer + per-candidate
    try/catch); AI is **untrusted** (grounding re-validates server-side); **GDPR `delete_user_account` unchanged** — C2
    adds no schema; people/links cascade off memories/auth.users and the C1 collision-safe re-own already handles them.
  - **Validation:** `groundPeople` unit tests **9/9** ("Galway/Dad/Mary" → Dad+Mary, drops hallucinated Sarah; "I had a
    great day" → none; word-boundary: `dad`∌`daddy`, `mary`∌`rosemary`; dedupe; multi-word). **Adversarial review (2-agent):
    both PASS** (grounding/idempotency/retry; RLS/isolation/integration/GDPR) — only **minor** findings, addressed/
    documented. Lint 0 new (4/160), build ✓, client-bundle clean (server-only). *Note: live AI extraction not executed
    here — no `OPENAI_API_KEY`/DB; the grounding gate + idempotency are deterministically verified.*
  - **Known minor limitations (C-phase hardening candidates, no corruption):** (a) locale casing — `norm` (JS toLowerCase)
    vs trigger `lower(btrim())` can differ for Turkish İ / Greek final sigma → a rare non-Latin name may get a skipped
    link (never a duplicate); (b) cached aggregates are eventually-consistent (links authoritative); (c) caregiver-authored
    memories in a non-owned profile get no people (people-write is owner-only) — intentional; relax the write policy if needed.
  - **Backfill plan (Deliverable #7 — DOCUMENTED, not implemented):** an **operator** script/admin job reusing `buildPeople`:
    iterate memories **per owner, per workspace**, oldest→newest in `created_at` pages (reuse the `RETRIEVAL_CAP` paging
    idiom), calling `buildPeople(id, content, owner, memory_profile_id)` **without** `prefetchedPeople` (it extracts fresh)
    — or the deterministic-only path for $0. **Idempotent** (unique constraints + 23505 re-resolve + link upsert), so safe
    to re-run/resume. **Failure handling:** per-memory try/catch (parity with the live task); log + continue; a repair pass
    targets memories with zero links. **Progress tracking:** a checkpoint (last processed `created_at`/id). **Cost:** prefer
    the deterministic extractor for backfill; reserve AI extraction for new memories. **Run as the owner** (RLS), never service role.
- **Phase C1 — People Intelligence Schema Foundation** (DB foundation **only**; migration committed, **NOT applied — operator step**).
  Net-new schema for future People Intelligence. **No extraction, no retrieval, no Ask Remy/UI changes** (those are C2–C5).
  Conforms to verified conventions; preserves every Ask Remy invariant (nothing in the runtime was touched).
  - **Migration:** `supabase/migrations/20260615120000_people_intelligence_foundation.sql` (additive, idempotent
    `if not exists`). **Apply in the Supabase SQL editor after review** — the app does not run migrations.
  - **`people`** (one individual **per workspace**): `id, created_at, updated_at, created_by_account_id`
    (→auth.users, cascade), `memory_profile_id` (→memory_profiles, cascade; **NULL = My Nest / personal**),
    `display_name, normalized_name, aliases text[], role, mention_count, max_mention_confidence, status,
    merged_into_person_id` (→people, set null). **Profile-scoped only — no global/hybrid identities.**
  - **Dedupe (the NULL fix):** **two partial unique indexes** — `people_uq_personal (created_by_account_id,
    normalized_name) WHERE memory_profile_id IS NULL` + `people_uq_care (created_by_account_id, memory_profile_id,
    normalized_name) WHERE memory_profile_id IS NOT NULL` (a single composite would let NULL personal rows duplicate).
  - **`memory_person_links`** (the grounding bridge): `id, created_at, memory_id` (→memories, **cascade**),
    `person_id` (→people, **cascade**), `matched_text, source`; `unique(memory_id, person_id)`. FK cascades ⇒ no orphans.
  - **RLS (mirrors `20260608180000_caregiver_authz_rls.sql`):** owner write (`created_by_account_id = auth.uid()`);
    read = owner **or** accepted caregiver (`profile_relationships.invite_status='accepted'` + `caregiver_account_id`).
    Personal rows (NULL profile) are owner-only. Links scope through their parent person (same predicate). Extraction
    (C2) **must** run as the authenticated owner (`createClient`), never the service role (which bypasses RLS).
  - **GDPR (`delete_user_account` re-created, 3 `[C1]` blocks, all prior logic preserved):** (2b) **re-own** the
    departing user's people in profiles owned by others (incl. just-transferred) to that profile's owner — so person
    data on transferred/tombstoned memories isn't cascade-deleted with the auth.users row (mirrors memory tombstoning);
    (step 3) delete the user's own links + people (personal + sole-owned); (step 7) clear sole-owned-profile links +
    people before profile delete. No orphans; transfer/tombstone/contributed paths respected.
  - **Validation:** SQL tooling (supabase/psql) is **absent in this environment**, so the migration was **not applied
    and runtime RLS/GDPR tests were not executed here** — that is an operator step. Statically verified: structure
    (2 tables, 2 partial unique idx, 7 policies, 2 RLS enables, RPC re-create), FK cascades, the accepted-caregiver
    predicate matches the GDPR RPC, and the RPC re-create preserves all original logic. App unaffected: lint 0 new
    (4/160), build ✓. **Operator validation suite** (run post-apply): (a) personal dup `Dad` rejected by
    `people_uq_personal`; (b) care dup rejected by `people_uq_care`; (c) same `Dad` allowed across personal vs care
    (isolation); (d) caregiver can SELECT but not INSERT a care person; cross-account read returns 0; (e) `delete_user_account`
    on a multi-workspace fixture leaves 0 orphan people/links and preserves a transferred profile's people; (f) deleting a
    memory cascades its links.
  - **Pre-C2 remediation (adversarial audit + independent re-verify; folded into the still-unapplied migration):**
    **#1 (HIGH, GDPR)** the `[C1]` re-own is now **collision-safe** — re-point colliding links → delete duplicate →
    re-own the rest, so it can never raise a `people_uq_care` violation that rolls back `delete_user_account` (a
    shared-workspace deletion-failure bug); the transfer path can legitimately create duplicates, so this is
    load-bearing. **#2 (HIGH, RLS)** `people` INSERT/UPDATE now require the writer **own** the target workspace
    (personal Nest or an owned care profile) — no cross-profile row planting. **#3 (MED, RLS)** `memory_person_links`
    INSERT now requires the caller **own the person AND author the memory AND** they share a workspace — blocks
    fabricated cross-workspace/cross-account grounding edges (incl. the personal-Nest hole the re-verify caught).
    **#4 (LOW)** `normalized_name` is now **auto-derived by a trigger** (`people_set_normalized_name`) so the dedupe
    key can't desync. Re-verified: GDPR re-own is collision-free / loses no surviving links / no survivor deletion /
    idempotent; planting + cross-workspace links blocked; owner writes + caregiver reads intact; **0 new issues**.
    Validated statically (no `supabase`/`psql` here — apply + RLS/GDPR runtime tests remain operator steps): lint
    0 new (4/160), build ✓. **Operator validation suite (run post-apply):** the original suite PLUS — (g) deletion of
    an owner whose successor caregiver also recorded the same person succeeds with links folded onto the survivor;
    (h) a non-owner INSERT into another profile is rejected; (i) a cross-workspace `memory_person_links` INSERT is rejected.
  - **Remaining Phase C roadmap:** C2 Person Extraction (verbatim-mention cognition task + backfill; note people-write
    is owner-only, so extraction links the owner's own-authored memories — relax the write policy if caregiver-authored
    extraction is later required), C3 Person Retrieval (`extractPeopleQuery` → hard pre-ranking scope), C4 Relationship
    Intelligence (derived metrics), C5 Companion Features.
- **Ask Remy Intelligence V1.4 — Conversational Memory M1** (Phase D of the Companion roadmap; **client-side only, no schema/persistence/server session**).
  Enables grounded follow-ups ("tell me more", "what happened after that?", "what else?") while preserving
  every invariant: **retrieval runs every turn** (history never becomes a fact source), no-AI-on-empty,
  `PROMPT_SAFETY_PREAMBLE`, and active `memory_profile_id` scoping (all unchanged).
  - **`lib/remy/ask-intent.ts`** — `RemyConversationTurn {role,text}`; `isFollowUp` (anchored phrase patterns —
    "tell me more about Galway" is NOT a follow-up); `resolveAskTurn(text, anchor)` (pure, **shared by the
    component + tests**): follow-up→reuse anchor (`mode QUESTION`); own→extract+classify; else→none. Every
    "memory" result carries a real `RetrievalQuery`, so retrieval can't be bypassed. `buildHistoryMessages`
    (bounded: last `MAX_CONVERSATION_TURNS=6`, assistant ≤200 chars, user ≤500, whitespace-collapsed, empties dropped).
  - **`lib/remy/ask-intelligence.ts`** — `answerAskQuestion(question, context, mode, history=[])` inserts
    `...buildHistoryMessages(history)` **between** the system prompt and the user message; the Memories block is
    still built ONLY from freshly-retrieved records. `GROUNDING_SYSTEM` adds an explicit rule: history is for
    interpreting follow-ups, retrieved memories are the **only** source of facts.
  - **`app/(app)/remy/ask-action.ts`** — `answerAskRemy(question, query, mode, options?{history, retrievalText})`.
    For follow-ups the client passes the prior topic as `retrievalText` so the **fresh** retrieval is about that
    topic. All guards unchanged (workspace scope, no-AI-on-empty at the same line).
  - **`components/remy/RemyAsk.tsx`** — client transcript (`entries` + `anchor` via `useState`, **no persistence**);
    `resolveAskTurn` drives each turn; `deriveHistory` builds bounded prior turns; "New conversation" reset;
    per-answer `AIDisclaimer`; double-submit guard retained. No-anchor follow-up shows a notice, never calls AI.
  - **Reviewed:** 2-agent adversarial workflow → **PASS** (grounding + constraints/isolation; 0 real defects, only
    cosmetic notes since fixed). 33 unit tests (isFollowUp / resolveAskTurn anchor-reuse / buildHistoryMessages
    bounds). Client-bundle clean (RemyAsk + ask-intent are openai-free). Validated: lint 0 new (4/160), build ✓
    (`/remy` 5.65 kB). **M2 (durable server-persisted sessions) deferred** — operator schema, not in scope.
- **Ask Remy Intelligence V1.3 — hybrid semantic retrieval** (Phase A of the Companion roadmap; additive, **no schema/RPC change**).
  Semantic recall becomes the **primary** mechanism; the deterministic engine remains the **fallback floor**.
  Preserves every guarantee: retrieval-before-generation, no-AI-on-empty, `PROMPT_SAFETY_PREAMBLE`, and
  active `memory_profile_id` scoping (non-negotiable).
  - **Pattern reuse:** mirrors the production-proven post-filter in `app/api/memories/search/route.ts:265-340`
    (RCA at this file's "Search" notes): `match_memories` is used **only for vector ranking** (it is
    account-scoped and cannot scope to a workspace); candidate ids are **re-fetched scoped by the active
    `memory_profile_id`** (`.eq`/`.is`, identical to the deterministic path), dropping every out-of-workspace row.
  - **`lib/remy/semantic-retrieval.ts`** (new, **server-only**) — `semanticRetrieveScoped` (embed → rank →
    workspace re-fetch with `similarity` attached) + `retrieveAskRecordsHybrid` (runs semantic **and**
    deterministic via `Promise.all`, then merges). Imports the OpenAI-backed `embeddings` client, so it is
    imported **only** by the `"use server"` action — never by a client component (verified: no client-bundle
    leak; build green).
  - **`lib/remy/retrieval.ts`** — `MEMORY_SELECT_FIELDS` exported (+ `created_at`); `MemoryRecord` gains
    `created_at`/`similarity`; **pure, unit-tested ranking** added: `recencyScore` (5-yr half-life so old life
    memories aren't buried), `metadataScore`, `blendedScore` (0.65·similarity + 0.20·recency + 0.15·metadata),
    `rankRecords`, and `mergeAndRankCandidates` (hard year/decade filter on semantic; union+dedupe with
    semantic winning; deterministic-only rows get `similarity 0`; returns `[]` when both empty).
  - **`app/(app)/remy/ask-action.ts`** — `answerAskRemy` swaps `retrieveAskRecords` → `retrieveAskRecordsHybrid`
    (passes the raw question for embedding + `user.id`). All guards unchanged (no-AI-on-empty at the same line).
  - **Coverage:** memories without embeddings (legacy / failed write) are invisible to `match_memories`, so the
    hybrid **unions** with the deterministic engine — keyword/metadata hits still surface (`similarity 0`).
    Category/tag stay **soft** (shape ranking, never exclude); only absolute year/decade hard-filters semantic.
  - **Entitlement:** Ask Remy stays available to all users (not premium-gated) per the approved roadmap default —
    the deterministic fallback guarantees Ask always works; if gating is wanted later, gate only the semantic branch.
  - **Validated:** 26 unit tests (ranking/recency/metadata/merge/dedupe/year-filter/fallback/isolation-merge) pass;
    workspace re-scope clause matches the prod-verified pattern; client-bundle clean; lint 0 new (4/160); build ✓
    (`/remy` 5.02 kB). **Operator (optional, later):** a `match_memories_scoped(... memory_profile_id_input)` RPC
    removes the over-fetch recall caveat — SQL drafted in the roadmap; not required for V1.3.
- **Ask Remy Intelligence V1.2 — mood/sentiment-aware context** (Phase B of the Companion roadmap; additive, no schema).
  Surfaces the **existing** emotional enrichment to grounded answers. Preserves all guarantees
  (grounded-only, retrieval-before-generation, no-AI-on-empty, workspace scoping, non-clinical).
  - **`lib/remy/retrieval.ts`** — `SELECT_FIELDS` + `MemoryRecord` now include `ai_mood`/`ai_sentiment`/
    `ai_emotional_weight` (existing columns, written at create-time); `matchesQuery` adds **`ai_mood`** to
    the free-text haystack so emotion words match a memory's recorded mood (verified: text "joyful" →
    memory with `ai_mood:"joyful"`). Sentiment/weight (likely scores) are intentionally **not** searchable.
  - **`lib/remy/ask-intelligence.ts`** — `buildAskContext` appends a `Recorded tone: <mood, sentiment>`
    line **only when present**; `GROUNDING_SYSTEM` gains a **non-clinical** instruction: reflect a memory's
    recorded tone using its own framing, **never infer/score/diagnose** mood/mental-health/cognition.
    `PROMPT_SAFETY_PREAMBLE` unchanged.
  - **Scope note:** mood-aware *answering* ships now; mood/sentiment-based *retrieval ranking* (e.g.
    "happiest memories") is deferred — it needs the `ai_sentiment`/`ai_emotional_weight` value vocabulary
    confirmed in the SQL editor (operator). Validated: lint 0 new (4/160), build ✓ (`/remy` 5.02 kB).
  - **Companion roadmap (designed, not yet implemented):** A) hybrid semantic retrieval, C) people/
    relationship intelligence (needs schema migration — operator), D) conversational memory — see the
    Companion Readiness Review in the session report.
- **Ask Remy Intelligence V1.1 — hardening pass** (smallest-possible pre-ship pass over V1; no redesign).
  Fixes the production-readiness audit's verified failures and adds the required AI disclaimer. All changes localized;
  grounding invariants untouched (retrieval-before-generation, no-AI-on-empty, workspace scoping, safety preamble).
  - **AI disclaimer (compliance):** `RemyAsk.tsx` now renders `<AIDisclaimer kind="memoryChat" variant="footnote" />`
    under every grounded answer (parity with `/memory-chat`; closes the missing-disclaimer gap on a healthcare AI surface).
  - **Double-submit guard:** the Ask button is `disabled` while loading and `onSubmit` early-returns during "loading"
    (each answer is a paid LLM call).
  - **Extraction fixes** (verified via the 7-query probe): the fallback now takes the **last** content word, not the first
    (`ask-intent.ts` — the subject trails the cue): "When did I visit **Dublin**?" → `{category:"dublin"}` (was `"i"`);
    "Summarize my relationship with **Mary**" → `{category:"mary"}` (was `"relationship"`); "before I **moved house**" →
    `{category:"house"}`; "after **retirement**" → `{category:"retirement"}`. `ask-retrieval.ts` adds **involve(s)/involving**
    as a text cue ("What memories involve **hospitals**?" → `{text:"hospitals"}`, was `{category:"what"}`) and adds the
    question-words (what/when/where/why/how/who/whose/which) to `TERM_STOPWORDS` so `"{word} memories"` can't yield a
    question word.
  - **Word-boundary matching** (`retrieval.ts` `containsWord`): the free-text tier is now token-aware — `"son"` no longer
    matches "person"/"reason", `"mary"` no longer matches "rosemary". Category/tag/year/decade matching and all other
    retrieval semantics (AND, fields, case-insensitivity, cascade, empty handling) are **unchanged**; only the text tier
    moved from raw substring to bounded-token.
  - **Validated:** 7-query probe all corrected (before: 6/7 broken → after: 4 verified-fixed, "happiest"/"son" improved at
    the noun/match layer), no regression on the original success criteria, lint 0 new (4/160), build ✓ (`/remy` 5.02 kB).
    **Still V2 (not in scope):** semantic/embedding retrieval, `ai_mood`/`ai_sentiment` in context, conversation memory,
    entity model, markdown rendering.
- **Ask Remy Intelligence V1 — first grounded LLM answer layer** (`/remy`; completes the pipeline at **… → Retrieval → Intelligence**).
  Reuses the **existing** Remy AI infra (the `openai` client, `gpt-4o-mini`, shared `PROMPT_SAFETY_PREAMBLE`) fed by the
  **deterministic** Retrieval Engine — no new provider/stack, no embeddings. Committed as a **V1 checkpoint**; a **V1.1
  hardening pass** (disclaimer + extraction fixes + word-boundary match + submit guard) lands before ship.
  - **`lib/remy/ask-intent.ts`** (new, pure/client-safe) — `classifyAskIntent` (RETRIEVE/QUESTION/SUMMARY) + `extractAskQuery`
    (scopes which memories feed the answer; returns null for navigation phrasings so they fall through to `resolveRemyIntent`).
  - **`lib/remy/ask-intelligence.ts`** (new, server) — `buildAskContext` (pure; ≤8 memories × 600 chars) + `answerAskQuestion`
    (grounded gpt-4o-mini, temp 0.3, 30s timeout; `GROUNDING_SYSTEM` + safety preamble; answer **only** from supplied memories).
  - **`lib/remy/retrieval.ts`** (refactor) — extracted `matchesQuery`/`hasAnyFilter`/`toRetrievalResult`; added
    `retrieveMemoryRecords` (rich records w/ content+summary for the LLM); `retrieveMemories` delegates (behavior preserved,
    parity runtime-tested). **`ask-retrieval.ts`** gained `retrieveAskRecords` (cascade on records) + `mention(s)` parsing.
  - **`app/(app)/remy/ask-action.ts`** (`"use server"`) — `answerAskRemy`: getUser + `resolveActiveProfileId` (workspace
    scoping) → retrieve first → **no AI call when retrieval is empty** → buildAskContext → answerAskQuestion; safe fallback.
  - **`components/remy/RemyAsk.tsx`** — extract → classify → RETRIEVE lists candidates / QUESTION+SUMMARY grounded answer;
    navigation preserved. Grounded, workspace-scoped, no fabrication, no retrieval bypass.
  - **Reviewed:** 8-dimension adversarial workflow → **0 confirmed findings** (2 dims self-verified). Validated: lint 0 new
    (4/160), build ✓ (`/remy` 4.31 kB). **Known V1 limits (V1.1/V2):** keyword-only retrieval (~30% NL coverage), no AI
    disclaimer in UI, substring matching false positives — addressed in V1.1.
- **Ask Remy Retrieval Integration V1 — Ask now retrieves real memories** (deterministic; wires Ask → Retrieval Engine).
  Completes the pipeline at **… → Ask → Retrieval**. NOT AI/semantic/embeddings/vector/RAG/summaries/
  answer-generation — only factual memory candidates.
  - **`lib/remy/ask-retrieval.ts`** (new) — `parseRetrievalQuery(text): RetrievalQuery | null` (pure,
    deterministic regex+stopwords; precedence decade → year → "about X"=text → "tagged X"=tag →
    "{X} memories"=category; else null) + `retrieveAskResults(supabase, query, memoryProfileId)` which
    runs `retrieveMemories` and **broadens a bare category term** deterministically (category → tag →
    text, first non-empty tier — since a free word can't be known to be a category vs tag).
  - **`app/(app)/remy/ask-action.ts`** (new, `"use server"`) — `askRemyRetrieval(query)`: `getUser` +
    `resolveActiveProfileId` (workspace scoping) → `retrieveAskResults`. Query fields are used only by
    `filterMemories` (pure JS), never interpolated into SQL.
  - **`components/remy/RemyAsk.tsx`** (updated) — on submit: **parse retrieval FIRST** (so "travel
    memories" isn't caught by the "memories" nav keyword) → server action → list candidates
    (title + (year), linking to `/memories/[id]`) or "No matching memories found."; else
    `resolveRemyIntent` → navigate (unchanged); else "Remy doesn't know how to help with that yet." No
    generated text/summaries/chat/streaming; client/server boundary clean (pure parser + server action,
    no server runtime in the client bundle).
  - **Verified:** parser passes 9 runtime assertions (incl. all 5 spec examples); the Retrieval Engine
    passed its 8 tests. Adversarially reviewed (4-agent ultracode workflow): **0 findings**. Validated:
    lint 0 new (4/160), build ✓ (`/home`, `/dashboard`, `/remy` 3.67 kB, `/search`, `/memories`).
    Risk: single-filter parse (a year wins over a co-mentioned category); multi-filter parse is a follow-up.
- **Remy Memory Retrieval Engine V1 — deterministic retrieval** (foundation for Ask Remy V2).
  Returns memory CANDIDATES from existing metadata/dates; does not generate answers. NOT AI/embeddings/
  semantic/vector/RAG/LLM.
  - **Audit:** real retrievable columns confirmed — title, content, ai_title, ai_summary, ai_category,
    `ai_tags` (string[]), memory_date. No people/location fields (not fabricated).
  - **`lib/remy/retrieval.ts`** (new) — `RetrievalQuery {text?, category?, tag?, year?, decade?}` →
    `RetrievalResult {memoryId, title, memoryDate?, category?}`. **`filterMemories(rows, query)`** is a
    pure deterministic AND-filter: text (case-insensitive substring over title/content/ai_title/
    ai_summary/ai_category), category (`ai_category` case-insensitive exact), tag (`ai_tags`
    case-insensitive membership), year (`memory_date` year ===), decade (`floor(year/10)*10` ===); no
    filter → []; unmatched → [] (no fabrication). `retrieveMemories` / `getRetrievalHealth` are
    workspace-scoped loaders (most-recent N by `created_at`, cap 2000, deterministic order).
    `buildRetrievalHealth` reuses `buildSearchHealth` counts (no duplication).
  - **Not mounted** — a standalone engine (the retrieval foundation for Ask Remy V2); all surfaces
    untouched.
  - **Phase 5 tests:** 8 runtime assertions PASS against the real `filterMemories` (category/tag/year/
    decade/text/AND/empty/unknown). Adversarially reviewed (6-agent ultracode workflow): 2 confirmed
    (major) — `.limit()` without `.order()` was non-deterministic beyond the cap. **Fixed** by adding
    `.order("created_at", desc)` to both loaders + documenting the sampling cap. Validated: lint 0 new
    (4/160), build ✓ (`/home`, `/dashboard`, `/remy`, `/search`, `/memories`).
- **Remy Memory Search V1 — deterministic discoverability + search-health** (foundation for future retrieval).
  Makes stored memories reliably findable and reports factual corpus health. NOT AI/semantic/embeddings/
  vector/RAG.
  - **Audit:** the global keyword search (`/api/search/global`) matched memories on
    `title/content/ai_title/ai_summary` (ILIKE, workspace-scoped) — it **selected but didn't search
    `ai_category`** (gap). No dedicated people/location memory fields exist (so those metrics are not
    fabricated). Real searchable columns confirmed: title, content, ai_title, ai_summary, ai_category,
    ai_tags, memory_date.
  - **Search improvement (Phase 4):** added **`ai_category` ILIKE** to the global search `.or()` — users
    can now find memories by category. Input is still sanitized before the `.or()`; scoping unchanged.
    (Partial `ai_tags` array matching deferred — documented gap.)
  - **`lib/remy/search-health.ts`** (new) — `buildSearchHealth(rows)` (pure deterministic counts:
    searchable/dated/categorized/tagged + missing + percentages) and `getSearchHealth(supabase,
    memoryProfileId)` (workspace-scoped loader, cap 5000). Counts only; no AI/scoring/inference.
  - **`components/remy/RemySearchInsights.tsx`** (new) — a small factual readout ("N memories · X%
    searchable by date · N categorized · N tagged · N missing dates/categories"). Facts only, no
    coaching/recommendations; renders nothing when empty. Mounted **above SearchView on `/search`**
    (SearchView untouched).
  - Adversarially reviewed (4-agent ultracode workflow): **0 findings**. Validated: lint 0 new (4/160),
    build ✓ (`/home` 1.14 kB, `/dashboard` 9.95 kB, `/remy` 2.8 kB, `/search` 5.04 kB, `/memories` 12.3 kB).
    Risk: health counts sample up to 5000 memories (documented); `ai_tags` partial search + date-range
    search in the global endpoint are follow-ups.
- **Remy Ask V1 — deterministic intent router** (`/remy`; Remy's first interactive entry point).
  Completes the pipeline at **… → Coach → Ask**. NOT AI/chat/semantic search/RAG/embeddings/retrieval.
  - **`lib/remy/ask.ts`** (new) — a fixed **registry** of 14 `RemyIntent {id,label,href,keywords}` (real
    destinations only — all 18 audited routes verified to exist) + `buildRemyAsk()` + `resolveRemyIntent
    (query)`. The resolver lowercases, flattens punctuation, and matches each keyword as a **whole
    word/phrase** (token-bounded); first match in registry order (specific → generic) wins; empty/unknown
    → null. Deterministic — no substring/fuzzy/semantic matching, no scoring/ranking, no AI/queries.
  - **`components/remy/RemyAsk.tsx`** (new, client-only) — input + submit → `resolveRemyIntent` →
    `router.push(href)` on a hit, or the fixed message "Remy doesn't know how to help with that yet." on
    miss; suggestion chips route directly. No backend, no generated text, no chat/history/streaming/
    retrieval.
  - **Mounted in `/remy` below Coach** (Home, Conversation, Actions, Journeys, Coach, Dashboard
    untouched).
  - Adversarially reviewed (6-agent ultracode workflow): 2 confirmed — over-broad keywords `"book"`
    (matched "facebook") and `"dating"` (matched "dating app") substring-misrouted. **Fixed** by
    switching the resolver to whole-word/phrase matching + dropping the ambiguous standalone keywords
    (`book`, `dating`, `bio`; tightened `capture`→`capture a memory`) — also resolving latent collisions
    ("history"⊃"story", "candidates"⊃"dates"). Validated: lint 0 new (4/160), build ✓ (`/home` 1.14 kB,
    `/remy` 2.8 kB, `/dashboard` 9.95 kB).
- **Remy Memory Coach V1 — deterministic guidance layer** (`/remy`; selection over coverage/maturity facts).
  Completes the pipeline at **… → Journeys → Coach**. Creates nothing — selection only.
  - **`lib/remy/coach.ts`** (new) — `buildRemyCoach({coverage, lifeJourney, story?})` → `RemyCoach
    {items[]}`, each `{title, detail, status: "healthy"|"growing"|"attention", href}`. Pure deterministic
    selection of existing facts via documented thresholds: **Memory dating** (`coverage.total>0`;
    %≥80 healthy · 50–79 growing · <50 attention → `/memory-dates`); **Life timeline**
    (`lifeJourney.hasTimeline`; ≥3 decades healthy else growing → `/timeline`); **Life story**
    (`story.hasStory`; `narrativeCoverage==="developed"` healthy else growing → `/library/story`). No
    AI/LLM/embeddings/inference/new signals/observations/lenses/queries/ranking. Each item appears only
    when its supporting data exists (timeline gated on `hasTimeline` so single-care workspaces don't get
    a misleading "attention").
  - **`components/remy/RemyCoach.tsx`** (new) — coach cards (title · detail · status badge · link);
    consumes the model directly; returns null when empty (no placeholders/fabricated advice).
  - **Mounted in `/remy` below Journeys** (Home, Conversation, Actions, Journeys, Dashboard untouched).
    No new query (built from the already-loaded home model).
  - Adversarially reviewed (4-agent ultracode workflow): **0 findings**. Validated: lint 0 new (4/160),
    build ✓ (`/home` 1.15 kB, `/remy` 1.15 kB, `/dashboard` 9.95 kB).
- **Remy Journeys V1 — narrative destinations layer** (`/remy`; selection over story/life-journey outputs).
  Extends the pipeline to **… → Actions → Journeys**. Creates nothing — selection only.
  - **`lib/remy/journeys.ts`** (new) — `buildRemyJourneys({story?, lifeJourney, understanding})` →
    `RemyJourneys {journeys[]}`, each `{title, description, href, status}`. Pure deterministic selection:
    one journey per **available** narrative output — **Life Journey** (`hasTimeline` → `/timeline`),
    **Your story** (`hasStory` → `/library/story`), **Biography** (`hasBiography` → `/library/biography`),
    **Memory book** (`hasMemoryBook` → `/library/memory-book`). `status` (ready/growing) derived from
    existing signals (`documentedDecadeCount`, `narrativeCoverage`). No generation/inference/new scoring.
    `understanding` accepted but reserved (future theme/relationship journeys).
  - **`components/remy/RemyJourneys.tsx`** (new) — journey cards (title · description · status badge ·
    link to the existing destination); consumes the model directly; returns null when empty (no
    placeholders/fabricated content).
  - **Mounted in `/remy` below Actions** (Home, Conversation, Actions, Dashboard untouched). No new query
    (built from the already-loaded home model).
  - Adversarially reviewed (4-agent workflow): **0 findings**. Validated: lint 0 new (4/160), build ✓
    (`/home` 1.15 kB, `/remy` 1.15 kB, `/dashboard` 9.95 kB).
- **Remy Actions V1 — structured action layer** (`/remy`; selection over existing CTAs).
  Extends the pipeline to **… → Conversation → Actions**. Creates nothing — selection only.
  - **`lib/remy/actions.ts`** (new) — `buildRemyActions({voiceLines, briefing, excludeHref?})` →
    `RemyActions {primaryAction, secondaryActions[], actionCount}`. Pure deterministic selection of the
    CTAs that already exist on the (already ranked) voice lines: primary = `briefing.nextAction`
    (highest-ranked CTA); secondaries = remaining CTAs in their existing order, deduped by href. No new
    ranking/scoring/inference/AI.
  - **`components/remy/RemyActions.tsx`** (new) — renders the primary action (+ its context) and the
    secondary actions; consumes the model directly; returns null when there are no actions (no
    placeholders/fabricated actions).
  - **Mounted in `/remy` below the conversation** (Home + Conversation untouched).
  - Adversarially reviewed (5-agent workflow): 1 confirmed (minor) — Actions' primary duplicated the
    Conversation's `featuredCTA`. **Fixed**: added `excludeHref` and pass `conversation.featuredCTA.href`
    so Actions complements (promotes the next-ranked CTA) instead of repeating it. Validated: lint 0 new
    (4/160), build ✓ (`/home` 1.15 kB, `/remy` 1.15 kB, `/dashboard` 9.95 kB). Follow-up: consolidating
    the featured CTA across Briefing/Conversation/Actions is a later UX call.
- **Remy Conversation V1 — dedicated companion experience** (`/remy`; presentation/composition only).
  Extends the pipeline to **… → Voice → Briefing → Home → Conversation**. Creates nothing — selection only.
  - **`lib/remy/home-model.ts`** (new) — `buildRemyHomeModel(supabase, userId)` centralizes Home's
    existing composition (workspace understanding · story/life-journey signals · observation bridge ·
    voice · briefing) into one shared, canonical place. **Home was refactored to consume it** (UI/sections
    byte-identical — not a redesign), so `/home` and `/remy` share one composition with **no duplication**
    and **no new query types** (same loaders/limits).
  - **`lib/remy/conversation.ts`** (new) — `buildRemyConversation({understanding, voiceLines, briefing})`
    → `RemyConversation {openingMessage, featuredObservation, featuredCTA, suggestedTopics[],
    quickActions[]}`. Pure deterministic **selection**: openingMessage = briefing.headline;
    featuredObservation = voiceLines[0]; featuredCTA = briefing.nextAction.cta; suggestedTopics = the
    distinct understanding-facet lenses (existing topics only); quickActions = a static set of existing
    app routes. No generation/summarization/inference/ranking change/AI.
  - **`components/remy/RemyConversation.tsx`** (new) + **`app/(app)/remy/page.tsx`** (new) — the companion
    page: greeting + opening message + featured CTA + suggested topics + quick actions. Auth + onboarding
    gate; reuses `buildRemyHomeModel`.
  - **Routing:** `/remy` added to middleware `PROTECTED_ROUTES` (else authed users are bounced to
    `/login` — the gate-class fix from Home V2). **Home entry point** added: a single "Open conversation
    with Remy" link → `/remy` (additive; no sections removed).
  - Adversarially reviewed (4-agent workflow): **0 findings**. Validated: lint 0 new (4/160), build ✓
    (`/home` 1.15 kB, `/remy` 1.15 kB, `/dashboard` 9.95 kB). Future: conversational input/threading
    (would need a real chat layer — out of scope for this composition-only V1).
- **Remy Briefing V1 — daily intelligence composition** (presentation-only; pure selection over existing outputs).
  Extends the pipeline to **Signals → Lenses → Facets → Observations → Voice → Briefing → Home**. The
  briefing creates nothing — it selects.
  - **`lib/remy/briefing.ts`** (new) — `buildRemyBriefing({understanding, voiceLines, story?, lifeJourney?})`
    → `RemyBriefing {headline, highlights[], nextAction, mood}`. Pure deterministic **selection**:
    headline = top voice line text (`understanding.summary` empty-state fallback); highlights = next
    ranked voice lines (max 3); nextAction = highest-ranked line with a CTA; mood = lead voice mood.
    No generation/rewriting/summarization/inference/AI; **no `.sort()`** so the voice ranking is
    preserved. `story`/`lifeJourney` are accepted but **reserved** (voiceLines already encode those
    facets via the bridge).
  - **`components/remy/RemyBriefing.tsx`** (new) — renders mood-aware `RemyAvatar` + headline +
    highlights + next-action CTA; consumes the briefing directly (no logic); returns null when there's
    no headline (graceful, no fake content).
  - **Home integration:** mounted **first** on `/home` (order: Briefing → What Remy understands →
    Remy speaking → Family story → Progress → Suggested next action), built from the already-computed
    `understanding` + `voiceLines` (+ `story`/`lifeJourney`) — **no new query**. Dashboard untouched.
  - Adversarially reviewed (4-dimension workflow; 2 agents returned `findings:[]` before the run
    stalled on 2 hung agents → self-verified the remaining dimensions inline: dashboard-untouched,
    empty-states, ranking/CTA preservation — all clean, **0 confirmed findings**). Validated: lint 0 new
    (4/160), build ✓ (`/home` 1.14 kB, `/dashboard` 9.95 kB). Follow-up: briefing headline/next-action
    intentionally overlap the Voice/Next-action sections below (digest-at-top per the spec ordering);
    consolidating is a future UX call.
- **Remy Home V2 — Home becomes the primary experience** (nav + post-login routing; Dashboard stays the operational page, untouched).
  - **Navigation:** `nav-config.ts` adds **Home** (first, `mobile: primary`) and demotes **Timeline**
    primary→drawer (keeps the 3-slot mobile bar). `MobileBottomNav` rewired → Home · Dashboard · **New**
    (center) · Memories · More. Desktop (`NavLinks`) and the drawer (`MobileNavDrawer`) map their lists,
    so Home leads desktop and Timeline moves into "More" automatically. Active states via `isNavItemActive`.
  - **Routing:** post-login now lands on **/home** — `LoginClient` push `/memories`→`/home`; middleware
    authenticated-redirect `/dashboard`→`/home`. `/home` gains an **onboarding gate**
    (`profiles.onboarding_completed`→`/onboarding`). Onboarding completion + already-onboarded guard now
    redirect to **/home** (was `/dashboard`); button label "Continue to Home". New-user flow:
    login→/home→/onboarding→complete→/home (no loop). Dashboard remains directly accessible.
  - **Middleware protection fix (found by review):** the middleware only runs the auth lookup for routes
    in `PROTECTED_ROUTES`; any non-public route missing from it is bounced to `/login` even when
    authenticated. Added **`/home`, `/onboarding`, `/profiles`, `/search`** — the last two were **latent
    runtime gaps from earlier this session** (Search V2 / Profile Detail V1 routes were never added to
    `PROTECTED_ROUTES`), now closed.
  - **Polish/positioning:** `/home` header → "Home" / "Your memory companion — what Remy understands,
    and what to do next." Sections unchanged (understanding → voice → family story → progress → next
    action). **No new intelligence/lens/signal/observation/AI/query** (the onboarding gate is an auth check).
  - Adversarially reviewed (10-agent workflow): 6 findings → 2 distinct, **both fixed** (onboarding→/home
    routing; middleware protected-routes). Validated: lint 0 new (4/160), build ✓ (`/home` 1.14 kB,
    `/dashboard` 9.95 kB, `/onboarding` 0.34 kB). Risks/follow-ups: target nav ordering (Profiles/Settings
    in top nav) deferred; onboarding button styling unchanged.
- **Remy Home Migration V1** (first dedicated Remy experience; additive — Dashboard untouched).
  New **`/home`** (`app/(app)/home/page.tsx`) — pure **composition** of existing intelligence (no new
  engine/lens/signal/observation, no AI, no new query types). Flow:
  **understanding → Remy speaking → family story → progress → next action**:
  1. **What Remy understands** — reuses `RemyHomeSummary` (`buildWorkspaceUnderstanding`).
  2. **Remy voice** — reuses `RemyVoicePreview`, fed by `observationsToVoiceLines(fuseObservations(
     understanding, remyVoice(...), []))` (understanding-derived stream; no signals/reminders query).
  3. **Family story** — new `components/remy/RemyStorySnapshot.tsx`: deterministic facts from
     `StorySignals` + `LifeJourneySignals` ("Stories span N chapters", "The 1980s are the richest
     documented decade", "A memory book can be assembled"). No prose.
  4. **Memory progress** — reuses `ProfileCoverageCard` over `getDateCoverage` (dates omitted).
  5. **Suggested next step** — highest-ranked voice line with a CTA (`voiceLines.find(l => l.cta)`); no
     new scoring.
  - **Reused loaders** (no novel query types): `getActiveContext`, `getAccessibleProfiles`,
    `getDateCoverage`, `getRemyLifeChapters/Collections/Connections` (limit 12 — the "understanding
    tier", same as `/library/memory-book`; vs the dashboard's limit‑4 preview tier), conditional
    `getFamilyIntelligence`; pure `getRemyStories/Biography/MemoryBook`.
  - **Scoping:** decades + story derived for **My Nest** (account‑wide ≈ My Nest) and **family**
    (family‑wide); **deferred for a single care workspace** (account‑wide chapters aren't scoped to one
    subject) — Story Snapshot hidden there. Adversarially reviewed (7‑agent workflow): fixed the
    single‑care story incoherence (story now follows the decades deferral); kept limit 12 (conflicts
    with the same review's accuracy point; negligible over‑fetch). **Dashboard fully intact** (billing,
    invites, account status, telemetry, warnings, create‑memory, widgets, RemyCompanion all unchanged);
    `/home` not yet in nav (reachable by URL; nav/discoverability is a follow‑up). Validated: lint 0 new
    (4/160), build ✓ (`/home` 1.14 kB, `/dashboard` 9.95 kB).
- **Voice Engine V1 — presentation layer over observations** (the end of the pipeline; deterministic, no AI).
  Completes **Signals → Lenses → Facets → Observations → Voice → UI**.
  - **`lib/remy/voice-engine.ts`** (new) — `RemyVoiceLine {id, text, mood, lensId?, priority, cta?}` +
    `observationToVoiceLine` / `observationsToVoiceLines`: a **pure deterministic transform** of
    `RemyObservation[]` (copies text/mood/lensId/priority/cta verbatim, preserves priority ranking).
    No new intelligence, scoring, prose, or AI.
  - **`components/remy/RemyVoicePreview.tsx`** (new) — renders the top voice line as Remy "speaking"
    (mood-aware `RemyAvatar` + line + optional CTA); consumes `RemyVoiceLine[]` directly, no
    intelligence/signal-derivation/lens logic; the seam where future animated/spoken Remy plugs in.
  - **Dashboard (additive):** mounted beneath `RemyHomeSummary`, fed by
    `observationsToVoiceLines(fuseObservations(workspaceUnderstanding, remyVoice(...), remyObservations))`
    — so Voice speaks over the **full unified stream** (understanding-derived facets + signal-derived
    observations). **Nothing removed** (RemyCompanion, widgets, nav, understanding surfaces intact); no
    new query, no new pipeline.
  - Adversarially reviewed (3-agent workflow): **0 findings**. Validated: lint 0 new (4/160), build ✓
    (`/dashboard` 9.95 kB).
- **Memory Book V2 — presentation/assembly consumer** (Memory Book stops being an intelligence source; deterministic, no AI).
  - `lib/remy/memory-book.ts`: `MemoryBookInput` gains **optional** `lifeJourney?: LifeJourneySignals`
    + `story?: StorySignals` (public API preserved; backward compatible). Memory Book now **consumes**
    canonical signals instead of deriving readiness/span: (a) **availability gate** uses
    `story.hasMemoryBook` when provided (else the legacy biography-only gate); (b) a deterministic,
    documentation-grounded **"Life Overview"** opening section assembled from signals — documented span
    ("This story spans the 1960s–2020s, across N decades"), **richest era** (strongest decade), and
    **story readiness** (`narrativeCoverage`). No prose generation, no inference, no queries.
  - **Architecture:** `Signals → Biography → Memory Book → Voice`. Memory Book is a consumer of
    intelligence; `deriveLifeJourneySignals` / `deriveStorySignals` remain the canonical sources.
  - **Render pages** (`/library/memory-book`, `/memory-book/print`) compute both signals from the
    `chapters`/`stories` **already loaded** (decade buckets via `parseInt(chapter.id)`; `chapterCount`/
    `storyCount`/`hasBiography`) — **no new query** — and pass them in. Export
    (`buildExportDocumentFromMemoryBook`) maps the new paragraphs-only section generically.
  - **Intentional UX change (reviewed):** the Life Overview is prepended, so the renderer's default
    section shifts Introduction → Life Overview (overview-first book opening); all sections stay
    reachable via the TOC, no content lost. Dashboard unchanged (uses `Boolean(remyMemoryBook)`, passes
    no signals → identical). Adversarially reviewed (4-agent workflow): only this intentional change
    surfaced. Validated: lint 0 new (4/160), build ✓ (`/library/memory-book` 2.22 kB, `/memory-book/print` 576 B).
- **Story Lens V1 — narrative readiness engine** (the Story lens becomes canonical owner of narrative readiness; deterministic, no AI).
  - **`lib/remy/story-signals.ts`** (new) — `deriveStorySignals(input) → StorySignals` (chapterCount,
    storyCount, hasStory/hasBiography/hasMemoryBook, narrativeReady, strongestChapterTitle,
    earliest/latestYear, `narrativeCoverage: nascent|growing|developed`). Pure; thresholds nascent=0 /
    growing=1–2 / developed≥3, memory-book≥2. **Canonical narrative-signal source.**
  - **Story lens implemented** (was a `[]` stub) — emits one readiness facet sized to coverage:
    **story-ready** ("Enough chapters exist to tell {name}'s story", new kind + `ScrollText`) when
    developed, **narrative-growth** ("{name}'s story is taking shape", new kind + `Feather`) when
    growing. Derives readiness from `ctx.chapterCount` + life-journey signals — added **`chapterCount`**
    to `LensContext`/`UnderstandingInput`; Profile Detail + People pass it.
  - **Workspace** gains Story (family path only): "Stories span N life chapters / A memory book can be
    assembled" (developed) or "The family story is still growing" (growing), from `deriveStorySignals`
    over the **full family decade count** + real `getRemyStories/Biography/MemoryBook` booleans (already
    loaded — no new query). **Single-workspace story is deferred** (same as single-workspace Life
    Journey — no reliable per-workspace decade count loaded).
  - **Auto-wired** through the existing pipeline: facets bridge to observations via `observation-bridge`
    (default voicing), and render in Profile/People/Search/Dashboard via `RemyUnderstanding` /
    `RemyLensSummary` / `RemyHomeSummary` — **no renderer-specific Story code** (only two icon entries).
  - **Seam (documented):** `deriveStorySignals` is the reusable input for Story Mode (ordering),
    Biography (availability/span), Memory Book (assembly), Voice (narration). Story/Biography/Memory
    Book code **unchanged**.
  - Adversarially reviewed (6-agent workflow): fixed the single-workspace `chapterCount` undercount
    (now family-path only) and repointed the Preservation coverage facet `/library/story → /memories`
    (lens semantics; Story owns `/library/story`). No AI/LLM/embeddings. Validated: lint 0 new (4/160),
    build ✓.
- **Life Journey Lens V1** (strengthens Remy's time dimension; deterministic, no AI).
  - **`lib/remy/life-journey-signals.ts`** (new) — `deriveLifeJourneySignals(decades, birthYear, now)` →
    `LifeJourneySignals` (strongest/earliest/latest decade, documented + span decade counts, missing
    decade, early-years flag). Pure reduction over decade buckets; the **canonical time-signal source**.
  - **Life Journey lens expanded** — now emits **chapter-span** ("Memories span the 1960s–2020s",
    new facet kind + `CalendarRange` icon), **strongest-period**, and **missing-era** (the era-gap,
    **moved here from Preservation** so the time lens owns time; Preservation keeps only the
    "memories aren't dated yet" nudge). Profile Detail gains these **automatically** (it already passes
    per-person `decades` + `birthYear`) — no page/redesign change.
  - **Workspace understanding** gains Life Journey: family decade distribution now exposed as
    **`FamilyIntelligence.decades`** (additive; aggregated in the existing dated-row loop — no new
    query), passed from the dashboard → workspace facets "The 1980s are the best documented decade",
    "Most preserved memories span the 1970s–2020s", "The 1990s remain lightly documented". Single-
    workspace (no `familyIntelligence`) Life Journey is a follow-up (needs a per-workspace decade source).
  - **Phase 6 seams (documented, not built):** `deriveLifeJourneySignals` is the reusable input for
    **Story** (chapter ordering by strongest/span), **Biography** (replace ad-hoc spanStart/spanEnd),
    **Memory Book** (gap prompts), **Voice** (narrate span/strongest/missing) — see the file header.
    Story/Biography/Memory Book code **unchanged**.
  - No AI/LLM/embeddings; reuses `bucketDecades` + `findGapDecade`. Validated: lint 0 new (4/160),
    build ✓ (`/profiles/[id]` 2.7 kB, `/dashboard` 9.95 kB).
- **Remy Home Foundation V1** (proves Remy can understand the workspace/family as a whole; additive — no Dashboard migration).
  - **`lib/remy/workspace-understanding.ts`** (new) — `buildWorkspaceUnderstanding()`: deterministic
    workspace/family synthesizer returning the **same `RemyUnderstanding` shape** (so `RemyLensSummary`
    + the observation bridge work unchanged). Workspace-scoped facets owned by lenses: **relationships**
    (family network size), **themes** (most documented theme across the whole), **preservation** (total
    preserved + coverage). **No AI/LLM/embeddings.**
  - **`components/remy/RemyHomeSummary.tsx`** (new) — "What Remy understands" (workspace), rendered via
    the shared `RemyLensSummary` (grouped); optional fused-observation list (the Remy Home / Voice seam).
  - **Observation fusion** (`observation-bridge.ts`): new `fuseObservations()` merges
    understanding-derived (bridge) + signal-derived (`generateRemyObservations`) observations into one
    ranked, dedup'd stream — the architecture for Remy Home/Voice; **RemyCompanion behavior unchanged**.
  - **Dashboard integration (additive only):** `RemyHomeSummary` added near the top (after the header,
    above RemyCompanion). Built from intelligence the dashboard **already loads** (`familyIntelligence`
    totals/themes, `remyDateCoverage`, `remyCollections`, `accessibleProfiles`, `memoryCount`) — **no
    new queries**. **Nothing renamed/removed/moved** (billing, invites, account status, warnings,
    widgets, nav all intact). Validated: lint 0 new (4/160), build ✓ (`/dashboard` 9.95 kB).
- **Understanding Engine Expansion — People + Search** (proves the engine is reusable across surfaces).
  - **Shared renderer** `components/remy/RemyLensSummary.tsx` (new) — consumes a `RemyUnderstanding`
    directly; **`variant="inline"`** (one-line lens summary for rows/cards) and **`variant="grouped"`**
    (facets grouped by lens, for richer surfaces). Reusable by Profile/People/Search/Remy Home/Voice.
  - **People directory** (`/profiles`): each `PersonRow` now leads with **what Remy understands** about
    that person (inline `RemyLensSummary`) via `buildPersonUnderstanding` — no duplicated logic. Enabled
    by exposing **per-profile `themes`** on `FamilyProfileStats` (already-computed `categoryCounts`;
    additive, **no N+1** — still one `getFamilyIntelligence` call). Decade buckets aren't loaded in the
    directory, so the summary uses themes/coverage/relationship (e.g. "Family is the most documented
    theme · Your mother", or "Just getting to know Mary").
  - **Search** (`/search`): new **`AskRemy`** layer above results — Remy frames the result set in its
    voice ("Remy found 4 memories, 2 in your library and 1 person for …"), template-only, **no AI/LLM/
    embeddings**. Search stays fully functional below; replaces the old plain "No results" line.
  - Reuse points: `buildPersonUnderstanding` (People), `RemyLensSummary` (People now; Profile/Search/
    Remy Home/Voice later), `RemyAvatar` (AskRemy). **No Dashboard/nav/Remy-Home changes; no new AI.**
    `FamilyProfileStats.themes` is additive (only constructed in family.ts) so the dashboard family view
    is unaffected. Validated: lint 0 new (4/160), build ✓ (`/search` 5.04 kB, `/profiles` 1.15 kB).
- **Remy Intelligence Unification — Lenses → Observations** (internal; no UX/renderer changes).
  Completed the single pipeline **Signals → Lenses → Facets → Observations → Remy**, converging the two
  intelligence systems (`signals.ts → observations.ts → RemyCompanion` and `understanding.ts → lenses →
  RemyUnderstanding`).
  - **Lens ownership on observations:** `RemyObservation` gains optional **`lensId`**; every
    life-understanding rule in `observations.ts` is tagged (timeline/historical → `life-journey`;
    theme/collection → `themes`; caregiver invites → `relationships`; coverage/recency/growth/capture →
    `preservation`). Operational signals (reminders, presence) intentionally stay **unowned** (no
    life-lens). The `add()` helper carries `lensId`; output text/priority/sort unchanged → RemyCompanion
    is byte-identical.
  - **Facet → Observation bridge** (new `lib/remy/observation-bridge.ts`): deterministic, template-only
    (`facetToObservation` / `understandingToObservations`). A facet maps losslessly to an observation
    (lensId→ownership, tone→mood, priority→rank, lens→cta), voiced in Remy's first person
    ("Looking across Mary's memories, family is the most documented theme"). **No AI/LLM/embeddings.**
    Lenses produce understanding; observations become Remy's voice describing it.
  - **Cycle-safe:** new leaf `lib/remy/lens-id.ts` holds `LensId` so base types (`RemyObservation`) and
    the lens layer share it without an import cycle; `lenses/types.ts` re-exports it.
  - **Phase 5 seam (documented, not wired):** Voice Engine V1 consumes `RemyObservation[]` directly —
    `mood` (avatar), `text` (speech), `lensId` (context), `cta` (action). The bridge is the seam; it is
    intentionally **not** wired into any renderer (architecture only). Dashboard/Profile Detail/Search/
    nav/Voice/billing/auth/RLS untouched. Validated: lint 0 new (4/160), build ✓, no eslint-disable.
- **Remy Lens Architecture V1 — foundation refactor** (internal; no UX/route/nav changes).
  Established the single understanding pipeline **Signals → Lenses → Facets → (future) Observations →
  (future) Voice**, eliminating divergence between the two intelligence systems.
  - New **`lib/remy/lenses/`**: `types.ts` (the `Lens`/`LensContext`/`UnderstandingFacet` contract —
    facets now carry **`lensId`** ownership), `shared.ts` (pure helpers), and five lens modules —
    **life-journey** (strongest period), **themes** (documented themes), **relationships** (relationship +
    family context), **preservation** (coverage + missing-knowledge + recency), **story** (canonical
    owner; emits nothing yet — extension point for narrative-readiness signals), plus `index.ts`
    (`LENSES` registry).
  - **`lib/remy/understanding.ts` refactored** from a monolithic rule container into an **orchestrator**
    (builds `LensContext` → runs `LENSES` → merges/ranks/summarizes → `RemyUnderstanding`). Public API
    (`buildPersonUnderstanding`, `bucketDecades`, all types) is **stable** via re-exports; the only two
    consumers (Profile Detail page + `RemyUnderstanding` renderer) are **unchanged**.
  - **Personality inference removed** (trust/GDPR): deleted `TRAIT_LEXICON` ("Family-oriented",
    "Career-focused", "Creative spirit", "Loves travel", "Animal lover"). The Themes lens now emits
    **documentation-grounded** copy only ("**Family** is the most documented theme"). Remy describes
    preserved evidence; it never infers personality.
  - Deterministic, **no AI/LLM/embeddings**. Facet shape/ranking/gating preserved → Profile Detail V1
    (`/profiles`, `/profiles/[id]`, coverage, snapshot, quick actions, Search People routing) works
    exactly as before, only the theme copy is now evidence-grounded. Dashboard/nav/Search/billing/auth/
    RLS untouched. Validated: lint 0 new (4/160), build ✓ (`/profiles/[id]` 2.7 kB), no eslint-disable.
- **Remy's Understanding Engine V1 + Profile Detail reframe** (Remy-as-the-ecosystem alignment).
  New canonical **`lib/remy/understanding.ts`** — a deterministic, renderer-agnostic engine that turns
  existing Remy intelligence into a structured point of view (`RemyUnderstanding` = `{subject, level,
  isNascent, summary, facets[]}`). Facets are typed (`life-areas | strongest-period | coverage |
  recency | missing-knowledge | relationship`), each carrying a **Remy role** (curator/storyteller/
  guide/connector/memory-keeper) + a lens deep-link; gated by minimum evidence so Remy never
  overclaims. **No AI/LLM/embeddings** — bands + a theme→trait lexicon + decade-gap math over
  `getFamilyIntelligence` + `computeCoverage` + a scoped decade query (`bucketDecades`). The union is
  additive so Phase 2/3 lenses attach without touching renderers.
  - New shared renderer **`components/remy/RemyUnderstanding.tsx`** (lives in `components/remy`, reusable
    by Search/Remy-home/People later — *not* coupled to Profile): "Remy understands {Name} as…" +
    facet rows bridging into Themes/Life Journey/Story/Connections, with a nascent empty state.
  - **`/profiles/[id]` reframed** so the page *is* Remy's perspective: identity (who Remy is learning
    about) → **RemyUnderstanding (lead)** → **Explore with Remy** (Quick Actions, renamed) → **The
    detail** (snapshot + coverage demoted to evidence). `ProfilePersonIntelligence` folded into the
    engine and **deleted** (its family observations under-fired for a single person).
  - Added **one** profile-scoped decade query to the existing `Promise.all` (no extra latency). Reuses
    `RemyAvatar`. Access guard, RLS, workspace behavior unchanged. **No new AI calls.**
  - Validated: lint (0 new — 4/160), build ✓ (`/profiles/[id]` 2.7 kB), no eslint-disable.
- **Profile Detail V1 — per-person identity pages** (new `/profiles` directory + `/profiles/[id]`).
  Before: Search V2 People results and the `/profile` Relationships count had **no per-person
  destination** — they pointed at the generic `/profile`. Care profiles had no canonical page.
  - New `/profiles` (`app/(app)/profiles/page.tsx`) — people directory: `getAccessibleProfiles()` rows
    (`PersonRow`, ~64px CompactRow) enriched with memory counts from **one** `getFamilyIntelligence`
    call over all profiles (no N+1). New `/profiles/[id]` (`app/(app)/profiles/[id]/page.tsx`) — the
    canonical person page: Identity (`ProfileOverviewCard`, reused — name/photo/age/relationship),
    Life Snapshot (`ProfilePersonSnapshot` — Memories/Collections/Chapters/Dated), Memory Coverage
    (`ProfileCoverageCard`, reused), Family Intelligence (`ProfilePersonIntelligence` — notable life
    areas + Remy observations), Quick Actions (`ProfileQuickActions` — Memories/Timeline/Collections/
    Story; switches the active workspace via `setActiveProfile` then navigates).
  - **All per-person data is profile-scoped via `getFamilyIntelligence(supabase, [{id,name}])`** (it
    filters `memory_profile_id` internally) + two scoped first/latest-date queries + `computeCoverage`.
    The Remy collection/connection/chapter loaders are **`user_id`-scoped only**, so they were
    deliberately **not** used per-person (would show identical account-wide data on every person).
  - **Access guard:** `/profiles/[id]` resolves only ids in `getAccessibleProfiles()` → else `notFound()`
    (RLS also blocks foreign memory reads). Viewing a person does **not** change the active workspace;
    only Quick Actions do (intentional, reuses the existing action).
  - **Search V2 integration:** People hits now route `href: /profiles/${id}` (was `/profile`).
    `/profiles` is reachable from the `/profile` **Relationships** card (now a link).
  - **Deferred (documented):** connections aren't profile-scoped anywhere → omitted from the snapshot;
    per-person top-chapter/connection ranking would need profile-scoped loader variants (themes serve
    as life highlights for now).
  - No auth/RLS/workspace/GDPR/billing/caregiver/ownership/sharing/reminder/notification/profile-access
    regression. **No new AI generation.** Validated: lint (0 new — 4/160), build ✓
    (`/profiles` 1.15 kB, `/profiles/[id]` 2.68 kB), no eslint-disable.
- **Search V2 — global memory intelligence search** (new `/search` route; the single retrieval layer).
  Before: the only `/search` was an **orphaned, unlinked** client page **outside** `(app)` (no nav)
  doing premium **vector** search; Timeline/Library "search" were just local filters of their own page
  data. There was **no global search and no mobile search affordance**.
  - New `/search` (`app/(app)/search/page.tsx`, force-dynamic, inside `(app)` → auth + nav + chrome)
    renders `components/search/SearchView.tsx` (client): `role="search"` input, **debounced** live
    search, sticky filter chips (**All / Memories / Library / People**), recent searches (localStorage),
    suggestions, and **collapsible grouped result sections** of ~72px `SearchResultRow`s
    (icon + title + preview + type badge + chevron).
  - **One request, server fan-out:** `POST /api/search/global` (new) does `Promise.all` over memories
    (`title/content/ai_title/ai_summary` **ILIKE**, workspace-scoped `memory_profile_id = active | IS NULL`),
    collections, connections, chapters (Remy loaders, name match) and people (`getAccessibleProfiles`),
    returning render-ready grouped hits with deep links (`/memories/[id]`, `/collections/[id]`,
    `/connections/[id]`, `/chapters/[id]`). **No N+1** (icon rows, no per-result media join). User input
    is sanitized before the PostgREST `.or()`.
  - **Keyword only — no embeddings / vector / AI / semantic.** The premium vector endpoints
    (`/api/search`, `/api/memories/search`) are **untouched** and remain available as a future "smart"
    mode — **no duplicate search systems**; Search V2 is the canonical global layer.
  - Reachable from a new **search icon in the mobile top bar** (one tap) + a **Search** entry in
    `NAV_ITEMS` (mobile drawer + desktop nav). The orphaned `app/search/page.tsx` was **removed**
    (replaced, not duplicated).
  - No auth/RLS/GDPR/billing/caregiver/workspace/notification/reminder/ownership/sharing/profile/library
    regression. Validated: lint (0 new — 4/160 baseline), build ✓ (`/search` 4.49 kB, `/api/search/global`),
    no eslint-disable.
- **Profile V2 — digital identity layer** (new `/profile` route; Settings becomes secondary).
  Before: no profile page — "profile" was the `ProfileHub` account/settings menu (avatar dropdown +
  drawer); memory intelligence was invisible outside the dashboard.
  - New `/profile` (`app/(app)/profile/page.tsx`) — mobile-first identity surface composing 4 new
    presentational cards (`components/profile/identity/`): **ProfileOverviewCard** (photo/name/age —
    care subject's dob/photo in a care workspace, account name/avatar in My Nest),
    **ProfileLifeSnapshot** (Memories/Collections/Connections/Chapters counts, 2-up cards),
    **ProfileCoverageCard** (first/latest memory date + `computeCoverage` %), **Relationships**
    (people-in-care count), **ProfileHighlightsCard** (top chapter / top collection / strongest
    connection from existing Remy intelligence), and an **Account → /settings** link.
  - **Reuses existing intelligence** (`getRemyCollections/Connections/LifeChapters`,
    `computeCoverage`, `getAccessibleProfiles`, `resolveAccountIdentity` / `resolveActiveProfileId`)
    — **no new data system, no AI generation, no social features.** Memory counts replicate the
    dashboard's **workspace-scoped** pattern (`memory_profile_id = active | IS NULL`) so RLS/workspace
    scoping is unchanged. `bio`/`location` shown only if available (not in schema → omitted).
  - Reachable via a "View profile" link in `ProfileHub` (avatar menu). Settings page + ProfileHub
    sections untouched.
  - No auth/RLS/GDPR/billing/caregiver/workspace/notification/reminder/ownership/sharing/settings
    regression. Validated: lint (0 new), build ✓ (`/profile`), no eslint-disable.
- **Dashboard V4 — Home cleanup (post-Library)** (removes the duplicate intelligence wall now
  that Library is canonical). Removed the 6 Library widget **renders** from `dashboard/page.tsx`
  (`RemyCollections/Connections/LifeChapters/StoryMode/Biography/MemoryBook` + the two
  `MobileExpandable` wrappers + their imports) — ~1,440px of duplicate mobile cards. Replaced with
  one compact **`DashboardStoryPreview`** (~160px): Collections/Connections/Chapters counts +
  narrative chips (Story/Biography/Memory Book) + "Continue reading →" (latest story) +
  **Open Library →**.
  - **Data generation preserved** (per the brief): all 6 synthesizers still run in the dashboard
    (`getRemyCollections/Connections/LifeChapters/Stories/Biography/MemoryBook`) — they feed
    `RemyNotifications`/`RemyTimeline` (unchanged) **and** the new preview's counts/chips, so
    nothing is orphaned. **Only the renders were removed. No change to synthesizers, routes
    (`/library`, `/collections`, …), or data models.** `MobileExpandable.tsx` is now unused (kept;
    deletable in a follow-up).
  - `RemyTimeline` / `RemyNotifications` / Stats / etc. kept (not Library duplicates).
  - No auth/RLS/GDPR/billing/workspace/caregiver/reminder/ownership change. Dashboard bundle
    10.2→9.95 kB. Est. **−1,280px (~−25–30% whole-dashboard)** mobile scroll. Validated: lint
    (0 new), build ✓, no eslint-disable.
- **Library V2 — unified discovery hub** (consolidates Collections/Connections/Chapters/Story/
  Biography/Memory Book). Before: Collections/Connections/Chapters were standalone routes;
  **Story/Biography had no route** (dashboard-widget-only); Memory Book had only `/print`; **none
  were in the nav** — discovery meant scrolling the dashboard widget stack.
  - New `/library` landing (`app/(app)/library/page.tsx` + `components/library/LibraryView.tsx`):
    a single mobile-first hub — one search box + a sticky **horizontal filter-chip** row + **6
    compact destination rows** (≤80px, CompactRow pattern).
  - New routes **`/library/story`, `/library/biography`, `/library/memory-book`** — thin server
    pages that **reuse the existing widgets** (`RemyStoryMode`/`RemyBiography`/`RemyMemoryBook`)
    and synthesizers (`getRemyLifeChapters/Collections/Connections` → `getRemyStories` →
    `getRemyBiography` → `getRemyMemoryBook`). Promotes the 3 dashboard-trapped narratives to
    real destinations. **No new data system.**
  - Collections/Connections/Chapters **keep their routes** (Library links to them — folding them
    into subsections was churn with no UX gain).
  - **Nav:** added "Library" to `nav-config.ts` (drawer item → mobile drawer + desktop top nav).
  - No permission/RLS/GDPR/auth/workspace/caregiver/ownership change (new routes reuse the auth
    guard + the same read-only synthesizers). Validated: lint (0 new), build ✓ (4 routes), no
    eslint-disable. **Live device pass pending. Follow-up: trim dashboard widgets to previews;
    aggregate cross-surface content search.**
- **Timeline V2 — mobile-first feed** (`< md` only; **desktop unchanged**; nothing deleted —
  intelligence/related relocated to detail). Timeline was a desktop card experience:
  `TimelineCard` `<details>` (`p-7`, `text-4xl` title, `text-2xl` preview, per-card
  `IntelligenceStrip` + expanded `RelatedMemories`) ≈ 450–600px each; `text-5xl` header;
  `flex-wrap` chip-wall filters; `p-5` search card; `LifeChapterCard` `p-7`/`text-3xl` ≈ 450px.
  - New `TimelineRow.tsx` (~76px): thumbnail/icon · title · 1-line preview · date · category ·
    chevron → links to `/memories/[id]` (full content + AI intelligence + related live there).
  - New `CompactChapterRow.tsx` (~72px): title · date range · memory count · chevron → chapter view.
  - `TimelineDayGroup` / `ChaptersView`: render rows on mobile (`md:hidden`) + the **unchanged**
    `TimelineCard` / `LifeChapterCard` on desktop (`hidden md:block`). `IntelligenceStrip` +
    `RelatedMemories` are omitted from the row → auto-relocated to detail.
  - Chrome: header `max-md:text-2xl`; categories → **horizontal chip scroll**; search compact
    (`max-md:p-2`); toggle compact; toggle+search+filters sit in a **sticky control bar** on
    mobile (`top-14`); day headers compact + sticky below (`max-md:top-[12.5rem]`). Container
    `p-6 → p-4 md:p-6`.
  - Desktop untouched (all `max-md:`/`md:hidden`; control-bar wrapper keeps `space-y-6` on desktop).
    Est. **~80% mobile feed scroll reduction**; chapters ~84%; chrome ~60%. Validated: lint (0 new),
    build ✓, no eslint-disable. **Caveat: sticky offset `top-[12.5rem]` is an estimate needing
    one-line device tuning; a single-row control bar is a recommended follow-up.**
- **Mobile Memory feed — CompactMemoryRow** (Phase 2; `< md` only; **desktop keeps MemoryCard**;
  no information removed — moved deeper). Memories were a single-column stack of full-content
  `MemoryCard`s (~300px each: untruncated content + 3 thumbs + summary + tags + inline
  Edit/Delete → ~6,000px for 20 memories).
  - New `components/memories/CompactMemoryRow.tsx`: ~76px row — leading thumbnail (`next/image`)
    or fallback icon · title + 1-line preview · `date · ai_category · attachment count` · chevron.
    The whole row links to the existing `/memories/[id]` detail (full content lives there).
    Edit/Delete moved into an overflow "…" menu (no inline button clusters). 44px touch targets +
    aria labels.
  - New `components/memories/MemorySection.tsx` (generic over the caller's memory type): a
    **sticky** group header + responsive split — mobile = divided CompactMemoryRow list; desktop =
    the **unchanged** MemoryCard stack.
  - `app/(app)/memories/page.tsx`: the 3 date groups (Today/This Week/Earlier) + search results
    now render via `MemorySection`; the search bar is **compact + sticky on mobile**; container
    padding `p-6 → p-4 md:p-6` (drops the double-padding). **No filter system exists** (semantic
    search only) — none invented.
  - Desktop untouched (all changes `max-md:`/`md:hidden`). Est. **~70–75% mobile memories scroll
    reduction**. Validated: lint (0 new), build ✓. **Live 375/390/430 pass pending on-device**.
- **Global Workspace Selector — IA migration** (workspace switching is now a first-class,
  always-visible top-bar control on **every** authenticated screen; mobile + desktop).
  - New `components/navigation/WorkspaceSelector.tsx`: a chip `[ {workspace} ▾ ]` → responsive
    sheet (bottom-sheet on mobile, top-right dropdown on desktop) listing **My Nest** + every
    accessible care profile (✓ on active). **Reuses the existing permission-guarded server
    actions** `setActiveProfile(id)` (runs `validateProfileId`) / `setPersonalWorkspace()` +
    `router.refresh()` → global context update + full data refresh + cookie persistence
    (`remynest-active-context`). **No switching/permission logic changed.**
  - Care-profile **management relocated into the sheet** — "Manage care profiles" reveals
    `InviteCaregiverForm` (active profile) + `CreateProfileForm` (add a person).
  - `(app)/layout.tsx` loads `getAccessibleProfiles()` (RLS-scoped) → nav; wired into desktop
    `AppNavbar` (replaces display-only `WorkspaceIndicator`) and `MobileTopBar`
    (now `[Workspace ▾] … [avatar]`).
  - **Dashboard cleanup:** removed `ProfileSwitcher`, `EnterCareProfileList`,
    `DashboardProfilePanel`, `WorkspaceContextPanel`, the "Account & Workspace" 2-card grid, and
    `DashboardCreateProfile`; replaced with a single compact **Workspace Summary Row**
    (Workspace: {name} · N memories · N profiles). Dashboard bundle 12.9→10.2 kB.
  - Critical systems intact (auth, workspace permissions, caregiver/ownership via the reused
    `validateProfileId` + RLS loader, GDPR). Validated: lint (0 new), build ✓. **Runtime checks
    (switch from every screen, invite, persistence after refresh) pending on-device** (auth-gated).
  - Deferred: a full edit/remove-profile CRUD screen (sheet currently does switch + invite + add).
- **Mobile dashboard redesign — layout-first** (`< md` only; **desktop unchanged at `md+`**;
  no content/feature/data removed). Replaces the earlier clamp-heavy attempt — height is now cut
  by real re-layout, with Show-more reserved for the two true long-form documents. All mobile
  overrides use Tailwind `max-md:` so **desktop classes stay byte-identical**.
  - **Width:** removed the *double* horizontal padding (shell `<main>` + dashboard inner `<main>`
    both `px-6`). Shell → `px-4 md:px-6`; inner → `px-0 md:px-6` (~295px → ~343px usable @375).
  - **Rhythm:** inner `<main>` → `py-6 space-y-4 md:py-10 md:space-y-8`; card roots `p-4 md:p-6`.
  - **Header:** avatar inline + smaller, greeting `max-md:text-2xl`, smaller badges, one-line
    mobile summary (full sentence kept at `md:`).
  - **Companion:** `max-md:p-4`, smaller avatar, tighter separator/secondary list.
    `components/remy/RemyAvatar.tsx` gained an optional `className` prop (backward-compatible).
  - **Stats:** `md:grid-cols-2`→`grid-cols-2` (2-up on phones, was stacked), `max-md:p-4`, smaller numbers.
  - **Collections / Connections / Chapters:** `sm:grid-cols-2`→`grid-cols-2` (2-up on phones;
    desktop already 2-col ≥640 so unchanged); sub-cards `p-4 md:p-6`; tighter gaps.
  - **Timeline / Activity / Notifications / Story Mode:** denser rows + `max-md:` spacing/heading.
  - **Biography (expandable kept):** `max-md:p-5`, `h2 max-md:text-2xl`, `mt-8→mt-4`, `space-y-10→space-y-5`.
  - **Memory Book (expandable kept):** TOC → **horizontal chip scroll** on mobile
    (`max-md:flex-nowrap overflow-x-auto`, chips `shrink-0`); smaller headings/padding.
  - **Expandables reduced 6→2:** unwrapped Timeline/Collections/Connections/Chapters (now
    re-laid-out); `MobileExpandable` kept only on Biography + Memory Book.
  - Critical systems (nav, profile/workspace switching, reminders, notifications, memory creation,
    GDPR/account) untouched. Est. **~45–50% mobile scroll reduction** on content-rich dashboards.
    Validated: lint (0 new), build ✓. **Live 375/390/430 visual pass pending on device** (auth-gated).
- **Hybrid mobile navigation — implemented** (fixes the `< md` navbar overflow audited
  earlier; **desktop unchanged at `md+`**). New `components/navigation/nav-config.ts` is the
  **single source of truth** for routes — desktop `NavLinks` and the mobile nav both derive
  from it. Mobile (`< md`): `MobileTopBar` (brand + avatar) · `MobileBottomNav` (Dashboard,
  Memories, center **New**, Timeline, **More**) · `MobileNavDrawer` ("More" → Memory
  Chat/Reminders/Insights + reused `ProfileHub` for Settings/Billing/Support/Profile/
  **workspace switching**/sign-out). `AppNavbar` desktop bar gated `hidden md:flex`; mobile
  pieces `md:hidden`. **Preserved:** active highlighting (`isNavItemActive`), `?context=`
  query handling (Suspense-wrapped `useSearchParams`), workspace switching + profile + route
  permissions (via `ProfileHub`). **iOS safe areas:** `viewport-fit=cover` (root `viewport`
  export) + `env(safe-area-inset-bottom)` on the bottom nav/drawer. Shell `<main>` →
  `pt-6 pb-24 md:pb-6` so content clears the fixed bottom nav. Validated: lint **4 errors/160
  warnings (0 new)**, build ✓, no fixed-width overflow at 375px (bottom nav `flex-1`, drawer
  `w-[88%]` overlay), all 7 routes + account reachable. (Left `body{overflow-x:hidden}` as a
  safety net — the mobile overflow source is gone regardless; revisit later.) **Live 375px
  visual check pending on device/browser.**
- **Native push — double-init conflict fixed** (follow-up to the `5c74190` audit). The
  `onesignal-cordova-plugin` auto-swizzled `didFinishLaunchingWithOptions` and called
  `OneSignal.initialize(nil)` at launch, conflicting with AppDelegate's native
  `initialize(realAppId)` (two inits/launch; nil could win → broken push). The plugin's JS
  is never injected into the remote-URL page → it gave **no usable runtime API** → removed:
  - `npm uninstall onesignal-cordova-plugin`; added **direct** `pod 'OneSignalXCFramework',
    '5.5.2'` to `ios/App/Podfile` (was only transitive via the plugin — needed so
    `import OneSignalFramework` survives).
  - `cap sync` → **0 Cordova plugins**, `CordovaPluginsStatic` + `OneSignalPush.m` nil-init
    swizzle gone. **Exactly one `OneSignal.initialize`** remains (AppDelegate).
  - **No regression:** web push (`/public/OneSignalSDK*Worker.js` + Web SDK CDN), reminder
    delivery, external_id targeting, and notification APIs (`register-device`/`send-*`/`cron`)
    are server-/web-side and untouched; `OneSignalInit.tsx` web branch unchanged.
  - Validated: lint **4 errors/160 warnings** (fewer — removed the plugin's flagged JS; 0
    introduced), web build ✓, `cap sync` ✓, **unsigned iOS build `BUILD SUCCEEDED`** (App
    links `OneSignalFramework` directly, no `CordovaPluginsStatic`).
  - Integration path (OneSignal v5): App ID via Info.plist `ONESIGNAL_APP_ID` (operator
    replaces placeholder — real id is env-only/public, not committed); until then the native
    init safely no-ops (no crash, no push).
- **Native iOS push notifications — implemented** (fixes "reminders arrive on Mac, not
  iPhone"). Root cause (investigated): the remote-URL WKWebView ran the OneSignal **Web
  SDK**, which cannot create an iOS APNs subscription → no iOS device ever existed for
  reminders to target. No DB schema, no API-contract, no reminder-pipeline change.
  - `ios/App/App/AppDelegate.swift` — native `OneSignal.initialize(appId, withLaunchOptions:)`
    + `Notifications.requestPermission` (OneSignal swizzles the APNs callbacks → creates the
    iOS subscription). App ID read from Info.plist `ONESIGNAL_APP_ID`.
  - **Identity bridge** — AppDelegate registers a `WKScriptMessageHandler` (`oneSignalBridge`)
    on the Capacitor WebView; after auth the web app posts the Supabase user id → native
    `OneSignal.login(externalId)`, so reminder **external_id** targeting reaches the iPhone.
  - `components/OneSignalInit.tsx` — branches on `Capacitor.isNativePlatform()`: native →
    bridge login (Web SDK left inert); browser → **unchanged** Web SDK + `/api/register-device`.
    **Web push preserved.**
  - `Info.plist` — `ONESIGNAL_APP_ID` placeholder (operator replaces with the public id).
  - Validated: lint (0 new errors), web build ✓, `npx cap sync ios` ✓, **unsigned iOS build
    `BUILD SUCCEEDED`** (App now links `OneSignalFramework` + WebKit; AppDelegate compiles).
  - **Operator actions to make push DELIVER (config side):** (1) Apple Developer → create
    **APNs Auth Key** + enable **Push** on App ID `com.remynest.app`; (2) **OneSignal dashboard**
    → add the iOS platform with that APNs key (Key ID, Team ID, bundle id), under the **same**
    OneSignal app as web; (3) replace `ONESIGNAL_APP_ID` in Info.plist with the real id;
    (4) set signing **Team** → archive → TestFlight; (5) on device, confirm the iPhone shows
    as an **iOS** subscription in OneSignal and a reminder delivers.
- **TestFlight Readiness — Phase A+B (code portion)** (no new features; no schema change).
  Cleared the code-ownable launch-gap items from the TestFlight Readiness Report:
  - **iOS permission strings** — added `NSCameraUsageDescription`,
    `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` to
    `ios/App/App/Info.plist` (fixes on-device camera/library crash; copy from
    `compliance/07`). **No microphone string** (voice not shipped — per `09`/`12`).
  - **Push scaffolding** — `ios/App/App/App.entitlements` (`aps-environment=development`)
    + `UIBackgroundModes=[remote-notification]` in Info.plist, now **linked into the build**
    via `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in `project.pbxproj` (Debug+Release).
    Validated: `plutil -lint` OK, `xcodebuild -showBuildSettings -scheme App` resolves the
    entitlement. The Push capability is wired in the project (no manual Xcode link needed) —
    operator still enables Push on the App ID + sets the signing Team.
  - **Stripe cancel** — new `app/api/stripe/cancel/route.ts`: cancels at period end
    (`cancel_at_period_end`), resolves customer by email like checkout, structured
    non-throwing results; webhook syncs the profile. Fixes the BillingSection cancel
    button (was a 404). Pairs with the existing `/api/stripe/portal`.
  - **OneSignal cleanup** — removed dead `/api/save-onesignal` + `/api/save-subscription`
    (wrote to the non-existent `users` table via anon client; no references). Real push
    registry remains `/api/register-device` (called by `OneSignalInit.tsx`, Web SDK).
  - **Sentry validation** — `scripts/validate-sentry-env.mjs` + `npm run validate:sentry-env`
    (read-only preflight; locally reports all 5 vars MISSING — confirms the prod gap).
  - Validated: lint (no new errors — 6 pre-existing generated-worker errors only),
    build ✓ (cancel route present, dead routes absent), plists `plutil`-OK.
  - **iOS build-ready (validated 2026-06-12):** `npx cap sync ios` clean
    (onesignal-cordova-plugin@5.3.11 recognized, `pod install` OK); **unsigned simulator
    build `BUILD SUCCEEDED`** (Xcode 26.5) with the Push entitlement linked. The native
    project compiles end-to-end — only **code signing** (Development Team + provisioning,
    both requiring the Apple Developer account) remains before `xcodebuild archive` /
    Xcode Organizer → App Store Connect upload.
  - **Operator / Xcode-required (cannot be performed or validated from the CLI env):**
    (a) create APNs auth key in Apple Developer portal → upload to OneSignal; (b) enable
    **Push Notifications** on the App ID + set the signing **Team** (the `App.entitlements`
    file is already linked via `CODE_SIGN_ENTITLEMENTS` — no manual Xcode link needed);
    (c) native OneSignal push for the **remote-URL** WebView
    is non-trivial — the cordova plugin JS isn't injected into the remote page, so it needs
    a dedicated native-init task (track separately); (d) set the 5 **Sentry env vars in
    Vercel** (`vercel env add …`); (e) run the **physical-iPhone QA** workflow — full
    checklist in `docs/QA_TESTFLIGHT_DEVICE.md`; (f) **replace the placeholder app icon** —
    the current `AppIcon-512@2x.png` is the **default Capacitor placeholder** (blue
    cross-hatch), an App Store 2.3.7 reject risk; regenerate the iOS icon from the RemyNest
    brand (`/public/logo.png` / Remy mark). The icon set is structurally complete (modern
    single-size 1024) — only the artwork must change.
  - **Re-validated 2026-06-12 (build-readiness):** `npm run lint` (6 pre-existing errors,
    0 new), `npm run build` ✓, `npx cap sync ios` clean, **unsigned iOS simulator build
    `BUILD SUCCEEDED`**. Version 1.0 (build 1) — bump `CURRENT_PROJECT_VERSION` per upload.
    Entitlements linked in Debug+Release. **The only gate to archive is the signing Team
    (operator selects it in Xcode).**
- **Resting avatar crop finalized** (`remy-sprite-map.ts` only — resting line + comment;
  the other 8 moods byte-identical). Visual review on `/dev/remy-avatar-test` flagged
  resting as the last bad mood (face too far left, too much body, head too small). Root
  cause: `{0.783,0.658,0.085,0.085}` started above the sprite (top whitespace), ran right
  into the empty gap so the bird sat left, clipped the pendant, and caught the neighbor's
  gold pendant on the right edge. Re-measured by **decoding the 1254² PNG and visually
  inspecting extracted crops** (not guessing): resting is a **curled sitting bird** (NOT a
  bust) — bounds x[0.775-0.857] y[0.670-0.756], closed eyes ≈ (0.806,0.708), heart pendant
  ≈ (0.798,0.742). New crop **{0.77,0.665,0.088,0.088}** centers the whole bird
  head-forward: closed eyes + beak + scarf + pendant in, head ≈ 63% (matches the busts),
  no neighbor bleed (singing bird ends 0.766 left, wing starts 0.871 right, strutter feet
  end 0.649 top, UI panel starts 0.79 bottom). Validated by rendering the exact crop with
  the same normalized→background-position math; `next dev` /dev page 200, blueprint asset
  200 image/png; lint (no new errors — 6 pre-existing `no-assign-module-variable` in
  generated workers), build (49 routes). **All 9 moods now calibrated.**
- **Removed: temp avatar QA tooling** (all 9 moods calibrated → the QA grid is no longer
  needed). Deleted `app/dev/remy-avatar-test/` (and the now-empty `app/dev/`), removed the
  `/dev` exemption from `middleware.ts` `PUBLIC_ROUTES`, and removed the dev-only
  avatar-test link from the dashboard header. `Link` import kept (still used elsewhere on
  the page). No route now exposes the calibration grid. Verified: build ✓ (**48** static
  pages, was 49 — the `/dev` page is gone), lint unchanged (6 pre-existing
  generated-worker `no-assign-module-variable` errors, none introduced here), and the
  dashboard header avatar still renders from the blueprint sheet (`DashboardHeader` →
  `<RemyAvatar mood={remyHeaderMood}>`).
- **Avatar crop calibration — 4 problem moods finalized** (`remy-sprite-map.ts` only).
  After visual review on `/dev/remy-avatar-test`, re-measured welcoming/reflecting/
  neutral/resting from the decoded 1254² PNG (row/column band profiling — no
  guessing) and fixed: **welcoming** {0.846,0.79,0.1,0.1}→{0.868,0.796,0.1,0.1}
  (drop the purple speech-bubble blob at x≤0.868, center the bird at x[0.871-0.962]);
  **neutral** {0.817,0.175,0.17,0.17}→{0.832,0.199,0.145,0.145} (row2 bust
  y[0.207-0.335]; old crop started at 0.175 → showed row1's pendant); **reflecting**
  {0.821,0.307,0.17,0.17}→{0.835,0.338,0.145,0.145} (row3 bust y[0.346-0.475]);
  **resting** {0.792,0.57,0.12,0.12}→{0.783,0.658,0.085,0.085} (the eyes-closed
  sprite is Poses row2-middle y[0.671-0.751]; old crop at y0.57 was the wrong/row1
  sprite). Validated: all 9 in-bounds+square, no clipping, no neighbor bleed; the 5
  GOOD moods (listening/thinking/analyzing/sharing/celebrating) unchanged. lint
  clean; build (49 routes).
- **Avatar crop calibration (all 9 moods)** (`components/remy/avatar/remy-sprite-map.ts`
  only — architecture/middleware/mood-system/dashboard/animation untouched). The crop
  regions were too loose (included stars/wing-tips/surrounding art). Measured the real
  sprite positions by decoding the 1254² blueprint PNG (pure Node zlib) and computing
  the foreground bounding box / centroid per mood window, then set tight **square**,
  head-centered crops (head + scarf + heart pendant, no labels/stars): In-App busts
  0.10² at y0.79 (below stars, above the dark labels), Expressions faces 0.17² (drawn
  larger on the sheet → same in-avatar head size), resting 0.12² on the head (excludes
  feet). All 9 in-bounds + square; centers within ~0.01–0.02 of measured centroids.
  Validated: lint clean, build (48), asset 200 image/png, dashboard 307 (auth intact).
  Final framing should be eyeballed once in-browser; nudge values in the one file.
- **Fix: static assets redirected by auth middleware** (`middleware.ts`). Root cause:
  the matcher excluded only `_next/*` + a named allowlist, so `/remy/remy-blueprint.png`
  entered the middleware; being neither protected, public, nor allow-listed, the
  catch-all `!user && !publicRoute` branch 307-redirected it to `/login`, which (for an
  authenticated session) bounced to `/dashboard` — so the avatar's `<img>`/CSS
  background received HTML, errored, and showed the gold-heart fallback. Fix:
  `isBypassRequest()` now bypasses `/remy/` **and any path with a file extension**
  (`/\.[a-zA-Z0-9]+$/`) so all `/public` static files serve directly; the matcher also
  excludes `remy/` (middleware never runs for the sheet). Validated against the running
  prod server: `/remy/remy-blueprint.png` → **200 image/png (2.12 MB)**, `/logo.png` →
  200, `/dashboard` (unauth) → **307 /login** (auth unchanged). The Remy avatar sprite
  sheet now serves real artwork instead of the fallback. No auth weakening; app
  routes/`/api/*` (no file extension) are unaffected.
- **Remy Avatar Evolution V1** (UI only; no DB/queries/AI; character NOT redesigned).
  Maps the existing Remy intelligence onto the emotional/visual states in the
  official **Remy Avatar Blueprint** (the canonical spec).
  - **Architecture (`components/remy/avatar/`):** `remy-moods.ts` — canonical
    `RemyMood` (welcoming/listening/thinking/analyzing/reflecting/sharing/
    celebrating/resting/neutral) each grounded in a blueprint state
    (`REMY_MOOD_SPECS`), + the **state mapping** `REMY_CONTEXT_MOOD` /
    `remyMoodForContext(context)`. `remy-assets.ts` — mood → `RemyAvatarAsset`
    (`src` = official `/public/remy/remy-<mood>.png`, **null until provided** →
    brand-styled fallback: Remy's purple palette + the mood's expression glyph).
    `RemyAvatar.tsx` — `<RemyAvatar mood size />` (xs–xl), renders official art
    when present else the fallback; mobile responsive; a11y (role=img/alt or
    decorative). Existing `components/remy/RemyAvatar.tsx` (companion ✦) left
    untouched.
  - **State mapping:** dashboard→welcoming · notifications→sharing · timeline→
    analyzing · story-mode/biography/memory-book→reflecting (Thoughtful) · family→
    sharing (caring) · milestone→celebrating. Each maps to a blueprint state; no
    invented expressions.
  - **Integration:** `DashboardHeader` now renders `<RemyAvatar size="lg">`; the
    dashboard derives the header mood from existing notifications (a new chapter/
    family discovery → **celebrating**, else welcoming) — **no new query**.
  - **Validation:** real data → header shows celebrating Remy (chapter notification
    present); mapping verified for all surfaces; lint clean; build passes (48
    routes). **Scalability:** O(1) static render + constant-time mood lookups; 0
    queries, 0 DB; header derivation O(notifications ≤ 10). Constant at any scale.
  - **Future:** drop the official blueprint exports into `/public/remy/` and set
    `src` in `remy-assets.ts` — every surface (web/iOS/Android/notifications/voice/
    Story Mode/Biography/Memory Book) gains the real art with no other change; the
    same `RemyMood` + mapping drive future animation/Voice Engine V2.
  - **Sprite-sheet pass (current):** replaced the 9 per-mood PNGs with ONE
    blueprint sprite sheet `/remy/remy-blueprint.png`. New
    `components/remy/avatar/remy-sprite-map.ts` (`BLUEPRINT_SRC`, `REMY_SPRITE_MAP`
    of normalized `{x,y,w,h}` crop regions per mood, `remySpriteStyle()` →
    background-size/position math) + `RemyAvatarSprite.tsx` (pure-CSS crop).
    `RemyAvatar` now renders `RemyAvatarSprite` layers (crossfade preserved) and
    falls back to the gold-heart brand mark if the sheet is absent (a hidden
    `<img>` onError detects it). `remy-assets.ts` dropped the per-mood `src` (keeps
    alt/ring/gradient). Mood map: In-App-Usage busts → listening/thinking/
    analyzing/sharing/celebrating + Chatting→welcoming; Expressions → neutral/
    reflecting; Poses → resting. Regions are calibrated to the blueprint layout and
    tunable in one file. Validated: all 9 regions in-bounds, valid crop math; lint
    clean; build (48). **Scalability:** one image (one fetch, browser-cached) shared
    by every avatar; crop is pure CSS, O(1) per avatar; no DB/queries. **Asset
    step:** drop `remy-blueprint.png` in `/public/remy/` (cannot be generated
    in-repo) — recalibrate `remy-sprite-map.ts` if the export framing differs.
  - **(superseded) Real-artwork pass:** emoji rendering **removed**. `RemyAvatar` rendered
    Remy's real art via `next/image` from `/remy/remy-<mood>.png` (set in
    `remy-assets.ts`; `remy-moods.ts` `cue` replaced the emoji), with a **smooth
    crossfade** between moods (`.remy-fade-in` keyframe in `globals.css` + a
    two-layer stack) and a **brand fallback** (Remy's purple + gold heart pendant
    SVG — never an emoji) when an export is absent. **Asset contract** in
    `public/remy/README.md`: 9 square transparent bust PNGs (`remy-<mood>.png`)
    cropped from the blueprint sprites. NOTE: the raster PNGs are a design/export
    step (cannot be generated in-repo) — the code renders them the instant they're
    added; until then the brand fallback shows. No redesign, no new moods, no
    DB/queries/AI; V1 architecture intact.
- **Export Engine V1 — PDF-ready export layer** (read-only; no cloud/sharing/
  email/AI/migrations). Converts a MemoryBook/Biography into a printable document
  and generates a PDF via the browser print engine (zero new deps).
  - **Architecture (3 parts):** (1) `lib/remy/export-document.ts` — pure flattening
    of `MemoryBook`/`Biography` into an `ExportDocument {title, subtitle, blocks[],
    meta}` of `ExportBlock {type: title|subtitle|heading|subheading|paragraph|
    divider|pagebreak, text?}` (`buildExportDocumentFromMemoryBook` /
    `…FromBiography` / `buildExportDocument`); reuses prose verbatim, generates
    nothing, returns null when empty. (2) **PDF generation:** print page
    `app/(app)/memory-book/print/page.tsx` assembles the same book the dashboard
    builds (chapters/collections-details/connections/coverage/family → story →
    biography → book), renders `ExportDocumentView` (serif, page-break blocks),
    print-isolated via `#remy-export` CSS in `app/globals.css`. (3) **Download
    flow:** `PrintButton` (`window.print()` → Save as PDF) + an "Export as PDF →"
    link on the dashboard Memory Book.
  - **Validation (real data):** book → ExportDocument of 26 bounded blocks (title,
    subtitle, divider, Contents + 5 TOC, 5 sections each pagebreak+heading+content,
    5 page breaks). Empty account → book null → print page shows "Nothing to export
    yet" + /memory-dates link. lint clean; build passes (48 routes; /memory-book/print).
  - **Scalability:** export model = 0 queries, O(sections + chapters + paragraphs)
    (~≤50 blocks) → constant. Print page = ~6 bounded model reads, **on-demand only**
    (off the dashboard hot path). PDF = browser print over a bounded doc; no server
    PDF lib, no deps, no N²; constant at 10/100/1k/10k memories. **Future:** a PDF
    library or print/share/cloud consume the same `ExportDocument` unchanged.
- **Remy Memory Books V1 — structured book model** (read-only; no AI/queries/
  migrations/schema). NOT PDF/print/share/AI — the deterministic book structure
  future export/print/share will consume. Pure COMPOSITION of Biography V1 (+
  Story Mode chapter titles) into a cover + table of contents + navigable book.
  - **Investigation:** Biography V1 already contains every book section as prose
    (Introduction/Life Chapters/Important Themes/Connected Stories/Family Impact/
    Reflection); Story Mode supplies titled per-chapter entries. Reuse verbatim;
    recompute nothing; empty biography → empty book.
  - **Architecture:** `lib/remy/memory-book.ts` — `getRemyMemoryBook({biography,
    stories})` PURE (0 queries) → `MemoryBook {title, subtitle, cover, tableOfContents[],
    sections[]}`; `MemoryBookSection {id, title, paragraphs[], chapters?, href?}`;
    `MemoryBookChapter {id, number, title, paragraphs[], href?}`. Each biography
    section → a book section (in order); the "Life Chapters" section carries titled
    `MemoryBookChapter` entries from Story Mode; TOC = numbered section list.
    Returns null when biography is null.
  - **UI:** `components/remy/RemyMemoryBook.tsx` — book preview: cover + contents
    navigator (click a chapter to read it; client state, no nested scroll); mobile
    responsive (TOC wraps above content); hidden when null. Preview only — no
    export/PDF.
  - **Placement:** Biography → **Memory Book** → Collections/Connections/Chapters —
    the bound, navigable book form of the biography, above the drill-downs.
    Progression: Timeline → Story Mode → Biography → Memory Book → drill-downs.
    0 query delta.
  - **Validation (real data):** "A Life in Memories" (1980) · 5 TOC entries
    (Introduction, Life Chapters, Important Themes, Connected Stories, Reflection)
    · Life Chapters → 1 chapter ("The 1980s"); empty account → null → hidden.
  - **Scalability:** 0 queries; transform O(biography sections + stories) — both
    bounded → constant; render shows one active section. No memory-proportional
    work, no N², constant at 10/100/1k/10k memories. **Future:** PDF export /
    printing / sharing consume the same `MemoryBook` model unchanged.
- **Remy Biography V1 — structured life narrative** (read-only; no AI/migrations/
  schema/raw-memory queries). NOT AI writing / LLM / chatbot — a pure COMPOSITION
  that assembles a long-form life document from existing intelligence, reusing
  existing summaries verbatim and only templating plain facts (counts, spans).
  - **Investigation:** all narrative info already exists — Story Mode `summary`
    (ready chapter narratives), Chapters/Collections/Connections summaries, Family
    observations/members, `coverage.total/dated`. No per-user memory total beyond
    `coverage` (used for intro/reflection). Sparse → fewer sections; empty → null.
  - **Architecture:** `lib/remy/biography.ts` — `getRemyBiography(input)` PURE (0
    queries) → `RemyBiography {title, subtitle, sections[]}` /
    `RemyBiographySection {id, title, paragraphs[], href?}`. Sections (omitted when
    empty): **Introduction** (facts), **Life Chapters** (reuses Story Mode
    narratives, else chapter summaries), **Important Themes** (collection summaries),
    **Connected Stories** (deduped connection summaries, diverse only), **Family
    Impact** (family members + shared-theme observation), **Reflection** (facts).
    `null` when no chapters/collections/connections/family.
  - **UI:** `components/remy/RemyBiography.tsx` — readable document style (serif-ish
    title, span subtitle, prose sections in a `max-w-2xl` column, Explore links);
    mobile responsive; no nested scroll / fixed heights; hidden when null.
  - **Placement:** Timeline → Story Mode → **Biography** → Collections/Connections/
    Chapters. The long-form culmination of the narrative layers (chronology →
    guided journeys → full document), above the analytical drill-downs. 0 query
    delta (reuses already-computed intelligence).
  - **Validation (real data, top user):** "A Life in Memories" (1980) — Introduction
    (45 memories · 1 chapter) · Life Chapters ("The 1980s was a period shaped by
    Personal Memory and Social.") · Important Themes (Health & Fitness / Fitness
    summaries) · Connected Stories (deduped) · Reflection (2 of 45 placed in time);
    Family omitted single-profile; empty account → null → hidden.
  - **Scalability:** 0 queries; synthesis O(stories + chapters + collections +
    connections + family) all bounded → constant; render O(sections × paragraphs)
    ≤ ~25. No memory-proportional work, no N², constant at 10/100/1k/10k memories.
    **Future:** PDF/voice/sharing consume the same `RemyBiography`; richer prose as
    date adoption adds chapters and cross-era connections.
- **Remy Story Mode V1 — guided narrative journey** (read-only; no AI/migrations/
  schema). NOT AI generation / biography writer / chat — a pure COMPOSITION over
  existing intelligence, built on the Timeline V1 chapter backbone.
  - **Investigation:** narrative primitives already exist — Life Chapters
    (`title`, `summary`, `startYear/endYear`, **`themes[]`**), Collections
    (`id`=category slug, `summary`, year range), Connections (`summary`,
    `startYear/endYear`, `spansEras`, `diversityScore`). Story paths buildable
    today: one story per chapter; sections = chapter `themes[]` (linked to matching
    Collections by `slugify(theme)===collection.id`) + overlapping Connections;
    narrative composed from themes + `chapter.summary`. Recompute nothing; fetch no
    raw memories.
  - **Architecture:** `lib/remy/story-mode.ts` — `getRemyStories(input)` PURE (0
    queries). `RemyStory {id, title, summary, startYear, endYear, sections[],
    href}`; `RemyStorySection {id, title, description?, href?, kind:"theme"|
    "connection"}`. One story per chapter (chronological, cap 8); ≤3 theme + ≤2
    connection sections; narrative "The 1980s was a period shaped by X and Y.".
  - **UI:** `components/remy/RemyStoryMode.tsx` ("Story Mode") — card-based journey
    (title · range · narrative · vertical section rail with Explore links · "Walk
    through <chapter>"); mobile responsive; no nested scroll / fixed heights;
    hidden when empty.
  - **Dashboard placement:** Timeline → **Story Mode** → Collections/Connections/
    Chapters. Sits directly after the Timeline backbone and above the drill-downs:
    timeline plots chronology, Story Mode walks it, sections are deep exploration.
  - **Validation (real data, top user):** 1 story — "The 1980s" → summary "The
    1980s was a period shaped by Personal Memory and Social." → sections Personal
    Memory → Social → nav /chapters/1980s; empty account → [] → hidden.
  - **Scalability:** 0 queries (reuses chapters/collections/connections already
    computed). Synthesis O(chapters × (themes + connections)), all bounded
    (chapters ≤ #decades, cap 8; ≤3 themes; ≤ connections window) → constant;
    render O(stories × sections) ≤ ~40. No memory-proportional work, no N², constant
    at 10/100/1k/10k memories. **Future:** Story Mode V2 / Biography Generator
    consume the same `RemyStory[]`; connection sections enrich as date adoption
    creates cross-era overlaps.
- **Remy Timeline V1 — visual narrative layer** (read-only; no AI/migrations/
  schema). NOT a calendar / list of memories / new engine — a pure SYNTHESIZER
  that turns existing intelligence into a chronological story.
  - **Investigation:** timeline is fully buildable from already-computed dashboard
    intelligence. Year availability: Life Chapters V2 (`startYear` always) ✅,
    Connections V2 (`startYear` always; use `spansEras` only) ✅, Collections V2
    (`startYear` only with `includeDetails`) ⚠️, date-coverage = counts only.
    Reuse `RemyLifeChapter`/`RemyConnection`/`RemyCollection`; do NOT re-derive or
    fetch raw dated memories.
  - **Architecture:** `lib/remy/timeline.ts` — `getRemyTimeline(input)` PURE (0
    queries) → `RemyTimelineEvent {id,title,description,year,category,href,
    priority}`; categories `chapter|collection|connection|memory|family`. Events:
    each chapter ("The 1980s became a chapter" @ decade), each cross-era
    connection ("A connected story spans these years" @ startYear), each detailed
    collection ("<Theme> memories begin appearing" @ startYear). Sort **year asc**
    (ties: priority chapter 90 > connection 75 > collection 70), cap 24.
    `groupTimelineByYear` for rendering.
  - **UI:** `components/remy/RemyTimeline.tsx` ("Your Story") — vertical timeline
    with a left rail + year dots → year → event title → description; mobile
    responsive; no nested scroll / fixed heights; hidden when empty.
  - **Dashboard placement:** rendered immediately **above the Collections/
    Connections/Chapters drill-down trio** (it's their narrative parent — story
    first, then explore). The only query delta: the existing dashboard collections
    call now uses `includeDetails:true` (one bounded member fetch) so collections
    carry a year; Timeline itself adds **0 queries**.
  - **Validation (real data, top user):** 1980 "The 1980s became a chapter" →
    2026 "Health & Fitness / Fitness memories begin appearing"; chronological;
    no cross-era connections (all ~2026); empty account → hidden.
  - **Scalability:** Timeline = O(chapters + collections + connections), all
    already bounded (≤4 each on dashboard; intrinsically #decades / #categories /
    window), event cap 24, render O(≤24). **0 timeline queries** (net dashboard
    delta +1 bounded collections detail fetch). Constant cost at 10/100/1k/10k
    memories; no N². **Future:** Story Mode, Biography Generator consume the same
    events; family milestones plug into the reserved `family` category.
- **Remy Notifications V1 — intelligence-driven updates layer** (read-only; no
  push/email/persistence/cron/AI/migrations). The synthesis engine that turns
  existing Remy intelligence into ranked notification candidates; future Digest
  Emails / Push will CONSUME this rather than re-deriving.
  - **Investigation:** `generateRemyObservations()` = `RemySignals → RemyObservation[]`
    (`{id,surface,tone,mood,priority,text,cta?}`, priority desc, tone→mood);
    surfaces are Remy Companion / Remy Activity / Family Intelligence. All
    notification inputs are **already computed on the dashboard** — `remyDateCoverage`,
    `remyCollections`, `remyConnections`, `remyLifeChapters`, `familyIntelligence`.
  - **Architecture decision:** `getRemyNotifications(input)` is a **PURE synthesizer**
    (no DB, no queries) consuming those already-computed outputs — no duplicated
    business logic, Notifications = single source of truth.
  - **Model** `lib/remy/notifications.ts`: `RemyNotification {id, priority, title,
    message, category, href, createdAt}`; categories `memory-date | collection |
    connection | chapter | family`. **Ranking:** chapter 90 > family-shared 85 >
    collection 80 > connection-cross-era 72 / connection 65 > family-active 55 >
    memory-date 40; sort desc, cap 10. Reuses `formatChapterRange`/
    `formatCollectionRange` and maps `family.observations` directly.
  - **Dashboard:** `components/remy/RemyNotifications.tsx` ("Remy Updates") — the
    EXACT Remy Activity pattern (3 visible, "Show more →"/"Show less", in-place,
    no nested scroll, no fixed heights, mobile responsive); hidden when empty.
    Placed **between Remy Activity and Collections** in `dashboard/page.tsx`.
  - **Validation (real-data-shaped):** visible = The 1980s chapter (90) · Fitness
    largest collection (80) · connected story (65); show-more = Family activity
    (55) · dates nudge (40); empty account → hidden. Date/Collection/Connection/
    Chapter/Family sources each produce their notification when present.
  - **Scalability:** notifications add **0 queries** and **0 scans** — pure synthesis
    over already-bounded inputs (collections/connections/chapters limited to 4 on
    the dashboard; family bounded). Cost is **O(1)** w.r.t. memory volume, identical
    at 100/1k/10k memories; dashboard impact = +1 pure call + 1 component.
- **Family Workspace Intelligence V1** (read-only; no schema/migrations/AI;
  intelligence only — no notifications/alerts/predictions). First family-level
  layer above Memory Dates / Collections V2 / Connections V2 / Life Chapters V2.
  - **Investigation:** `memory_profiles` = `id, created_at, profile_name,
    preferred_name, date_of_birth, profile_photo, created_by_account_id,
    subscription_status` (6 rows; **max 2 profiles per owner** — families are
    small). `getAccessibleProfiles()` (owned ∪ caregiver, deduped) is **already
    fetched on the dashboard** → reused, no new profile query. Memories carry
    `memory_profile_id`; clusters do NOT, so per-profile **collection count** =
    Collections-V2 category model per profile (categories with ≥3 memories) and
    **chapter count** = Life-Chapters-V2 decades among that profile's dated
    memories — all from ONE scoped `memories` read.
  - **Model** `lib/remy/family.ts` (`getFamilyIntelligence(profiles)`): single
    `memories.in("memory_profile_id", ids)` query → per-profile {memoryCount,
    datedCount, chapterCount, collectionCount, lastActivityAt}, aggregated family
    **themes** (top categories + how many members share each), and **observations**
    (RemyObservation, surface "caregiver"): "Most recent activity is centered
    around <name>." / "Several family members share <Theme> memories." (≥2 members)
    / "Most family memories still need dates." (<50% dated → /memory-dates).
  - **Dashboard:** `FamilyOverview` (members + observations, relative "last memory"
    time) + `FamilyThemes` (theme chips), shown only when **≥2 accessible profiles
    AND the family has memories**. Mobile responsive; graceful (hidden otherwise).
  - **Real-data result:** family "Mary, test" → Mary (60 memories · 2 dated · 1
    chapter · 3 collections · last 2 days ago), test (No memories yet); themes
    Health & Fitness / Fitness / Technology…; observations "centered around Mary"
    + dates nudge (3% dated).
  - **Scalability:** one query + JS aggregation, **O(profiles + rows)**; bounded —
    `MAX_PROFILES=50` (IN clause) + `ROW_CAP=8000` (rows). 10/100 profiles fast +
    accurate; **1000** profiles → only first 50 processed + 8000-row cap
    (approximate) — real families are tiny, so a materialized per-profile rollup /
    aggregate RPC is the future path for org-scale. **Limitations:** clusters have
    no profile link (collection count is the per-profile category proxy); user/
    profile counts are recent-window-approximate past the row cap. **Future:**
    dedicated /family page, per-profile drill-down, cross-member Connections.
- **Life Chapters V2 — time-based life periods** (read-only; no
  schema/migrations/AI; existing fields only). Rewrote `lib/remy/life-chapters.ts`;
  pages/components updated (no route changes).
  - **Investigation:** V1 grouped by `ai_category` → fragmented, present-dated
    pseudo-chapters ("Cognition 2026", "Request 2026") — technical groupings, not a
    life, because <3% of memories are dated so effective dates collapsed to 2026.
  - **Architecture decision — chapters from TIME:** build chapters from memories
    with a real historical `memory_date`, grouped into **decade periods** ("The
    1980s") via the shared effective-date helper. Dominant **themes** per period
    reuse the Collections V2 category model (`connectedCollections` = distinct
    themes in the era); the "spans multiple periods" framing is the Connections V2
    counterpart. A one-line narrative **summary** is derived from the themes
    ("A period centered on Family." / "A period spanning Family and Travel."). All
    three Remy layers (Collections/Connections/Chapters) now rest on the same
    date + theme primitives.
  - **Thresholds / graceful degradation:** gated on **≥2 dated memories** total
    (`MIN_TOTAL_DATED`); otherwise returns empty → the /chapters page shows an
    actionable empty state linking **/memory-dates** (dating is the prerequisite).
    No fabricated present-day topics. Grows as Memory Date Adoption fills dates.
  - **Real-data result:** V1 = ~19 topical "category 2026" pseudo-chapters; V2 =
    **one real chapter "The 1980s"** (2 memories; themes Personal Memory · Social).
  - **Scalability:** one bounded read — dated memories, user-scoped, `limit 600`,
    `memory_date IS NOT NULL`. Grouping O(dated memories); no per-chapter queries,
    no full-table scans, no N². Dashboard (`sort:"count"`, top 4) stays light;
    /chapters is chronological.
- **Connections V2 — meaningful relationship discovery** (read-only; no
  schema/migrations/AI; existing stored relationships only). Rewrote
  `lib/remy/connections.ts`; pages/components updated to narrative (no regressions).
  - **Investigation:** V1 ranked by raw graph **degree** and led with "{N}
    connected moments"; the production graph is a near-single-theme clique
    (degrees ≤17) → true but redundant. Relationships mostly link same-`ai_category`
    memories. Reuses memory `ai_category` (theme) + effective dates (era) already
    fetched — no extra query. No similarity/score surfaced.
  - **Architecture decision — diversity ranking, not degree:** for each anchor +
    its connected memories, compute distinct **themes** (categories, each needing
    **≥2 members** to count — robust to category noise) and **eras** (decades).
    `diversityScore = (spansEras?2:0) + (spansThemes?1:0)`. Sort by score → degree →
    recency. **Reduce redundancy:** single-theme (score 0) hubs are collapsed to one
    strongest representative per theme (titled by the theme); diverse connections
    are kept individually (titled by the anchor memory).
  - **Human-language strategy:** lead with a narrative **summary** (no count
    headline): cross-era+theme → "This story reaches across different periods and
    themes of life."; cross-era → "This story spans multiple periods."; cross-theme
    → "These memories may be part of the same story."; single-theme → "These
    memories share a common theme." Never exposes similarity/vector/score/
    relationship_type.
  - **Detail page:** title, narrative summary, connection count, **date span**
    (`formatConnectionSpan`), **theme hints** (`themes` joined • ), connected
    memories. Dashboard + /connections lead with the summary instead of a count.
  - **Real-data result:** V1 = 18 degree-ranked "{N} connected moments"; V2 = **16**
    (14 cross-theme + 2 collapsed single-theme reps "Health Fitness"/"Fitness"),
    each with narrative copy. (Era spanning is ~0 today because <3% of memories are
    dated; era ranking strengthens as Memory Date Adoption fills in. The residual
    cross-theme inflation is the audit's known category-fragmentation issue —
    category canonicalization is a separate future task, not Connections.)
  - **Scalability:** unchanged read shape — ≤400-memory window + 2 bounded
    relationship `.in(...)` queries; adjacency + per-anchor diversity are **O(memories
    + edges)**, no per-connection queries, no N² traversal, no relationship
    recompute. Dashboard stays lightweight (top-N); graceful empty preserved.
- **Collections V2 — deduplicated, thematic collections** (read-only; no
  schema/migrations/AI; existing fields only). Rewrote `lib/remy/collections.ts`;
  the components/pages are unchanged (no regressions).
  - **Investigation (real production data):** `memory_clusters` (12 rows) has
    `id,user_id,title,summary,category,emotional_theme,created_at`;
    `memory_cluster_items` = `cluster_id,memory_id,similarity`. Duplicates appear
    because groupings are created **one-per-created-memory**, so similar memories
    spawn near-identical groupings. V1 `collectionTitle` preferred the grouping's
    `title` (= anchor memory's ai_title) BEFORE `category`, and the only filter was
    `memoryCount > 0` — hence three memory-titled "…Gym Workout" collections, all
    `category="Fitness"`, drawn from the same pool. Confirmed: the 3 Fitness
    clusters union to **15 distinct** members; every other category has 0 members.
  - **Architecture decision — theme-first consolidation:** group underlying
    groupings by their existing **`category`** and union members. Collapses
    same-theme duplicates (Fitness 3→1), produces thematic titles, and is **linear
    O(clusters + items)** — no pairwise O(clusters²) overlap scan. Subsumes
    membership-overlap dedup for the production data (the duplicates share the
    category).
  - **Dedup strategy (exact):** two groupings belong to the same collection iff
    `slugify(category)` is equal; membership = the UNION of their
    `memory_cluster_items`. Collection `id` is now the **category slug** (e.g.
    `fitness`); the detail page resolves by slug.
  - **Title priority:** category → summary → title. Grouping is BY category, so a
    shown collection's title is always its (Title-Cased) category — a memory title
    can never become the title. Summary = representative grouping's `summary`;
    themes = top member moods (fallback `emotional_theme`).
  - **Threshold rules:** category non-empty, non-generic
    (`general/uncategorized/memory/other/""`), non-technical; AND **≥3 distinct
    members**. Otherwise omitted → graceful empty (no fabrication).
  - **Dashboard impact (real data):** V1 showed 3 near-identical Fitness
    collections; **V2 shows exactly one — "Fitness" (15 memories)**.
  - **Scalability:** bounded reads — `fetchClusters` orders by `created_at` desc,
    `limit 500` (recent window); items only for those clusters; member fetch capped
    at 1000. Complexity O(clusters + items); no per-collection queries, no repeated
    full memory scans, no N². Output bounded by distinct categories at 100/1k/10k.
- **Dashboard Remy Activity — concise summary card** (presentation-only): the
  dashboard "Remy Activity" section behaves like a concise summary, not an
  ever-growing feed. Shows the **3 most recent** items by default; a footer CTA
  (**"Show more →" / "Show less"**) expands/collapses **in-place** when >3 exist
  (`expanded ? activities : activities.slice(0,3)`; CTA only when
  `activities.length > 3`). No nested scroll containers; **descriptions don't
  truncate** (wrap via `break-words`); mobile responsive (full-width CTA on small
  screens); `aria-expanded` for a11y. `components/remy/RemyActivityFeed.tsx` only.
  - **Investigation findings (for future Activity Log / Remy Insights split):**
    Component = `components/remy/RemyActivityFeed.tsx`; model =
    `lib/remy/activities.ts` (`buildRemyActivities` pure builder +
    `fetchRemyActivitySources`); integration = `app/(app)/dashboard/page.tsx`
    (builds activities → `<RemyActivityFeed>`; separately
    `generateRemyObservations` → `RemyCompanion`). **Activity items are EVENTS**
    (`historical-preserved`/`memory-added`/`reminder-completed`/
    `collection-discovered`), each from a source row + timestamp — **not
    observations, and NOT a mixture**; observations are a separate system feeding
    the Companion. Generation is **bounded** (`buildRemyActivities` default
    `limit` 8 over a recent window: ≤15 recent memories + recent clusters +
    reminders), so it does not grow at 100/1k/10k memories — the 3-item preview
    keeps the card concise at any scale. **Future separation is straightforward &
    non-breaking:** an *Activity Log* page would render `buildRemyActivities` with
    a higher `limit`/pagination; *Remy Insights* would render the existing
    observations system. The two models are already decoupled. (Not implemented —
    no Activity Log, no Remy Insights, no pagination, no infinite scroll.)
  - **Validation:** 0 activities → empty-state copy, no CTA; 1/2/3 → all shown, no
    CTA; ≥4 → collapsed shows 3 + "Show more →", expanded shows all + "Show less".
    No fixed heights → no layout shift; mobile + desktop verified via build.
- **Reminiscence Mode V1** (read-only; existing data only; no AI/embeddings/
  clustering/migrations): the first dedicated caregiver/family memory experience.
  New `lib/remy/reminiscence.ts` (`getReminiscence`) reuses historical (dated)
  memories + the shared date helpers + `signMemories` (for images), grouping them
  into **eras (decades)** by effective date, oldest-first (a life unfolding).
  Workspace-scoped (care profile / My Nest), one fetch, best-effort.
  - **/reminisce**: calm, large-type, large-tap-target experience. Per-era
    sections ("1980s" + a warm Remy line "Let's revisit N memories from the
    1980s.") of image-forward `ReminiscenceCard`s (title · 🕰 memory date · image
    if available · short summary → /memories/[id]). Personal Remy intro using the
    care-recipient's name when present. **Empty state** (0 dated) explains why
    dates matter + links `/memory-dates`; **sparse note** (<3 dated) nudges the
    same while still showing what exists.
  - **Dashboard**: `ReminisceDashboardCard` ("Reminisce together → Start
    reminiscing") shown when dated memories exist — reuses the existing
    `intelligence.historicalTotal` count, **no extra scan**.
  Directly actions the audit's "family-revisit / caregiver-reminiscence" gap.
  Mobile responsive; graceful degradation.
- **Memory Date Adoption V1** (read-only reads + a dedicated date-only write; no
  schema migrations): drives historical-date coverage up to improve every Remy
  narrative layer (only ~3% of memories are dated today). New
  `lib/remy/date-coverage.ts` (`computeCoverage`, `getDateCoverage`,
  `getMemoriesMissingDates`, `coverageMilestone`) — workspace-scoped (care profile
  / My Nest), best-effort. Surfaces:
  - **Dashboard Date Completion Card** (`components/memory-dates/DateCompletionCard`)
    shown when coverage < 50%: total · dated · missing · % complete + "Add memory
    dates" (reuses existing dashboard counts — no extra query).
  - **/memory-dates backfill flow**: lists memories with `memory_date IS NULL`
    (title, preview, added date); per-memory options Exact date / Month + year /
    Year only / Decade only / Not sure (reuses `buildMemoryDate`); a progress bar
    with 0–25/25–50/50–75/75–100 milestones; and a live "Dates you just added"
    session feed (`🕰 Memory date added`, new `memory-date-added` activity kind).
    Saves via a **dedicated server action that updates ONLY `memory_date` +
    `memory_date_precision`** (validated, scoped by user_id) — never touches
    title/content/attachments (the generic PUT would have wiped them), and
    `revalidatePath`s timeline/dashboard so newly dated memories appear instantly.
  - **Intelligence observation**: "Most memories still need dates…" (<50%) or
    "You've dated N% of memories." (reuses `intelligence.historicalTotal`).
  - **Timeline validation**: timeline groups by effective date + is force-dynamic,
    so backfilled memories immediately slot into their historical position and feed
    historical intelligence/observations. Memories have NO `updated_at` column, so
    a timestamped dashboard "date added" event isn't possible without a migration —
    handled gracefully via the on-page session feed (no schema change). Mobile
    responsive; graceful when nothing is missing.
- **Life Chapters V1** (read-only; no schema/migrations/AI; existing data only):
  Remy's **narrative layer**, the top of the stack (Memories → Collections →
  Connections → Life Chapters). New `lib/remy/life-chapters.ts`
  (`getRemyLifeChapters`, `getRemyLifeChapterById`, `formatChapterRange`) groups
  memories deterministically by their EXISTING `ai_category` (assigned at capture —
  no new AI) into narrative chapters: title (the category, Title-Cased; slug = id),
  date range from effective memory dates ("1975 → 1988", "2016 → Present"), memory
  count, dominant themes (top moods), and connected-collection count (collections
  sharing the chapter category). Generic categories are skipped. Sort:
  chronological on `/chapters` (narrative), by count on the dashboard (significance).
  Best-effort/user-scoped (recent ≤600 memories), human language only (never
  cluster/vector/similarity).
  - **Dashboard**: `RemyLifeChapters` section ("I've started identifying important
    chapters in <subject>'s life / your story." → top 4 → "View all chapters →");
    hides gracefully when empty.
  - **/chapters**: chronological `ChapterCard` grid (title · range · count · themes).
  - **/chapters/[id]**: header ("Many of these memories belong to the same period.
    This chapter contains N connected memories.", range, themes, related collections)
    + chronological member-memory list linking to `/memories/[id]` (reuses date
    helpers). Mirrors the older timeline `ChaptersView` concept as a proper Remy
    model + standalone pages. Degrades to empty.
- **Remy Relationship Discovery V1 (Remy Connections)** (read-only; no
  schema/migrations/AI; existing data only): exposes the stored
  `memory_relationships` data as a human **Connections** capability — never
  surfaces "similarity"/"vector"/"embedding"/score. New dedicated model
  `lib/remy/connections.ts` (`getRemyConnections`, `getRemyConnectionById`) is the
  ONLY reader of `memory_relationships` for this feature: user-scoped via
  `.in("memory_id"/"related_memory_id", <user memory ids>)`, best-effort, builds an
  undirected adjacency among the user's accessible memories (recent ≤400), and
  anchors a Connection on a memory + its connected moments (≥2 → a "shared story").
  Each connection: title (anchor memory), theme (anchor category), connectedCount,
  recency. Sorted by connectedCount desc then recency.
  - **Dashboard**: new `RemyConnections` section ("Connections Remy Found —
    Memories that may be part of the same story." → top 4 → "View all
    connections →"); hides gracefully when empty.
  - **/connections**: grid of connection cards (title · N connected moments ·
    "Connected to {theme}").
  - **/connections/[id]**: header (anchor title, "These memories appear connected
    to {theme}." / "…same story.", count, "Open this memory →") + read-only
    connected-memory list linking to `/memories/[id]` (reuses the date helpers).
  Distinct from the memory detail page's live `match_memories` RPC — Connections
  reads the STORED relationships (no recompute). Degrades to empty when missing.
- **Remy Collections V1** (read-only; no schema/migrations/AI; existing grouping
  data only): Remy's "Organize" capability — surfaces existing stored memory
  groupings as human **Collections** (never "cluster"/technical language). New
  dedicated model `lib/remy/collections.ts` (`getRemyCollections`,
  `getRemyCollectionById`, `formatCollectionRange`) is the ONLY reader of
  `memory_clusters` + `memory_cluster_items` for this feature: best-effort,
  user-scoped, 2–3 queries (clusters → item membership → member memories),
  deriving title (sanitized of "cluster"), memory count, date range (effective
  memory dates), and emotional themes (top member moods, fallback
  `emotional_theme`). Sorted by memory count desc then most-recently-active.
  - **Dashboard**: new `RemyCollections` section under Companion + Activity
    ("I've started organizing memories into collections." → top 4 title+count →
    "View all collections →"); hides gracefully when empty.
  - **/collections**: `CollectionCard` grid (title · count · range · themes).
  - **/collections/[id]**: header (title, summary, count, range, themes) + a
    read-only member-memory list linking to `/memories/[id]` (MemoryCard needs
    client edit/delete handlers, so a read-only list reuses the date helpers).
  - **Terminology**: Remy Activity "New theme discovered" → **"New collection
    discovered"** (kind `collection-discovered`, links to /collections); the
    dashboard intelligence observation now says "organized … into N collections"
    (→ /collections). No clustering/generation changed; degrades to empty.
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
- `users` table missing (legacy): dead `save-onesignal` / `save-subscription` endpoints
  **removed** (2026-06-12); push uses `device_registrations` via `/api/register-device`.
- ~~`/api/stripe/cancel` missing~~ **fixed** (2026-06-12) — cancels at period end.
- Sentry env vars not set in Vercel (no prod error visibility) — check with
  `npm run validate:sentry-env`; set via `vercel env add` (operator).
- Data drift: the webhook now writes a correct, price-derived `subscription_plan`
  (future drift prevented). **Pre-existing** drifted rows (e.g. `admin@remynest.com`:
  is_premium=true, plan=FREE) are not auto-corrected until their next
  subscription event with a known price — a one-time data reconciliation is still
  advisable. `resolveSubscription` tolerates drift for premium/free.
- Dev uses prod Supabase (no staging); media bucket `memory-media` is public.
- Tech debt: duplicate export logic; two profile render paths; two search
  endpoints; schema not version-controlled; `npm audit` advisories.

## Active branch
`main` (production; auto-deploys) — **in sync with `origin/main` at `36107ed`**
(local notifications feature `60362fd` + lock `36107ed` **pushed/deployed**). `pod
install` done locally (plugin linked, OneSignal intact, project unchanged). The ONLY
remaining step is the operator's native **Release** Build 7 (archive + TestFlight) —
the installed binary predates the plugin + production APNs entitlement; see the
TestFlight checklist + `docs/features/local-notifications.md`. **Separately OPEN:**
the iOS WKWebView **OOM (SIGKILL)** from unoptimized full-res image decode on the
unpaginated memories/timeline feeds (diagnosed, unfixed) — orthogonal to reminders.
`cognition-v2` was the throwaway prototype (stale UI, 180 behind) — **not** to be
merged. `feat/capacitor-mobile` holds earlier mobile work (pushed, unmerged).

## Next priorities
P0: **on-device validation of native local notifications** (`cd ios/App && pod install`
→ open `App.xcworkspace` → physical iPhone → run the test plan in
`docs/features/local-notifications.md`); fix `/api/stripe/cancel`; fix/remove broken
OneSignal endpoints; confirm Sign in with Apple. P1: set Sentry env in Vercel;
Android build + store submission.

## Blockers
**Infrastructure: NONE** — the B1–B5 audit is **CLOSED** (B1/B2/B3/B5 done; B4 PITR
deferred post-launch by accepted decision — see Completed work). The remaining V1
gate is **product / App-Store work**. Top product-development blocker: **Apple
Guideline 3.1.1** — the Stripe web-checkout upgrade flow runs inside the iOS WebView
with no native-platform gate → near-certain App Store rejection. Ranked product plan
is the operator's current focus (see Next priorities).

## Recent commits
- `36107ed` chore(ios): commit pod install lock linking CapacitorLocalNotifications (pushed; feature now DEPLOYED — native Build 7 pending operator)
- `feat(reminders)` native iOS local notifications on `main` — on-device reconcile engine (`lib/native-reminders.ts` + `NativeReminderSync`), `@capacitor/local-notifications` pod added to the Podfile, OneSignal/AppDelegate/entitlements untouched; lint 0-new + web build ✓ (on-device pending operator)
- `fix(remy)` avatar crop calibration — tight square head crops for all 9 moods (measured)
- `d9fcb32` fix(middleware): bypass /public static assets (Remy blueprint sheet 307→/login→dashboard)
- `83a1c88` feat(remy): Avatar sprite sheet — single blueprint image + per-mood crop regions
- `013b9c6` feat(remy): Avatar real artwork — image rendering + mood crossfade, emoji removed
- `6e915de` feat(remy): Avatar Evolution V1 — blueprint-grounded mood system + dashboard header avatar
- `779f045` feat(remy): Export Engine V1 — PDF-ready ExportDocument + print page + download flow
- `aa652a4` feat(remy): Memory Books V1 — structured book model (cover/TOC/chapters from the biography)
- `c7aa4cf` feat(remy): Biography V1 — structured life narrative (pure composition of existing summaries)
- `b8dbb11` feat(remy): Story Mode V1 — guided narrative journey (pure composition on timeline backbone)
- `63b7a4a` feat(remy): Timeline V1 — visual narrative layer (pure synthesis of chapters/collections/connections)
- `b7e9a25` feat(remy): Notifications V1 — intelligence-driven updates layer (pure synthesis, dashboard card)
- `5e0fe01` feat(remy): Family Workspace Intelligence V1 — per-profile stats, family themes, observations
- `6f67254` feat(remy): Life Chapters V2 — time-based life periods (decade chapters from memory dates)
- `46c13e7` feat(remy): Connections V2 — diversity-ranked, narrative relationship discovery
- `ebe2f98` feat(remy): Collections V2 — theme-consolidated, deduplicated collections (category grouping)
- `6bbfd50` feat(dashboard): Remy Activity concise summary card + investigation findings
- `1938ae4` feat(dashboard): Remy Activity — collapse to 3 with in-place show more/less (presentation only)
- `c99a9a0` feat(reminisce): Reminiscence Mode V1 — caregiver/family era-based memory experience
- `9c0cfd9` feat(memories): Memory Date Adoption V1 — coverage card + /memory-dates backfill flow
- `d1d2a3c` feat(remy): Life Chapters V1 — narrative layer (chapters page + detail + dashboard)
- `0282b3e` feat(remy): Remy Connections V1 — relationship discovery (connections page + detail + dashboard)
- `bce6d2b` feat(remy): Remy Collections V1 — Organize layer (collections page + detail + dashboard)
- `29dbeef` feat(remy): Remy Activity Feed V1 — evidence layer
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
