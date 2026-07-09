# Launch Roadmap

> **⚠️ SUPERSEDED (2026-07-09) — see [`docs/REMY_MASTER_STATE.md`](../REMY_MASTER_STATE.md) for the
> authoritative, source-verified launch state.** This file is retained as historical planning
> context. Known-stale lines below (do **not** act on them): "resolveStorageTier is a FREE stub /
> subscription integration is the big remaining gap" (FALSE — fully wired), "wire the landing store
> buttons to /download (no href today)" (already wired), and the "~72%" / "Restore Purchases required"
> framings. **Source code wins**; trust the master state.

Derived from current code reality (see MASTER_SPEC + HANDOFF_CURRENT). Web app is
**live in production**; remaining work is hardening, fixing known breakages, and
mobile store readiness.

## 📋 V1 LAUNCH-READINESS AUDIT (2026-06-23) — ~72% to launch
**Code-complete, submission-incomplete.** Core engineering + the hardest risk
surfaces are DONE (storage subscription/quota single-source-of-truth, multi-media
memories, reminders+push [Build 8 FROZEN], Apple 3.1.1/3.1.3 gating, account
deletion + GDPR, brand foundation, full Stripe lifecycle). Remaining ~28% is
launch-BLOCKING operator + submission work. **iOS ~90% ready; Android ~55%** (no FCM
/ manifest perms / signing). Corrections from prior roadmap: `/api/stripe/cancel` IS
implemented; `save-onesignal`/`save-subscription` are nonexistent (not broken);
**Sign in with Apple is NOT required** — login is email/password only (no OAuth);
Android adaptive icon + splash + iOS 1024 master + splash ARE done; Sentry is wired
(`instrumentation` + `withSentryConfig`) but env-unset.

### A. LAUNCH-BLOCKING
**Operator go-live (do first, 3 one-liners + verify):** apply the `storage_ledger`
migration `20260623120000` to prod Supabase (else `storage_account_usage` is missing
→ uploads fail closed) · push the 14 commits (auto-deploys) · set Sentry env + verify
the 6 Stripe vars + webhook secret match the live endpoint · smoke-test upload→quota→
checkout→webhook.
**Web funnel:** `/pricing`, `/download`, `/support`, `/account/subscription` are
**BUILT** (2026-06-23 — see HANDOFF; `BILLING_PLANS`-driven, 3.1.1-gated checkout +
web-only portal, no new billing logic). Remaining: **wire the landing store buttons
to `/download`** (no href today), set `NEXT_PUBLIC_APP_STORE_URL`/`_PLAY_STORE_URL` at
submission, resolve the `/terms` jurisdiction placeholder, populate legal company
particulars + **stand up the `support@/privacy@/dpo@/security@` mailboxes**.
**Brand rasters:** SVG masters + the 6 Remy states + the **generator script** now
exist (`scripts/generate-brand-assets.mjs`, full spec in `docs/brand/asset-production.md`)
→ remaining is the **operator run** `npm i -D sharp && node scripts/generate-brand-assets.mjs`
(true-square PWA icons 192/512 [the current 1536×1024 dups are broken], App Store 1024,
Play 512 + adaptive, maskable, favicon PNGs) + wire native icons (`@capacitor/assets` +
`cap sync`) + delete the dups; then **store screenshots** (6.7″ 1290×2796 etc.) + the
**Play feature graphic** (1024×500) + marketing graphics (📸/🎨).
**Android:** `google-services.json` (FCM) · manifest perms (POST_NOTIFICATIONS,
CAMERA, READ_MEDIA_IMAGES/VIDEO) · keystore + signed AAB.
**Store submission:** reviewer demo account + sample data + App Review notes · ASC
Privacy labels + Play Data Safety · content-rating questionnaires · Play pre-launch
report · confirm no OAuth login exposed.

### B. HIGH PRIORITY (before launch)
Set `MEMORY_IMAGE_TRANSFORMS_ENABLED=true` · change landing JSON-LD category off
`HealthApplication` · reword `AIInsightSummary` clinical copy · **[DONE] `/support`
built** (declare the support URL `https://www.remynest.com/support` at submission) ·
add UGC report/block + an EULA abuse clause (shared/caregiver profiles) · **[DONE]
web subscription-management page** (`/account/subscription` surfaces `/api/stripe/portal`,
web-only) · generate marketing/social raster exports.

### C. NICE-TO-HAVE
Regenerate `favicon.ico` · `/ai-transparency` page (doc 08 ready) · cookie-consent
posture w/ counsel · deep-links decision · align android `contentInset` · leave
ENTERPRISE price IDs unset for V1.

### D. POST-LAUNCH (deferred — not launch scope)
Voice/audio memories · transcription · AI summaries · semantic search V2 / advanced AI
· animated Remy · dark-theme rollout (tokens ready) · rollback/phased-release runbook.

### Recommended execution order
1. **Operator go-live** (migration + push + env + smoke-test). 2. **Legal/content
gates** (jurisdiction, mailboxes, JSON-LD, AI copy). 3. **Web funnel** (/pricing,
/download, /support, subscription mgmt). 4. **Brand rasters**. 5. **iOS submission**
(iOS could launch ahead of Android). 6. **Android submission** (longest track).
7. **Post-launch**.

