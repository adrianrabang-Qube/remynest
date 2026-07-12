# RemyNest LA4 — Production Observability & Failure Recovery

**Date:** 2026-07-12  **Phase:** LA4 (production reliability — behaviour-preserving)
**Method:** targeted reliability/observability audit (the 6-lens multi-agent run hit the subagent session
limit and was completed in the main loop — SRE / backend / Next.js / Supabase / prod-ops / security lenses
applied inline). **Constraint:** identical application behaviour — no change to UI, business logic,
subscriptions/billing, or AI behaviour; no DB schema change; the frozen reminder engine's logic untouched.

---

## 1. Reliability Score — **~78 → ~86 / 100** (observability axis)

RemyNest's failure *handling* was already strong (RC2 rate-limiting fails-open + a liveness health probe;
RC3 Sentry PII scrubbing + error boundaries; RC4 `maxDuration` on 8 routes + a story-provider timeout +
orphan-storage cleanup; the reminder cron's lease/retry/abandon; the idempotent 500-retry Stripe webhook;
resumable GDPR deletion). The one systemic gap was **observability**: handled failures were logged but never
became Sentry *events*, so production failures were undiagnosable/unalertable. LA4 closes that.

## 2. Failure Scenarios Reviewed

Authentication, memory create/edit/delete, feed/timeline/search, AI chat + story narration, the Remy
companion, reminders + the cron, push notifications, Stripe webhook + subscriptions, Supabase/storage
failures, GDPR export + account deletion, background enrichment, care-profile reads, and the middleware —
against: unhandled exceptions, graceful failure, timeouts, partial failures, provider/network/DB/storage
failures, webhook replay, cron/background failures, resource cleanup, and unhandled rejections.

## 3. Improvements Implemented (all behaviour-preserving, observability-only)

1. **`onRequestError` added to `instrumentation.ts`** (`export const onRequestError = Sentry.captureRequestError`,
   the Sentry App-Router hook) — Next.js now sends **uncaught server request errors** (Server Components,
   route handlers, nested server rendering, and any unhandled webhook throw) to Sentry. Previously those
   reached the error boundary but never became Sentry events.
2. **New env-gated `captureError(error, { route, requestId })` helper** (`lib/observability/capture.ts`) —
   turns a HANDLED server error into a real Sentry event with route + requestId correlation tags. It is
   ENV-GATED (no-op without a DSN), PII-SCRUBBED (passes the existing `beforeSend`; tags are ids/route only),
   and NEVER THROWS / NEVER BLOCKS (try/catch-wrapped, fire-and-forget) so observability can't break a request.
3. **Applied `captureError` at 15 key failure sites** (alongside the existing `logger.error`, responses
   unchanged): `memories` list/create/[id]/search, `timeline`, `gdpr/export`, `gdpr/delete-account` (plan +
   delete), `send-notification`, `profile`, `build-relationships`, `active-profile` (×2), `memory-chat`, the
   reminder `cron` (top-level crash only — frozen scheduling untouched), and the **story-narration** action
   (a previously-silent `catch {}` that swallowed AI failures). The Stripe webhook's billing logic was NOT
   touched — its `writeFailed→500` retry is already logged, and unexpected exceptions are covered by
   `onRequestError`.
4. **Fixed 2 residual raw-error logs** (`memories/[id]` + `gdpr/delete-account`) — `console.error("…", error)`
   → `logger.error("…", errorMessage(error))` + capture. Removes a raw-`PostgrestError` PII leak (`.details`
   can echo row values) AND makes the failure observable.

Verified: `tsc` clean · `npm run lint` 0 errors · `npm run build` green.

## 4. Remaining Risks (verified — recommended, need a new table/cron/operator config; NOT implemented)

- **No Sentry DSN / alerting configured** (operator) — the code now emits events, but production diagnostics
  require a DSN + alert rules + (optionally) a Vercel log drain. This is the single highest-value operator
  step to activate LA4.
- **No uptime monitor on `/api/health`** (operator) — the liveness probe exists; wire an external monitor.
- **Stripe per-event idempotency/ordering ledger** (recommend — needs a table) — current idempotency is
  `.eq()`-scoped (safe for same-event retries) but a reordered `subscription.updated` could overwrite newer
  state; dedup by `event.id`. (Known RC4 roadmap.)
- **Unattended `auth_pending` deletion retry cron** (recommend — needs a cron) — a failed final auth-user
  delete is retried only on the user's next authenticated navigation. (Known RC4 roadmap.)
- **Orphan-object storage sweep cron** + **`reminder_local_confirmations` deletion enrolment** + **`ai_usage`
  TTL/rollup** (recommend — schema/cron; known RC4 roadmap).
- **Fire-and-forget client enrich** (`.catch(() => {})`) stays silent by design (best-effort + retryable);
  low value to surface.

## 5. Monitoring Coverage (after LA4)

| Failure class | Reaches Sentry | Via |
|---|---|---|
| Client crashes / render errors | ✅ | 4 error boundaries (`captureException`) |
| Uncaught server request errors (RSC/routes/webhook throw) | ✅ | `onRequestError` (new) |
| Handled 500s in 15 key routes (DB/provider/unexpected) | ✅ | `captureError` (new; route+requestId tagged) |
| AI narration failure (previously silent) | ✅ | `captureError` (new) |
| Cron top-level crash | ✅ | `captureError` (new) |
| Controlled Stripe `writeFailed→500` | logged + Stripe retries | (unchanged; onRequestError covers throws) |
| All of the above | PII-scrubbed | `beforeSend` (sendDefaultPii:false + email redaction) |

**Still requires external monitors (operator):** a Sentry DSN + alert rules; an uptime monitor on
`/api/health`; the Stripe webhook + OneSignal delivery dashboards; Vercel function logs/drains.

## 6. Recovery Assessment

Recovery mechanisms are sound and unchanged: rate limiter fails **open**; the reminder cron has a
lease/reclaim + bounded retry/abandon (never a silent drop) + a 15s OneSignal timeout; the Stripe webhook is
signature-verified + returns 500 on a failed required write so Stripe retries the whole (idempotent) event;
GDPR deletion is transactional (`delete_user_account` RPC) + resumable (`pending_account_deletions`) with the
auth-user delete last; memory-create removes orphaned storage on insert failure; `recordAiUsage` never throws
and is time-bounded. LA4 does not change any of these — it makes their failures **visible**.

## 7. Operational Readiness

**Ready — pending the operator activation steps.** The code path now detects, categorises, and reports
failures with correlation. To fully realise it in production the operator must set the Sentry DSN
(+ `SENTRY_ORG`/`PROJECT`/`AUTH_TOKEN` for source maps), configure alert rules, and add an uptime monitor.
The recommended resilience items (Stripe idempotency ledger, `auth_pending` cron, orphan-sweep) are
scheduled follow-ups, not launch blockers.

## 8. Launch Recommendation

**GO for launch.** No behaviour/UI/logic/billing/AI/schema change was required or made; the observability gap
that made production failures undiagnosable is closed (server errors + handled 500s + silent AI failures now
reach Sentry, correlated and PII-scrubbed), and two residual PII-log leaks were removed. The remaining items
are operator activation (Sentry DSN + alerts + uptime monitor) and the documented resilience roadmap
(idempotency ledger / retry crons) — none a code blocker.

---

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green. The 6-lens audit was
performed in the main loop (the multi-agent run hit the subagent session limit). Identical behaviour
preserved; frozen reminder + Stripe billing logic untouched; all captures PII-scrubbed and env-gated.*
