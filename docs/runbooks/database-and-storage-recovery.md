# Runbook 1 — Database & Storage Recovery

Postgres corruption, accidental deletion, restore-from-backup, PITR readiness, and
`memory-media` Storage loss. See the [DR plan](../DISASTER_RECOVERY_PLAN.md) §3/§5 for
RTO/RPO. **[OPERATOR]** steps run in the Supabase dashboard (project
`wuyughbhryyjtwfharej`).

> **Golden rule:** for accidental deletion, **STOP writing** to the affected scope first.
> The more the app runs after a bad delete, the more a point-in-time restore has to
> reconcile. If in doubt, put the app in a safe state (see the deployment runbook's
> "maintenance" note) before restoring.

---

## A. Accidental data deletion (rows / a table / a user's data)

**Detect:** user report of missing data; a migration/script that deleted more than intended;
an errant `delete_user_account` run.

**Impact:** scoped data loss. RPO ≤24h (daily backups) unless PITR is enabled.

**Immediate actions:**
1. Identify the blast radius: which table(s)/rows/user(s), and **when** the deletion happened.
2. If deletion is ongoing (a loop/script), **kill it** and revert the deploy that introduced it ([runbook 2](deployment-and-migration-rollback.md)).
3. Note the exact timestamp — it determines whether a daily backup or PITR is needed.

**Recovery:**
- **Small, known scope + you have the data elsewhere** (e.g. a GDPR export, a log): re-insert manually via the SQL editor. Prefer this for a handful of rows — no full restore needed.
- **Larger scope / unknown:** **[OPERATOR]** Supabase Dashboard → **Database → Backups** →
  restore the most recent daily backup **from before** the deletion. Restores are
  **full-database** (Supabase restores to a new state / project) — coordinate downtime and
  re-point the app if a new project ref results.
- **If PITR is enabled** (not at launch — LOCKED deferral): restore to the exact
  second before the deletion (minimal loss). Otherwise expect up to 24h RPO.

**Verify:** row counts / spot-check the restored records; confirm the app reads them; run a
smoke test (login → view memory → create memory).

**Prevent:** never run ad-hoc `DELETE` without a `WHERE` + a `SELECT count(*)` preview;
take a manual backup before any bulk operation; keep destructive scripts out of the app
runtime (they are operator steps).

---

## B. Postgres corruption / total DB loss

**Detect:** widespread read/write errors; Supabase status incident; integrity errors in logs/Sentry.

**Immediate actions:**
1. Confirm it's the DB (not the app): `/api/health` returns 200 (app up) but data ops fail → DB-side.
2. Check the **Supabase status page**; open a Supabase support ticket if it's their incident.
3. Declare **SEV1**; if data may be lost, start the [breach policy](../compliance/16-incident-response-policy.md) availability-breach path.

**Recovery:** **[OPERATOR]** restore the latest daily backup (Database → Backups). If
Supabase is mid-incident, follow their guidance/ETA. After restore, re-verify env points at
the correct project (`NEXT_PUBLIC_SUPABASE_URL` + keys) — if a new project ref was created,
update Vercel env and redeploy ([runbook 4](secrets-and-credential-rotation.md)).

**Verify:** smoke test + `scripts/check-production-env.mjs`; confirm the reminder cron and
Stripe webhook still authenticate.

---

## C. Failed migration

**Detect:** a migration applied in the SQL editor errored midway, or shipped code expects a
column/table that isn't there (or vice-versa).

**Key property:** RemyNest migrations are **forward-only** and applied by the operator in the
SQL editor. The **recent additive feature migrations** (`storage_ledger`, `ai_usage` ×2,
`memory_intelligence`, `moderation`, `reminder_processing_lease`, `reminder_local_confirmations`)
are **probe-gated** — their consuming code **degrades gracefully** when the table/column is
absent (features return "unavailable" rather than crash), so a *not-yet-applied* additive
migration is a **no-op**, not an outage. **Core/structural migrations** (the `delete_account`
RPC, `caregiver_authz_rls`, the reminder-lifecycle foundations, `memory_historical_dating`,
`people_intelligence`) are **not** probe-gated in the same way — the app expects that schema.
The dangerous direction is a **partially-applied or wrong** migration.

**Recovery:**
1. **Rollback block:** only the two newest migrations ship an explicit `-- ROLLBACK` SQL
   comment — **`20260711140000_memory_intelligence.sql`** and
   **`20260712120000_moderation_foundation.sql`**. If one of *those* half-applied, copy its
   rollback block into the SQL editor. **Older migrations have NO rollback block** — reverse
   them by hand (drop the added table/column/policy/trigger) if they were purely additive, or
   treat as data corruption → §B (restore) if they altered/backfilled existing data.
2. If code was deployed that depends on the migration and the migration is bad, **roll back
   the deploy** ([runbook 2](deployment-and-migration-rollback.md)) so code + schema match again.
3. Re-apply the corrected migration.

**Verify:** the affected feature works (or correctly reports "unavailable" if the table is
intentionally absent); no new Sentry errors.

**Prevent:** apply migrations in a **staging** project first (roadmap); **add a rollback
block to new migrations** (only the two newest have one today); keep new features
probe-gated so schema/code can be deployed independently.

---

## D. Storage (`memory-media`) loss or corruption — **HIGH residual**

**Context:** the private `memory-media` bucket holds all memory photos/videos (PHI).
**Postgres daily backups do NOT cover Storage objects.** There is currently **no bucket
backup** — this is the top DR gap ([DR plan §5](../DISASTER_RECOVERY_PLAN.md)).

**Detect:** media 404s / signed-URL failures while the DB is healthy; a bucket
misconfiguration or accidental object deletion.

**Impact:** memory **media** is unrecoverable if lost (text memories + metadata survive in
Postgres). **RPO currently unbounded.**

**Immediate actions:**
1. Confirm the bucket exists + is **private** (never make it public to "fix" access — that's a PHI exposure = breach).
2. Check whether objects are deleted vs. just unreachable (a signing/permissions issue → [runbook 3](dependency-outages.md)/[4](secrets-and-credential-rotation.md), not data loss).

**Recovery:** only possible if a backup/replica exists. **[OPERATOR] — enact BEFORE launch:**
- Stand up a **scheduled replication** of `memory-media` to a second bucket/region (Supabase
  Storage → a secondary, or an external object store via the Management API / a scheduled job).
- **Run a test restore** of a sample of objects and confirm signed-URL serving still works.
- Record the strategy + last-verified date in [`BACKUP_OPERATOR_CHECKLIST.md`](../BACKUP_OPERATOR_CHECKLIST.md) §4.

**Prevent:** the automation opportunity in [DR plan §8](../DISASTER_RECOVERY_PLAN.md);
until then, this is the accepted (but flagged) launch risk and the #1 post-launch DR item.

---

## E. Restore verification drill (do before launch, then periodically)

1. **[OPERATOR]** Take/identify a recent daily backup; restore it to a **throwaway** project.
2. Point a local build at it; run the smoke test (login → list memories → open media → create).
3. Restore a sample of `memory-media` objects (once the Storage strategy exists) and confirm serving.
4. Record the drill date + result in [`BACKUP_VERIFICATION_REPORT.md`](../BACKUP_VERIFICATION_REPORT.md).
5. **A backup is not "done" until a restore has succeeded.**
