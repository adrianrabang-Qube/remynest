# RemyNest — Pre-Launch Readiness Review

**Date:** 2026-06-05
**Branch audited:** `qa/playwright-phase1` (7 commits ahead of `origin`, **not merged to `main`**)
**Type:** Audit only. No code, `.env.local`, Vercel, or Supabase changes.

---

## 1. Executive Summary

Over this hardening cycle the branch closed most of the engineering launch
blockers: security/isolation is validated, public cron/notification endpoints are
authenticated, Sentry error tracking + error boundaries are wired, internal error
messages no longer leak to clients, a public `/api/health` liveness probe exists,
GDPR data export is live, and legal pages are published. **Lint, build, and the
E2E suites (auth-gate, cron-auth, health, plus the security/GDPR/premium projects)
pass.**

The remaining gaps are **operational, configuration, product, and compliance**
items — not code defects. The most important are: verifying Supabase
backups/PITR for sensitive health data, activating monitoring (set Sentry DSN +
point an uptime monitor at `/api/health`), ensuring `CRON_SECRET` is set in the
**Vercel** environment (the cron fails closed without it), cleaning E2E test data
from production, and merging/deploying the branch. Native app-store readiness has
not been started.

**The code on this branch is in good shape; launch is gated by a short
operational/compliance checklist (§8), not by code.**

---

## 2. Launch Readiness Score

**82 / 100** (web / PWA launch).

| Dimension | Score |
|---|---|
| Security / Auth / Authorization | 90 |
| Error handling & observability (code) | 88 |
| Monitoring activation (runtime) | 60 |
| Backup & recovery | 45 |
| GDPR / privacy / legal | 75 |
| Billing | 80 |
| Deployment readiness | 70 |
| App Store / Play Store | 10 |

(App-store score is low because it is out of scope for a web launch; it does not
block a web/PWA launch.)

---

## 3. Critical blockers

There are **no remaining code-level blockers** on this branch. There are a small
number of **operational/config blockers** that must be completed before flipping
production:

- **B1 — `CRON_SECRET` must be set in the Vercel environment.** The cron/
  notification endpoints fail **closed**; without it, reminders stop sending.
  (It is set in local `.env.local`; Vercel env is separate and could not be
  verified from here.)
- **B2 — Verify Supabase backups / PITR + run a test restore.** For a healthcare
  app, launching without confirmed backups of Postgres **and** Storage is a
  data-loss exposure. Currently **unverified** (see BACKUP_RECOVERY_REPORT.md).
- **B3 — Ship the branch.** It is unpushed and not merged to `main` (the
  production branch). Production currently does **not** contain any of this work.

All three are config/process steps, achievable quickly; none require code changes.

---

## 4. High-risk items

- **H1 — Monitoring is inert.** Sentry is integrated but `NEXT_PUBLIC_SENTRY_DSN`/
  `SENTRY_*` are not set, so nothing is captured; no uptime monitor is pointed at
  `/api/health`; no alerting configured.
- **H2 — GDPR deletion is not self-serve.** Export is live, but account deletion
  is a **dry-run scaffold only** (DELETE returns 501); erasure is by manual
  request. Acceptable interim only if a documented manual process exists.
- **H3 — Legal pages are unreviewed templates.** Privacy/Terms/Cookie are
  published but carry a counsel-review notice; Terms has a `[Jurisdiction]`
  placeholder. Counsel approval needed before public launch.
- **H4 — E2E test data in production.** 3 `remynest-e2e@example.com` accounts (+
  their profiles/memory/relationship rows) remain in the prod database; clean up
  before launch.
- **H5 — npm audit vulnerabilities.** `npm audit` reports issues (incl. critical)
  from the dependency tree (Sentry/Playwright); review/triage before launch.

---

## 5. Medium-risk items

- **M1 — Premium entitlement gaps.** Semantic search is enforced; **caregiver
  collaboration, memory-chat, and storage quota are not** (flagged product
  decisions in PREMIUM_ENFORCEMENT_REPORT.md). Free users currently exceed the
  defined plan for those.
