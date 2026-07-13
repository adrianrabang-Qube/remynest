# Runbook 3 — Dependency Outages

Per-dependency degradation + operator actions. See the [DR plan §2 dependency map](../DISASTER_RECOVERY_PLAN.md).
The design goal throughout: **degrade gracefully, never lose data, recover automatically
when the dependency returns.**

---

## A. Supabase outage (DB / Auth / Storage)

**Detect:** `/api/health` returns 200 (app up) but reads/writes fail; Supabase status
incident.

**Impact:** most features down (data + auth). **Text + media reads that were already loaded
may work until refresh.** iOS **device-local reminders still fire** (they don't need the
server).

**Actions:** confirm via the Supabase status page → open a support ticket if provider-side →
declare SEV1/2 → wait out / follow Supabase ETA. If it's corruption not an outage →
[runbook 1](database-and-storage-recovery.md). **Nothing to "fail over" to** (single
project) — this is an accepted SPOF for launch.

**Recovery:** automatic when Supabase returns; verify with a smoke test. No data
reconciliation needed (the app didn't write during the outage).

---

## B. Stripe outage + webhook backlog

**Detect:** checkout errors; Stripe status incident; entitlement changes not reflecting.

**Impact:** **billing only** — the core app (memories/reminders/AI) is unaffected. No new
purchases during the outage.

**Key resilience:** the webhook (`/api/stripe/webhook`) is **signature-verified** and
**idempotent** (writes scoped by `.eq(id|customer|subscription)`), and it **returns HTTP 500
on any failed required DB write** so **Stripe retries the whole event** (Stripe retries with
backoff for up to ~3 days). So a backlog **drains itself** when the outage clears — do not
manually replay unless Stripe shows exhausted retries.

**Actions:** wait out the outage. Afterwards, **[OPERATOR]** Stripe Dashboard → Developers →
Webhooks → confirm recent events show **succeeded** (not "failed" after max retries). For any
truly-stuck event, use Stripe's **"Resend"** — idempotency makes replay safe. Reconcile a
specific customer via the dashboard if needed.

**Prevent (roadmap):** a per-event idempotency ledger (dedup by `event.id`) to guard against
out-of-order delivery; documented, not built.

---

## C. OpenAI outage

**Detect:** Ask Remy / story narration / enrichment failing; OpenAI status incident.

**Impact:** **AI features only.** Memory CRUD, media, reminders, billing are **unaffected**.
Calls have a **30s timeout** (`AbortSignal`) and degrade to a structured **"unavailable"**
state; usage/errors are recorded (env-gated). Memory enrichment is **deferred + fire-and-
forget**, so a failed enrichment never blocks or loses a saved memory.

**Actions:** none required — it self-recovers when OpenAI returns. Optionally post a status
note. Do **not** retry storms (the timeout + graceful degrade already bound cost).

**Recovery:** automatic. A memory saved during the outage keeps its content; re-running
enrichment later (client-triggered) fills AI fields.

---

## D. OneSignal outage

**Detect:** web/Android push not arriving; OneSignal status incident.

**Impact:** **push delivery only.** Critically, **iOS reminders still fire via device-local
notifications** (`@capacitor/local-notifications`) — they are scheduled on-device and do not
depend on OneSignal/cron/APNs. So iOS users are largely unaffected for reminders.

**Actions:** wait out; verify afterwards with a test push. The reminder cron will keep
attempting server pushes; its **lease/reclaim + retry/abandon** logic means a failed send is
retried and never strands a reminder as permanently "processing".

**Recovery:** automatic. No data loss (reminder rows are unchanged by a failed push).

---

## E. Vercel outage (regional / provider)

**Detect:** `/api/health` times out or 5xx; Vercel status incident; site unreachable.

**Impact:** **total web + iOS outage** (the iOS shell loads the web URL). No data loss
(stateless compute; state is in Supabase).

**Actions:** confirm via the Vercel status page → this is a provider incident → declare SEV1
→ wait out / follow Vercel ETA. There is no same-provider failover for launch (documented
single-region posture). The reminder cron is also Vercel-hosted, so scheduled server pushes
pause; **iOS local reminders continue**.

**Recovery:** automatic when Vercel returns (stateless — nothing to restore). Verify with a
smoke test.

---

## F. Reminder cron interruption

**Detect:** due reminders not sending (server side); cron errors in logs/Sentry; a cron
tick 401 (missing/rotated `CRON_SECRET`).

**Impact:** **late/missed server-side pushes** only. iOS device-local reminders unaffected.

**Key resilience:** the cron (`/api/cron/send-due-reminders`, Vercel Cron every minute) uses
a **processing lease** (`PROCESSING_LEASE_MS` + `processing_at`): a row stuck "processing"
by a dead/timed-out tick is **reclaimed** by a later tick, and delivery has a **retry/abandon**
path — so a single interrupted tick self-heals on the next minute. It **fails closed** (401)
without `CRON_SECRET` (no accidental unauthenticated runs).

**Actions:** if 401s → the secret is missing/rotated → [runbook 4](secrets-and-credential-rotation.md).
If the schedule itself stopped → **[OPERATOR]** Vercel → Cron → confirm the job is enabled
(`vercel.json` defines `* * * * *`). Otherwise it self-recovers.

**Recovery:** automatic on the next healthy tick. Reminders that were due during the gap are
picked up (the query selects due-and-not-completed rows).

---

## G. DNS / domain outage

**Detect:** the domain won't resolve / cert errors; app unreachable while Vercel is healthy.

**Actions:** **[OPERATOR]** check the registrar + Vercel domain settings (DNS records, cert).
Ensure **auto-renew** + registrar **2FA** are on (a lapsed domain or DNS misconfig is a
self-inflicted SPOF). Keep registrar credentials in the secrets vault.

**Prevent:** monitor domain/cert expiry; the uptime monitor on `/api/health` catches
resolution failures too.
