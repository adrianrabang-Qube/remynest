# RemyNest — Disaster Recovery & Business Continuity Plan

**Phase:** LA6 (2026-07-12) · **Type:** Operational documentation. No runtime/product
behaviour changed. · **Owner:** Operator (single-operator model; see §7).

This is the **master DR/BC plan**. It maps every production dependency, sets recovery
objectives (RTO/RPO), identifies single points of failure, and links to the per-scenario
**runbooks** in [`docs/runbooks/`](runbooks/README.md). It **complements** — does not
replace — the existing operator docs:

- Backups: [`BACKUP_OPERATOR_CHECKLIST.md`](BACKUP_OPERATOR_CHECKLIST.md) ·
  [`BACKUP_RECOVERY_REPORT.md`](BACKUP_RECOVERY_REPORT.md) ·
  [`BACKUP_VERIFICATION_REPORT.md`](BACKUP_VERIFICATION_REPORT.md)
- GDPR/regulatory breach response (Art 33/34):
  [`compliance/16-incident-response-policy.md`](compliance/16-incident-response-policy.md)
- Env reference: [`../.env.example`](../.env.example) ·
  Env readiness: [`VERCEL_ENV_READINESS_REPORT.md`](VERCEL_ENV_READINESS_REPORT.md)

> **Scope note.** Backup/PITR/plan-tier status and Vercel/Stripe/OneSignal dashboard
> state **cannot be verified from this repository** (no management tokens). Where this
> plan states an objective or a "must", the operator confirms/enacts it via the relevant
> dashboard. Items requiring that are marked **[OPERATOR]**.

---

## 1. System overview (what can fail)

RemyNest is a server-rendered **Next.js 14.2.5** app on **Vercel**, wrapped for iOS by a
**Capacitor** shell that loads the **live production URL** (`https://www.remynest.com`) in
a WebView. There is **no offline app bundle** — the native shell is a thin window onto the
web app, so **web availability == app availability** on iOS (except device-local iOS
reminders, which fire without connectivity — see the dependency map).

Persistent state lives in **one Supabase project** (Postgres + Auth + Storage). Payments
are **Stripe** (web checkout only). AI is **OpenAI**. Push is **OneSignal**. Errors go to
**Sentry** (env-gated). The only scheduled job is the **reminder cron** (Vercel Cron,
every minute).

---

## 2. Dependency map & impact analysis

| Dependency | Powers | If it fails | Degradation | SPOF? | Recovery owner |
|---|---|---|---|---|---|
| **Vercel** (hosting/CDN/functions/cron) | The entire web app + API + cron | Total web+iOS outage | Hard down | **YES** | Operator + Vercel |
| **Supabase Postgres** | All data (memories, reminders, profiles, billing state, auth rows) | App loads but reads/writes fail | Hard down (most features) | **YES** | Operator + Supabase |
| **Supabase Auth** | Login/session | No new logins; existing sessions may persist briefly | Hard down (auth) | **YES** | Operator + Supabase |
| **Supabase Storage** (`memory-media`, private) | Memory photos/videos | New uploads + media viewing fail; **text memories still work** | Partial | High | Operator + Supabase |
| **Stripe** | Checkout, subscription webhooks | No new purchases; entitlement changes queue (webhook retries ≤3d) | Partial (billing only) | No (core app unaffected) | Operator + Stripe |
| **OpenAI** | Ask Remy, embeddings, summaries, story narration | AI features degrade to "unavailable"; **memory CRUD unaffected** | Partial (AI only) | No | Operator + OpenAI |
| **OneSignal** | Push notifications | Web/Android push stops; **iOS reminders still fire via device-local notifications** | Partial | No | Operator + OneSignal |
| **Sentry** | Error/crash telemetry | Loss of observability only (env-gated no-op) | Cosmetic | No | Operator |
| **Reminder cron** (Vercel Cron) | Server-side reminder delivery | Missed/late server pushes; iOS local notifications unaffected | Partial | No (lease/retry resilient) | Operator |
| **DNS / domain** (`remynest.com`) | Reaching the app at all | Total outage | Hard down | **YES** | Operator + registrar |

