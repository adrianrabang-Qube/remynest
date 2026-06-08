# Monitoring, Error Tracking & Operational Readiness — Launch-Risk Report

**Date:** 2026-06-05
**Type:** Audit only. No code, schema, or production-data changes.
**Severity:** P0 = launch blocker · P1 = must-fix · P2 = should-fix.

---

## Launch-risk summary

| # | Area | Status | Severity |
|---|---|---|---|
| 1 | Production monitoring / uptime | **None** | **P0** |
| 2 | Error tracking (Sentry/etc.) | **None** | **P0** |
| 3 | Cron / public endpoint authentication | **Missing** | **P0** |
| 4 | API error handling (info leakage) | Partial | **P1** |
| 5 | Backup & recovery | Unverified | **P1** |
| 6 | Healthcheck endpoint | None | **P1** |
| 7 | Logging coverage | Present (logs only) | **P2** |
| 8 | Env / staging isolation | Single project | **P1** |

---

## 1. Existing monitoring — ❌ None (P0)
- No APM/uptime/RUM tooling. `vercel.json` contains only a cron; `next.config.js`
  is minimal. The only observability is Vercel's runtime logs.
- [docs/LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) "Production Monitoring" remains unchecked.
- **Risk:** no uptime/latency/error-rate visibility or alerting; outages are
  discovered by users, not the team.
- **Recommend:** add uptime monitoring (e.g. health pings) + a metrics/alerting path.

## 2. Sentry integration — ❌ Not integrated (P0)
- No `@sentry/*` (or any error-tracker) dependency; no `sentry.*.config.*`, no
  `instrumentation.ts`. Source maps not configured for stack symbolication.
- **Risk:** unhandled exceptions and API 500s are invisible beyond raw logs; no
  aggregation, grouping, or alerts.
- **Recommend:** integrate Sentry (client + server + edge) with `instrumentation.ts`,
  release/source-map upload, and alert rules. (Separate implementation workstream.)

## 3. Server / API error handling — 🟡 Partial (P1; one P0 within)
- **API routes all use try/catch.** (The prior lone exception — a dead
  AI reminder-parser endpoint — has been removed.)
- **Information leakage (P1):** 7 routes return `error.message` directly to the
  client — [create-reminder](../app/api/create-reminder/route.ts),
  [save-onesignal](../app/api/save-onesignal/route.ts),
  [memories](../app/api/memories/route.ts), [memories/[id]](../app/api/memories/[id]/route.ts),
  [memories/create](../app/api/memories/create/route.ts),
  [billing/status](../app/api/billing/status/route.ts),
  [stripe/checkout](../app/api/stripe/checkout/route.ts). Raw DB/internal messages
  can disclose schema/internals; prefer generic messages + server-side logging.
- **🔴 Unauthenticated cron / notification endpoints (P0):**
  [cron/send-due-reminders](../app/api/cron/send-due-reminders/route.ts),
  [send-reminders](../app/api/send-reminders/route.ts), and
  [send-notification](../app/api/send-notification/route.ts) are in the middleware
  `PUBLIC_API_ROUTES` allowlist and perform **no caller authentication** (no
  `CRON_SECRET` / signature check). Anyone who knows the URL can trigger reminder
  /notification sends — abuse, spam, and OneSignal cost risk.
  - **Recommend:** require a `CRON_SECRET` (Vercel Cron `Authorization` header) and
    reject unauthenticated callers.

## 4. Logging coverage — 🟢 Present but logs-only (P2)
- ~**202** `console.*` calls across `app/` + `lib/`, many with structured tags
  (e.g. `[memory-chat-engine]`, request IDs) — good practitioner logging.
- **Gaps:** captured only in Vercel logs (limited retention, no alerting, no
  correlation across services); sensitive values must be confirmed not logged.
- **Recommend:** ship logs to a retained, queryable sink with alerts; audit for PII.

## 5. Backup & recovery — 🟡 Unverified (P1)
- No backup/restore/PITR references in the repo; [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
  "Backup Recovery Validation" is unchecked.
- Supabase may provide managed backups depending on plan, but this is **not
  documented or validated** here.
- **Recommend:** confirm Supabase backup tier/PITR, document the recovery runbook,
  and perform a test restore.

## 6. Production environment configuration — 🟡 (P1)
- Required env vars are present (Supabase, OpenAI, Stripe ×prices+webhook,
  OneSignal). `vercel.json` defines the reminders cron (`* * * * *`, every minute).
- **No `CRON_SECRET`** configured (see §3). **No healthcheck endpoint** for uptime
  probes (`/api/billing/status` is auth-gated, unsuitable).
- **No staging isolation:** development runs against the **production** Supabase
  project (observed earlier — E2E data was seeded into prod). This risks test data
  and accidental writes in production.
- **Recommend:** add `CRON_SECRET`; add a lightweight public `/api/health`; provision
  a separate staging Supabase project.

---

## Prioritized launch blockers (this audit)

1. **P0 — Unauthenticated cron/notification endpoints** (abuse/cost/spam; quick fix via `CRON_SECRET`).
2. **P0 — No error tracking** (Sentry) and **P0 — no production monitoring/alerting**.
3. **P1 — API error-message leakage** in 7 routes.
4. **P1 — Backup/recovery unverified**; **no healthcheck**; **no staging isolation**.
5. **P2 — One route without try/catch**; logging is log-only (no alerting/retention).

## Notes
- This is an audit; **no changes were made**. Each fix above is a separate, scoped
  workstream. The `CRON_SECRET` gate and the `error.message` cleanup are the
  fastest, highest-value hardening items and touch no schema/billing.
