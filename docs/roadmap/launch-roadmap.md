# Launch Roadmap

Derived from current code reality (see MASTER_SPEC + HANDOFF_CURRENT). Web app is
**live in production**; remaining work is hardening, fixing known breakages, and
mobile store readiness.

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

## ⛔ POST-LAUNCH — DEFERRED (do NOT implement now)
Voice-recording memories · voice transcription · AI memory summaries · Semantic Search
V2 · advanced AI memory intelligence · **audio/document/PDF uploads** · **Remy live
emotional animation system**.

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