**Reading the SPOFs:** four hard single points of failure — **Vercel, Supabase
(DB/Auth), and DNS**. All are managed, multi-AZ services with their own HA, so the
realistic failure modes are *provider regional incidents* and *our own misconfiguration/
bad deploy/bad migration* — the latter being the most likely and the most within our
control (see the rollback runbook). See §4 for the SPOF mitigation posture.

---

## 3. Recovery objectives (RTO / RPO)

RTO = target time to restore service. RPO = maximum acceptable data loss (age of the last
recoverable state). These are **targets**, not SLAs, for a single-operator launch posture.

| Scenario | RTO (target) | RPO (target) | Basis / limiter |
|---|---|---|---|
| Bad deploy / broken release | **≤15 min** | 0 (no data loss) | Vercel instant rollback to the previous deployment |
| Bad migration (schema) | **≤30 min** | 0–min | Migrations are forward-only + probe-gated; rollback = revert the SQL / restore (see runbook) |
| Accidental data deletion (row/table) | **≤2–4 h** | **≤24 h** | Supabase **daily backup** restore (PITR deferred — see below) |
| Postgres corruption / loss | **≤4 h** | **≤24 h** | Restore latest daily backup **[OPERATOR: confirm Pro plan]** |
| Storage (`memory-media`) loss | **Unbounded until a backup strategy exists** | **Unbounded** | **HIGH residual** — Postgres backups do NOT cover Storage objects (§5) |
| Vercel regional outage | Provider-bound (min–hours) | 0 | Stateless compute; wait out or fail over (§4) |
| Supabase regional outage | Provider-bound (min–hours) | ≤24 h | Managed HA; restore/region options are Supabase-side |
| Stripe / OpenAI / OneSignal outage | Provider-bound | 0 (idempotent replay) | App degrades gracefully; no data loss |

**RPO reality (authoritative, LOCKED):** PITR is an **intentional post-launch deferral**
(cost). The launch RPO for Postgres is therefore **up to 24 hours** (daily backups) — an
**accepted, documented risk**, not an open blocker. Enable PITR at scale to tighten RPO to
minutes. The **Storage RPO is currently unbounded** until a bucket backup strategy is
enacted — this is the single highest-priority DR gap (§5, and the storage runbook).

---

## 4. Single points of failure — posture

| SPOF | Mitigation today | Residual risk / action |
|---|---|---|
| **Vercel** | Managed multi-AZ; instant rollback; stateless compute (no in-node state except the fail-open in-memory rate limiter) | Regional/provider outage = downtime. Accept for launch; the app is stateless so recovery is "redeploy/wait". Uptime monitor **[OPERATOR]** detects it. |
| **Supabase (DB/Auth)** | Managed HA + daily backups | Regional outage or corruption. **[OPERATOR]** confirm Pro-tier backups; consider PITR at scale; keep the restore runbook current. |
| **Supabase Storage** | Private bucket + signed URLs | **No backup** → §5. |
| **DNS / domain** | Registrar-managed | Keep registrar credentials in the secrets vault (§6 runbook); enable registrar 2FA + auto-renew **[OPERATOR]**. |
| **Single region** | One Vercel + one Supabase region | Multi-region is a post-launch scale item; documented in the regional-outage runbook, not built. |
| **In-memory rate limiter** | Fails **open** (never blocks on error) | Per-instance only; a distributed store is a documented upgrade (not a DR risk — it degrades to "no limit", never to an outage). |

---

## 5. Backup strategy (consolidated)

| Asset | Backup mechanism | Status | Gap / action |
|---|---|---|---|
| **Postgres data** | Supabase **daily** scheduled backups (Pro) | **[OPERATOR: confirm enabled + retention ≥7d]** | PITR deferred (LOCKED, cost) → 24h RPO accepted |
| **Storage `memory-media`** (PHI) | **None in place** | **HIGH residual** | **[OPERATOR]** enact a bucket backup/replication (see storage runbook) + run a test restore |
| **Schema / migrations** | Git (`supabase/migrations/*.sql`, 13 files) | ✅ In repo | Forward-only; rollback via revert + restore (runbook) |
| **Secrets / env** | Vercel env store (source of truth) | Operator-held | **[OPERATOR]** keep an encrypted offline copy (§ secrets runbook) — "environment loss" recovery |
| **Config** (`vercel.json`, `next.config.js`, `capacitor.config.ts`, migrations) | Git | ✅ In repo | Redeployable from git |
| **Deployment artifacts** | Vercel deployment history (immutable) | ✅ Vercel | Instant rollback to any prior build |

