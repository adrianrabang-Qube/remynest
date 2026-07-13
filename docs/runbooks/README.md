# RemyNest — Operational Runbooks

**Phase:** LA6 (2026-07-12). Step-by-step recovery procedures for production incidents.
Read the [Disaster Recovery & Business Continuity Plan](../DISASTER_RECOVERY_PLAN.md)
first for the dependency map, RTO/RPO objectives, and SPOF posture.

> **Conventions.** **[OPERATOR]** = a step performed in a provider dashboard/CLI (not from
> this repo). Every runbook follows: **Detect → Impact → Immediate actions → Recovery →
> Verify → Prevent.** Times are targets, not guarantees. When personal data (PHI) may be
> lost/exposed, also start the [breach policy](../compliance/16-incident-response-policy.md)
> (GDPR Art 33/34) in parallel.

## Runbooks

| # | Runbook | Use when |
|---|---|---|
| 1 | [Database & Storage recovery](database-and-storage-recovery.md) | Postgres corruption, accidental deletion, restore-from-backup, PITR readiness, `memory-media` Storage loss |
| 2 | [Deployment & migration rollback](deployment-and-migration-rollback.md) | A broken release is live, a bad migration was applied, or the environment/config is lost |
| 3 | [Dependency outages](dependency-outages.md) | Supabase / Stripe / OpenAI / OneSignal / Vercel / DNS is down; Stripe webhook backlog; reminder cron interruption |
| 4 | [Secrets & credential rotation](secrets-and-credential-rotation.md) | A secret leaked/expired, routine rotation, or restoring a lost environment |
| 5 | [Operational incident response](operational-incident-response.md) | Any incident — the top-level detect/triage/mitigate/recover/post-incident flow |

## Quick reference — first 5 minutes of any incident

1. **Is the site up?** Hit `https://www.remynest.com/api/health` → expect `{"status":"ok"}`. Timeout/5xx = app/Vercel; 200 = app process is alive (problem is downstream — check Supabase).
2. **Check provider status pages:** Vercel · Supabase · Stripe · OpenAI · OneSignal.
3. **Check Sentry** for a spike/new issue (if the DSN is configured).
4. **Declare a severity** (DR plan §6) and open the [operational IR runbook](operational-incident-response.md).
5. **If data may be lost/exposed:** treat as a possible breach — start the [breach policy](../compliance/16-incident-response-policy.md) clock in parallel.

## Emergency contacts / consoles (fill in [OPERATOR])

- Vercel project · Supabase project `wuyughbhryyjtwfharej` · Stripe dashboard · OpenAI · OneSignal · DNS registrar · Sentry org.
- Intake: `security@remynest.com` [CONFIRM provisioned] · fallback `admin@remynest.com`.