## 🎯 LAUNCH PRIORITY (authoritative, 2026-06-23) — App-Store launch, NOT advanced AI
The memory-media + storage + branding work is largely **DONE** (11 unpushed commits on
`main`; see HANDOFF). Focus shifts to **launch readiness**. Order:

### 1. Memory-system completion
- [x] Multi-photo uploads (create + edit)
- [x] Storage accounting (`storage_ledger`, **byte-based, total-per-user**)
- [~] Storage **usage UI** (settings + dashboard done; complete near-limit/warning states)
- [x] Storage plan **enforcement** (`enforceUploadQuota` → HTTP 413)
- [~] Storage-limit **upgrade modal** (`StorageFullModal` + `StorageUpgradeModal` done;
  complete the end-to-end flow)
- [ ] **Subscription integration** — map a Stripe subscription → a storage tier
  (`resolveStorageTier` is a FREE stub); make storage plans purchasable; limit reads
  from the real plan. **← the big remaining gap.**

### 2. Media expansion
- [x] Photo + video memories; mixed-media gallery; byte-based accounting across media.
- [ ] **Revisit the 25 MB per-file cap** — storage is enforced by **total-per-user, NOT
  per-file** (`lib/memory-media.ts`).
- POST-LAUNCH: audio / voice / documents / PDF uploads (must reuse the SAME accounting).

### 3. Productization
- [~] Branding **foundation** done (tokens, SVG logos, app-icon/OG routes, guidelines)
- [ ] Raster exports (App Store 1024 / Play 512 + adaptive / social / true-square PWA)
- [ ] Landing page · marketing site · download redirects · subscription pages
- [x] Legal pages (`/privacy`, `/terms`) exist

### 4. App-Store launch prep
- [ ] Screenshots · metadata · **Restore Purchases** flow · subscription disclosures ·
  launch checklist

## ⛔ POST-LAUNCH — DEFERRED (do NOT implement now; reaffirmed 2026-06-23)
**Remy Live Companion** + emotional animation in ALL forms (**Rive animations · Lottie
animations · emotional state machines · live reactions** · animation triggers ·
companion framework — do not even evaluate Rive vs Lottie) · Voice-recording memories ·
voice transcription · AI memory summaries · Semantic Search V2 · advanced AI memory
intelligence · **audio/document/PDF uploads**.

## 🔒 FROZEN
Reminders · push delivery · OneSignal · iOS notification permissions · notification infra.

## ✅ Reminder system — DONE + PROTECTED (2026-06-21)
Native local notifications + My Nest reminders + foreground banner + form reset are
**shipped and on-device-validated** (TestFlight Build 8; lock / background / foreground
all PASS; create/store/schedule/dashboard PASS). **Frozen — bug-fix only,
investigation-first** (see the CLAUDE.md protection rule).

## P0 — Critical (blockers / broken in prod)
- [x] **Delete Account** — DONE: migration applied, tombstone provisioned
  (`TOMBSTONE_USER_ID` set), A–F scenarios validated PASS against live DB.
- [ ] **Fix `/api/stripe/cancel`** (missing) — cancel is broken in `BillingSection`
  (or switch to Stripe Customer Portal).
- [ ] **Fix or remove `save-onesignal` / `save-subscription`** — they write to a
  non-existent `users` table.
- [ ] **Sign in with Apple** confirmed enabled (required since Google login is
  offered) — iOS submission blocker.

## P1 — Launch
- [ ] **Sentry env vars** in Vercel (currently no error visibility in prod).
- [x] **iOS reminder notifications** — DONE: native local-notification scheduling +
  OneSignal native init + production APNs entitlement shipped + on-device validated
  (Build 8). See the "Reminder system — DONE + PROTECTED" section above. (Android push
  still pending — see Android build.)
- [ ] **Android build** — install SDK, build signed AAB (iOS build already green).
- [ ] **Store submission** — App Store + Play (use `docs/compliance/*`:
  listings, data-safety, privacy labels, permissions, risk audits).
- [ ] **UserProfileDropdown real data** — remove hardcoded profile object.
- [ ] **Settings polish** — surface Billing; de-duplicate export logic; reconcile
  dropdown vs settings-page render paths.
- [ ] **Confirm Supabase backups/PITR posture** (PITR deferred — keep documented).

## P2 — Post-launch
- [ ] Notification preferences backend (`notification_preferences`).
- [ ] Security settings (password/email change, sign-out-all, MFA).
- [ ] Private media bucket + signed URLs (currently public).
- [ ] Consolidate `/api/search` + `/api/memories/search`.
- [ ] Staging environment (dev currently uses prod Supabase).
- [ ] Schema-as-migrations (schema currently dashboard-managed).
- [ ] `npm audit` remediation (Next.js 14.2.5 / postcss).

## P3 — Future
- [ ] Voice memories + transcription.
- [ ] Caregiver collaboration UI + granular permissions.
- [ ] Cognitive-insight expansion (non-clinical) + AI evals/guardrails.
- [ ] Cluster management UI; recurring reminders; offline capture.
- [ ] EU AI Act transparency posture as AI scope grows.