**Recovery verification (must be exercised, not assumed):** a backup is only real once a
**test restore** has succeeded. Run `scripts/check-production-env.mjs` before each deploy
to confirm environment integrity, and perform the periodic restore drills in the DB/Storage
runbook. The existing [`BACKUP_VERIFICATION_REPORT.md`](BACKUP_VERIFICATION_REPORT.md) +
[`BACKUP_OPERATOR_CHECKLIST.md`](BACKUP_OPERATOR_CHECKLIST.md) hold the step-by-step
verification.

---

## 6. Incident severity & flow

| Sev | Definition | Examples | Response |
|---|---|---|---|
| **SEV1** | Full outage / data loss / confirmed breach | Site down, DB unreachable, data deleted, PHI exposed | Immediate; all-hands; start the [operational IR runbook](runbooks/operational-incident-response.md) + (if PHI) the [breach policy](compliance/16-incident-response-policy.md) Art 33 clock |
| **SEV2** | Major feature broken, no data loss | Uploads failing, checkout down, cron stalled | Same-day mitigation; runbook |
| **SEV3** | Minor/degraded, workaround exists | AI slow/unavailable, push delayed | Next business day |
| **SEV4** | Cosmetic / no user impact | Sentry noise, log gaps | Backlog |

Detection: uptime monitor on `/api/health` **[OPERATOR]** + Sentry alerts **[OPERATOR]** +
Stripe/OneSignal dashboards. See the [operational IR runbook](runbooks/operational-incident-response.md).

---

## 7. Recovery ownership & operator responsibilities

Single-operator model — one person currently holds Incident Lead, Technical Responder, and
Data-Protection lead (see [breach policy §3](compliance/16-incident-response-policy.md)).
**Standing operator responsibilities for DR readiness:**

- **[OPERATOR]** Confirm Supabase **Pro** tier + daily backups + retention; record status in the backup checklist.
- **[OPERATOR]** Enact a **Storage bucket backup** + run a **test restore** (the HIGH residual).
- **[OPERATOR]** Configure the **uptime monitor** on `/api/health` + **Sentry alert rules**.
- **[OPERATOR]** Maintain an **encrypted offline copy of secrets** + registrar/Vercel/Supabase 2FA.
- **[OPERATOR]** Run a **restore drill** (DB + Storage) at least once before launch and periodically after.
- **[OPERATOR]** Keep provider status pages bookmarked: Vercel, Supabase, Stripe, OpenAI, OneSignal.

---

## 8. Automation opportunities (roadmap — not built here)

Documented for future work; none change current behaviour:

- **Storage backup automation** — scheduled `memory-media` replication to a second bucket/region (closes the HIGH residual).
- **PITR** — enable at scale to move Postgres RPO from 24h → minutes.
- **Stripe per-event idempotency ledger** — dedup by `event.id` for out-of-order/duplicate webhook safety (current: idempotent `.eq()` + 500-retry).
- **`auth_pending` retry cron** — unattended retry of a failed final auth-user deletion.
- **Orphan-object storage sweep** — reclaim uploaded-but-unattached objects.
- **Automated restore drills** in CI/staging; a staging Supabase project for migration rehearsal.
- **Distributed rate-limit store** (Upstash/Redis) for multi-instance guarantees.

---

## 9. Runbook index

See [`docs/runbooks/README.md`](runbooks/README.md):

1. [Database & Storage recovery](runbooks/database-and-storage-recovery.md) — corruption, accidental deletion, restore, PITR readiness, Storage loss.
2. [Deployment & migration rollback](runbooks/deployment-and-migration-rollback.md) — broken release, Vercel rollback, migration revert, environment loss.
3. [Dependency outages](runbooks/dependency-outages.md) — Supabase / Stripe / OpenAI / OneSignal / Vercel / DNS, webhook backlog, cron interruption.
4. [Secrets & credential rotation](runbooks/secrets-and-credential-rotation.md) — expired secrets, rotation per credential, environment restoration.
5. [Operational incident response](runbooks/operational-incident-response.md) — detect → triage → mitigate → recover → post-incident (technical; the GDPR path is the breach policy).
