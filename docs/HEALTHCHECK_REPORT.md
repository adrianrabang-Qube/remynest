# Healthcheck Endpoint Report

**Date:** 2026-06-05
**Scope:** Add a public liveness health endpoint for uptime monitoring.
No data/schema/billing/Stripe/OneSignal/cron-auth/Sentry-config changes.

> **⚠️ HISTORICAL SNAPSHOT (2026-06-05) — one detail superseded (RC2/LA6).** The payload
> below shows a `commit` (SHA) field; **RC2 removed it** (revision-fingerprinting hardening),
> so `GET /api/health` now returns only `{ status, service, timestamp }`. The design remains
> **liveness-only** (no downstream calls) — the deliberate, still-current choice (see
> [`runbooks/operational-incident-response.md`](runbooks/operational-incident-response.md) for
> how it's used in triage). A deep readiness variant remains an intentionally-unbuilt option.

---

## 1. What was added

- **`GET /api/health`** — [app/api/health/route.ts](../app/api/health/route.ts).
  Public, unauthenticated, dependency-free. Returns **200** with:
  ```json
  { "status": "ok", "service": "remynest", "timestamp": "<ISO>", "commit": "<sha|null>" }
  ```
  `Cache-Control: no-store`. `commit` comes from `VERCEL_GIT_COMMIT_SHA` when set.

- **Public route:** added `/api/health` to `PUBLIC_API_ROUTES` in
  [middleware.ts](../middleware.ts) so uptime probes reach it without a session.
  (Cron auth and all other allowlist entries unchanged.)

## 2. Design choice — liveness, not deep readiness

The endpoint intentionally makes **no external calls** (no Supabase/OpenAI/etc.):
- It reflects whether the app process is up and serving — a reliable, fast,
  cheap signal for uptime monitors.
- It avoids side effects and avoids false alarms from transient downstream
  latency, and cannot be abused to generate load on dependencies.

A deeper `/api/health?deep=1` readiness check (shallow DB ping) could be added
later if dependency-aware probing is needed.

## 3. Verification

- `npm run lint` ✅ · `npm run build` ✅ — route present as `ƒ /api/health`.
- E2E [e2e/health.spec.ts](../e2e/health.spec.ts) (project `health`): unauthenticated
  `GET /api/health` → **200**, `status: "ok"`, includes `timestamp`. ✅ passed.

## 4. Files

**Created:** `app/api/health/route.ts`, `e2e/health.spec.ts`, `docs/HEALTHCHECK_REPORT.md`.
**Modified:** `middleware.ts` (public allowlist), `playwright.config.ts` (test project).

## 5. Follow-up
- Point an external uptime monitor (e.g. Better Uptime / Pingdom / Vercel) at
  `/api/health` with alerting.
- Optionally add a deep readiness variant for dependency checks.
