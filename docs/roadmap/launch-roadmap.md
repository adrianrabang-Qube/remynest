# Launch Roadmap

Derived from current code reality (see MASTER_SPEC + HANDOFF_CURRENT). Web app is
**live in production**; remaining work is hardening, fixing known breakages, and
mobile store readiness.

## P0 — Critical (blockers / broken in prod)
- [ ] **Delete Account: apply migration + verify** — confirm `memories.user_id`
  FK target, replace raw `auth.users` insert (sentinel UUID or Admin-API),
  run scenarios A–F. (Apple 5.1.1(v) / Play requirement.)
- [ ] **Fix `/api/stripe/cancel`** (missing) — cancel is broken in `BillingSection`
  (or switch to Stripe Customer Portal).
- [ ] **Fix or remove `save-onesignal` / `save-subscription`** — they write to a
  non-existent `users` table.
- [ ] **Sign in with Apple** confirmed enabled (required since Google login is
  offered) — iOS submission blocker.

## P1 — Launch
- [ ] **Sentry env vars** in Vercel (currently no error visibility in prod).
- [ ] **Native push** for Capacitor (APNs key + FCM + OneSignal native init).
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
