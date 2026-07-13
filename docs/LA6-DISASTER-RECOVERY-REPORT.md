# RemyNest LA6 — Disaster Recovery & Business Continuity

**Date:** 2026-07-12  **Phase:** LA6 (production resilience — documentation-first)
**Method:** full DR/BC audit of the production surface → operational documentation +
runbooks + one safe operator script → 6-lens multi-agent review (SRE / Cloud Infra / DR
Specialist / Supabase / DevOps / Security). **Constraint:** no product/runtime behaviour
changed; no architecture redesign; no business-logic/subscription/AI change. Per the brief,
**operational findings became documentation/runbooks, not code**.

---

## 1. Disaster Recovery Score — **~82 / 100**

Strong recovery *primitives* already exist (stateless Vercel compute + instant rollback,
forward-only probe-gated migrations with rollback blocks, idempotent 500-retry Stripe
webhook, lease/reclaim reminder cron, graceful AI/push degradation, iOS device-local
reminder fallback). The gap holding the score down is **backup coverage of Storage** and
the fact that several controls are **operator-activated but unverified** (Pro-tier backups,
PITR-deferred RPO, uptime monitor, restore drill). LA6 closes the *documentation/runbook*
half; the residual is operator enactment + one real backup gap.

## 2. Business Continuity Score — **~80 / 100**

Dependency mapping, SPOF analysis, severity model, ownership, and per-scenario runbooks now
exist and are technically accurate against the code. The single-operator model + single
region are accepted launch postures (documented, not hidden). BC is limited mainly by the
same operator-activation items + the Storage-backup residual.

## 3. Backup Readiness

| Asset | Mechanism | Status |
|---|---|---|
| Postgres data | Supabase daily backups (Pro) | **[OPERATOR]** confirm enabled + retention ≥7d; **PITR intentionally deferred (LOCKED, cost) → 24h RPO accepted** |
| Storage `memory-media` (PHI) | **None** | **HIGH residual** — Postgres backups don't cover Storage; enact bucket replication + a test restore |
| Schema/migrations | Git (13 files, forward-only + rollback blocks) | ✅ In repo |
| Secrets/env | Vercel store + **[OPERATOR]** encrypted offline copy | Documented; `check-production-env.mjs` verifies presence |
| Config/deploys | Git + Vercel immutable deployment history | ✅ Instant rollback |

## 4. Single Points of Failure

**Hard SPOFs (all managed, multi-AZ services):** Vercel (hosting/cron), Supabase (DB/Auth),
DNS/domain. **High (partial):** Supabase Storage (no backup). Mitigation posture is
documented in the [DR plan §4](DISASTER_RECOVERY_PLAN.md); the most *likely and controllable*
failure is our own bad deploy/migration — covered by instant rollback + rollback blocks.
Stripe/OpenAI/OneSignal are **not** SPOFs (the core app runs without them; they degrade
gracefully).

## 5. Recovery Procedures Verified (runbooks created)

Every audited scenario now has an actionable, code-accurate recovery path:
- **DB corruption / accidental deletion / failed migration / restore / PITR readiness / Storage loss** → [runbook 1](runbooks/database-and-storage-recovery.md)
- **Broken release / Vercel rollback / migration revert / environment loss / native release** → [runbook 2](runbooks/deployment-and-migration-rollback.md)
- **Supabase / Stripe / OpenAI / OneSignal / Vercel / DNS outages · webhook backlog · cron interruption** → [runbook 3](runbooks/dependency-outages.md)
- **Leaked/expired secrets · rotation (per credential) · environment restoration** → [runbook 4](runbooks/secrets-and-credential-rotation.md)
- **Detect → triage → mitigate → recover → post-incident** → [runbook 5](runbooks/operational-incident-response.md)

## 6. Documentation Created

- **`docs/DISASTER_RECOVERY_PLAN.md`** — master DR/BC plan (dependency map, RTO/RPO, SPOF,
  backup strategy, severity, ownership, automation roadmap).
- **`docs/runbooks/`** — index + 5 scenario runbooks (above).
- **`scripts/check-production-env.mjs`** — operator env-integrity check (recovery
  automation; never prints values; fails non-zero on a missing required var).