- **M2 — No staging isolation.** Development runs against the **production**
  Supabase project; provision a staging project.
- **M3 — Billing edge cases untested.** Webhook idempotency, cancel/downgrade,
  failed-payment handling (QA_TEST_PLAN §2 P1) not exercised.
- **M4 — Notification/AI delivery untested.** OneSignal delivery, reminder cron
  timezones, and AI failure handling not E2E-verified.
- **M5 — Manual QA largely outstanding.** QA_TEST_PLAN functional sections beyond
  the automated security/GDPR/health/cron suites are not executed.

---

## 6. Low-risk items

- **L1 — `app/api/parse-reminder/route.ts` lacks try/catch** (P2).
- **L2 — Dead endpoints.** `send-reminders` / `send-notification` have no in-app
  callers; consider removing to shrink surface.
- **L3 — Sentry minor gaps.** Legacy `sentry.client.config.ts` vs
  `instrumentation-client.ts` (G2); `onRequestError` for Next 15 (G3); optional
  `tunnelRoute` (G5).
- **L4 — Bundle size** grew with Sentry (~88→~153 kB shared); tune if needed.

---

## 7. Go / No-Go recommendation

- **Web / PWA launch: CONDITIONAL GO** — proceed once the §3 blockers (Vercel
  `CRON_SECRET`, backup verification, merge/deploy) and the §8 pre-launch list are
  complete. The codebase is ready.
- **Native App Store / Play Store launch: NO-GO** — no native wrapper or store
  assets exist; this is a separate workstream.

---

## 8. Exact remaining tasks BEFORE production launch

1. Set **`CRON_SECRET`** in Vercel (Production + Preview). *(B1)*
2. Set **`NEXT_PUBLIC_SENTRY_DSN`**, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
   `SENTRY_AUTH_TOKEN` in Vercel to activate error tracking + source maps. *(H1)*
3. **Verify Supabase backups/PITR** (Postgres + Storage), define RPO/RTO, and run
   a **test restore**. *(B2)*
4. **Counsel review** of Privacy/Terms/Cookie; fill the Terms `[Jurisdiction]`. *(H3)*
5. **Clean up** the 3 `remynest-e2e` accounts + seeded rows from production. *(H4)*
6. Confirm a documented **manual GDPR deletion** process (until self-serve ships). *(H2)*
7. **Triage `npm audit`** findings. *(H5)*
8. Point an **uptime monitor** at `/api/health` with alerting. *(H1)*
9. **Push** `qa/playwright-phase1`, **merge to `main`**, deploy, and run a
   production smoke test (`/api/health`, login, create/read memory). *(B3)*

## 9. Exact remaining tasks AFTER launch

1. Implement **self-service GDPR deletion** (promote the dry-run scaffold; resolve
   soft-vs-hard + shared-profile policy).
2. Resolve & enforce **premium entitlements** (caregiver collaboration, memory
   chat, storage quota) per product decision. *(M1)*
3. Provision **staging** Supabase + environment isolation. *(M2)*
4. Execute the **full manual QA** plan (billing, notifications, AI, timeline,
   search, profile switching). *(M3–M5)*
5. Add **automated tests** for billing webhooks and notification flows.
6. Address Sentry minor gaps (G2/G3/G5); add `try/catch` to `parse-reminder`;
   remove dead notification endpoints.
7. Begin **App Store / Play Store** workstream (native wrapper + assets) if mobile
   distribution is desired.

## 10. Final recommendation

**Conditionally approve for a web/PWA production launch.** The engineering work on
`qa/playwright-phase1` is solid and verified — no code blockers remain. Treat the
launch as gated by the §8 operational checklist, with the non-negotiables being:
**(1) `CRON_SECRET` in Vercel, (2) confirmed Supabase backups with a test
restore, (3) Sentry DSN + uptime alerting live, (4) counsel-approved legal pages,
(5) production test-data cleanup, and (6) merge/deploy with a smoke test.** Defer
native app-store distribution to a dedicated workstream. Given the healthcare
data domain, **B2 (backups) should be considered a hard gate** before going live.
