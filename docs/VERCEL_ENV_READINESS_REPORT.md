# Vercel Production Env Readiness Report

**Date:** 2026-06-05
**Project:** `adrianrabang-qubes-projects/remynest` (`prj_T31P1PN4qWDuwpfV0TY9jUbIWHK3`)
**Source:** authoritative — `vercel env ls` (CLI authenticated as `adrianrabang-qube`).
**Type:** Read-only audit. **No production variables were modified.**

---

## 1. Specifically-requested variables

| Variable | In Vercel? | Environments | Notes |
|---|---|---|---|
| **`CRON_SECRET`** | ✅ **SET** | Preview, Production | Added ~3h ago — resolves the cron fail-closed blocker |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ **MISSING** | — | Sentry client inert without it |
| `SENTRY_DSN` | ❌ **MISSING** | — | Server/edge Sentry inert |
| `SENTRY_ORG` | ❌ **MISSING** | — | Needed for source-map upload |
| `SENTRY_PROJECT` | ❌ **MISSING** | — | Needed for source-map upload |
| `SENTRY_AUTH_TOKEN` | ❌ **MISSING** | — | Needed for build-time source-map upload |

## 2. Other production variables present (confirmed)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_PREMIUM_MONTHLY_PRICE_ID`, `STRIPE_PREMIUM_YEARLY_PRICE_ID`,
`STRIPE_FAMILY_MONTHLY_PRICE_ID`, `STRIPE_FAMILY_YEARLY_PRICE_ID`,
`NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`, `RESEND_API_KEY`
— all in Production + Preview.

> Note: `STRIPE_ENTERPRISE_*_PRICE_ID` are referenced in `plans.ts` but not set —
> only relevant if an Enterprise plan is sold; not a launch blocker.

## 3. Assessment

- ✅ **Critical blocker cleared:** `CRON_SECRET` is present in Production →
  reminders will not break on deploy.
- ✅ Core service vars (Supabase, Stripe, OpenAI, OneSignal) present.
- ❌ **All Sentry vars missing** → after merge/deploy, Sentry will be a **no-op**
  (no error capture) and **source maps won't upload**. Monitoring is therefore
  **inactive** until these are added. High-priority, but **not deploy-breaking**
  (the app runs normally; Sentry just collects nothing).

## 4. Required action (with approval — not performed here)

Add to Vercel (Production + Preview) to activate monitoring:
```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_DSN production
vercel env add SENTRY_ORG production
vercel env add SENTRY_PROJECT production
vercel env add SENTRY_AUTH_TOKEN production   # secret
# (repeat for preview as desired)
```
No variables were added or changed in this audit.