- Reconciled two stale snapshots (`OPERATIONAL_READINESS_REPORT.md`, `HEALTHCHECK_REPORT.md`)
  with current-state banners so an operator isn't misled mid-incident.

## 7. Remaining Operational Risks

| Sev | Risk | Owner |
|---|---|---|
| **HIGH** | `memory-media` Storage has **no backup** (unbounded RPO) | **[OPERATOR]** enact replication + test restore |
| **MEDIUM** | Backups/PITR/plan-tier **unverified** from code | **[OPERATOR]** confirm via dashboard + restore drill |
| **MEDIUM** | No uptime monitor / Sentry alert rules **live** yet | **[OPERATOR]** configure (`/api/health` + DSN) |
| **MEDIUM** | Single region (Vercel + Supabase) | Accepted for launch; multi-region is roadmap |
| **LOW** | Postgres RPO up to 24h (PITR deferred) | **Accepted (LOCKED)**; enable PITR at scale |
| **LOW** | No offline secrets copy yet | **[OPERATOR]** create + keep current |

## 8. RTO / RPO Assessment

Targets set + documented ([DR plan §3](DISASTER_RECOVERY_PLAN.md)). Best cases are strong
(bad deploy RTO ≤15 min / RPO 0 via instant rollback; provider outages = 0 data loss,
self-recovering). The weak points are **data-loss RPO ≤24h** (daily backups; accepted) and
**Storage RPO unbounded** (the HIGH residual). RTO for a full DB restore (~2–4h) depends on
Supabase restore mechanics + is **[OPERATOR]**-verified in a drill.

## 9. Launch Readiness Impact

**No new engineering launch blocker.** LA6 raises operational readiness and gives the
operator the runbooks needed to respond to incidents. The two pre-existing operator items it
sharpens — **Storage backup + test restore** (HIGH) and **uptime/alerting activation** — are
the same items RC4/RC5 flagged; they remain **operator/infra tasks**, not code blockers.

## 10. Production Recommendation

**PROCEED** with the documented operator activation. Before/at launch, the operator should:
(1) confirm Supabase Pro + daily backups + retention and run a **restore drill**; (2) enact a
**`memory-media` Storage backup + test restore** (the HIGH residual); (3) configure the
**uptime monitor + Sentry alert rules**; (4) keep an **encrypted offline secrets copy** +
run `check-production-env.mjs` as a pre-deploy gate. None require code changes; all are
covered by the new runbooks.

---

## Multi-agent review outcome

The 6-lens review (SRE / Cloud Infra / DR Specialist / Supabase / DevOps / Security) was
run as a Workflow but the subagent fleet hit the **session limit** (all 6 agents), so — per
this repo's established fallback (RC3/LA4 did the same) — the review was **completed inline
in the main loop**, verifying every DR claim against the actual code.

**One material inaccuracy found + FIXED** (exactly the class the review targets — a false
runbook step is dangerous mid-incident): the runbooks claimed **"every migration ends with a
rollback block"** and listed storage-ledger/ai-usage as examples. Verified against
`supabase/migrations/*.sql`: only **2 of 13** migrations (`20260711140000_memory_intelligence`
+ `20260712120000_moderation_foundation`) actually ship a `-- ROLLBACK` block. Corrected both
runbooks to name the two that have one and to give the manual-reversal / restore path for the
other 11; also nuanced the over-broad "the app is probe-gated" claim to scope it to the
additive feature migrations (core/structural migrations are not probe-gated the same way).

**Verified accurate (no change needed):** the reminder cron's lease/reclaim + fail-closed
(401) behaviour; the Stripe webhook's signature-verify + idempotent `.eq()` + 500-retry
backlog self-drain; the iOS device-local reminder fallback (fires without OneSignal/cron/
APNs); `/api/health` liveness-only (no SHA, RC2); the in-memory rate limiter fails open; the
per-var degrade modes vs `.env.example`; and `check-production-env.mjs` (REQUIRED set matches
`.env.example`, never prints values, correct exit codes). No duplication/contradiction with
the existing backup docs or the GDPR breach policy (complementary + cross-referenced).

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors (the new script is 0-issue)
· `npm run build` green. Review completed inline (subagent session limit); 1 inaccuracy fixed.*
