# CRON_SECRET Hardening Report

**Date:** 2026-06-05
**Scope:** Authenticate public cron / internal notification endpoints. No schema
changes. No production data changes.

---

## 1. Endpoints audited (public, previously unauthenticated)

From the middleware `PUBLIC_API_ROUTES` allowlist, these performed no caller
authentication:

| Endpoint | Method | Role | In-app callers |
|---|---|---|---|
| `/api/cron/send-due-reminders` | GET | Vercel Cron target (`vercel.json`, every minute) | none (cron only) |
| `/api/send-reminders` | GET | legacy reminder sweep | none found |
| `/api/send-notification` | GET | sends a push to a user | none found |

`/api/stripe/webhook` is also public but already verifies a Stripe signature —
**left unchanged**. (The legacy singular reminder sender — an
unauthenticated-target notification endpoint — has since been removed.)

**Risk (before):** anyone with a URL could trigger reminder/notification sends —
abuse, spam, and OneSignal cost.

---

## 2. Implementation

- **Helper** — [lib/cron-auth.ts](../lib/cron-auth.ts): `authorizeCronRequest(req)`
  returns a `401` response unless the request carries
  `Authorization: Bearer <CRON_SECRET>`. **Fails closed** (rejects if
  `CRON_SECRET` is unset or the header is wrong).
- **Applied** at the top of all three handlers:
  [send-due-reminders](../app/api/cron/send-due-reminders/route.ts),
  [send-reminders](../app/api/send-reminders/route.ts),
  [send-notification](../app/api/send-notification/route.ts).

### Vercel Cron compatibility
When `CRON_SECRET` is set in the Vercel project environment, Vercel
automatically attaches `Authorization: Bearer <CRON_SECRET>` to scheduled cron
requests — so the existing `vercel.json` cron keeps working **once the env var is
set**. No `vercel.json` change required.

---

## 3. Tests

[e2e/cron-auth.spec.ts](../e2e/cron-auth.spec.ts) (project `cron-auth`):

| Test | Result |
|---|---|
| Unauthenticated GET → 401 (all 3 endpoints) | ✅ |
| Incorrect secret → 401 | ✅ |
| Correct secret → auth passes (400 on missing params, **no side effects**) | ✅ |

**5 passed.** The authorized case is proven without executing the reminder cron
or sending any notification (validation 400), so **no production data was
changed**. `npm run lint` ✅ · `npm run build` ✅.

---

## 4. Files created / modified

**Created:** `lib/cron-auth.ts`, `e2e/cron-auth.spec.ts`, `docs/CRON_SECURITY_REPORT.md`.
**Modified:** `app/api/cron/send-due-reminders/route.ts`,
`app/api/send-reminders/route.ts`, `app/api/send-notification/route.ts`,
`playwright.config.ts`.

No schema, billing, or production-data changes.

---

## 5. Required deployment step ⚠️

Because the gate **fails closed**, deployments must set the env var or reminders
will stop sending:

1. Add **`CRON_SECRET`** (a strong random value) to the Vercel project
   environment (Production + Preview). Vercel Cron will then auth automatically.
2. Set the same `CRON_SECRET` locally (e.g. in `.env.local`) for local cron use
   and for running the authorized E2E test.

Until `CRON_SECRET` is configured, the cron endpoints return 401 (safe default).

---

## 6. Remaining notes
- `send-reminders` / `send-notification` have no in-app callers; if they are truly
  unused, consider removing them to shrink the public surface (separate cleanup).
- Bearer comparison is a direct string match (standard for this use); a
  constant-time compare could be added if desired.
