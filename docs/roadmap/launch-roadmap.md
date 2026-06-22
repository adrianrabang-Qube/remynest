# Launch Roadmap

Derived from current code reality (see MASTER_SPEC + HANDOFF_CURRENT). Web app is
**live in production**; remaining work is hardening, fixing known breakages, and
mobile store readiness.

## 🎯 ACTIVE INITIATIVE (2026-06-21) — Memory Media Experience Upgrade
Transform memories from single-image into a modern multi-media experience. Storage
already accommodates it — `memories.attachments` is a **jsonb array of `{url, name,
mimeType}`** (+ `cover_image_url`) — so this is primarily **UI + the create/edit
pipeline** (**no schema redesign; backward compatible; no data-loss migration**).
- [ ] **Phase 1 (current): multiple photos per memory** — create with N images; edit
  add/remove images; preserve existing single-image memories.
- [ ] **Phase 2: gallery previews** — Facebook-album-style condensed grids (2 → `[A][B]`;
  3 → `[A]` / `[B][C]`; 4 → `[A][B]` / `[C][D]`; 5+ → `[A][B]` / `[C][+N]`) so a
  multi-photo memory is obvious at a glance.
- [ ] **Phase 3: detail carousel** — swipe left/right, pagination dots, mobile-first,
  smooth transitions.
- [ ] **Phase 4: full-screen viewer** — tap to expand, swipe through media,
  pinch-to-zoom, hi-res.
- [ ] **Fold in: memories/timeline image-decode OOM fix** — serve resized thumbnails
  (`lib/memory-media-signing.ts`) + paginate the feeds (multi-photo amplifies the OOM).
- **Future media (architect for, not now):** video, voice, audio, documents, PDFs —
  addable via the `attachments` `mimeType` field without another attachment redesign.

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
