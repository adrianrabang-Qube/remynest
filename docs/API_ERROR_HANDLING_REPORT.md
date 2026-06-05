# API Error-Handling Report (P1 — error-message leakage)

**Date:** 2026-06-05
**Scope:** Replace client-facing `error.message` responses with generic messages
while preserving server-side logging.
**Constraints honored:** No changes to `.env.local`, Supabase, Stripe, OneSignal,
cron auth, Sentry configuration, billing logic, or schema.

---

## 1. Audit of the 7 flagged routes

| Route | Finding | Action |
|---|---|---|
| `app/api/create-reminder/route.ts` | returned `error.message` (500) | **Fixed** → "Failed to create reminder" |
| `app/api/save-onesignal/route.ts` | returned `error.message` (500), no logging | **Fixed** → "Failed to save subscription" + added logging |
| `app/api/memories/create/route.ts` | returned `details: error.message` + `code` (500) | **Fixed** → generic only |
| `app/api/memories/[id]/route.ts` | PUT & DELETE returned `error.message` (500), no logging | **Fixed** → "Memory request failed" + added logging |
| `app/api/memories/route.ts` | `error.message` only in a **server log**; client already received a generic `{ error, requestId }` | **No change needed** (not a leak) |
| `app/api/stripe/checkout/route.ts` | `error.message` only in `console.error`; client already received `{ error: "Stripe checkout failed" }` | **No change needed** (not a leak; also billing) |
| `app/api/billing/status/route.ts` | **genuinely returns `error.message` to the client** (catch block) | **Not modified — billing excluded by constraint** (see §4) |

Net: **4 real client-facing leaks fixed**; 2 were false positives (server-log
only); 1 is a real leak in a billing route deliberately left for billing-approved
change.

---

## 2. Changes (generic responses + preserved logging)

- **create-reminder** — response now `{ error: "Failed to create reminder" }`;
  existing `console.log(error)` retained.
- **save-onesignal** — added `console.error("[save-onesignal] upsert failed", error)`;
  response now `{ error: "Failed to save subscription" }`.
- **memories/create** — removed `details`/`code`; response is `{ error: "Failed to
  create memory" }`. Full error still logged via the existing
  `logPipelineError(...)`.
- **memories/[id]** — both PUT and DELETE now log via `console.error` and return a
  generic `"Memory request failed"` (500).

### Intentionally retained
- `memories/create` still returns `error.message` for a
  **`MemoryAttachmentValidationError`** at **400** — this is a controlled,
  user-facing validation message (e.g. unsupported/oversized file), not internal
  detail. Safe by design.

---

## 3. Verification

- Leak scan of the four fixed routes: **no client-facing `error.message` /
  `details` / `error.code` remain** (only the intended validation message).
- `npm run lint` ✅ clean · `npm run build` ✅ compiled.
- Smoke E2E (`auth-gate`) ✅ **7 passed** — app healthy.

> Error-path responses aren't covered by automated tests (they require inducing
> backend failures); verified by static inspection + build. Server-side logging is
> preserved/added so failures remain diagnosable (and are captured by the
> Sentry server instrumentation once a DSN is configured).

---

## 4. Remaining (requires separate approval)

- **`app/api/billing/status/route.ts`** still returns `error.message` to the
  client in its catch block. This is a genuine leak, but the route is **billing**,
  which this workstream is constrained not to modify. **Recommended follow-up:**
  in a billing-approved change, replace it with
  `{ error: "Failed to load billing status." }` (the existing fallback string) and
  log the real error server-side.

---

## 5. Files created / modified

**Created:** `docs/API_ERROR_HANDLING_REPORT.md`.
**Modified:** `app/api/create-reminder/route.ts`, `app/api/save-onesignal/route.ts`,
`app/api/memories/create/route.ts`, `app/api/memories/[id]/route.ts`.

No env, schema, billing, cron-auth, or Sentry-config changes.
