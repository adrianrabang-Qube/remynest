# Runbook 5 — Operational Incident Response

The top-level flow for **any** production incident: **detect → triage → mitigate → recover →
post-incident**. This is the **technical/operational** runbook. When personal data (PHI) may
be lost, altered, or exposed, run the [GDPR breach policy](../compliance/16-incident-response-policy.md)
(Art 33/34 notification, breach register) **in parallel** — this runbook does not replace it.

---

## 1. Detect

Signals, in rough priority:
- **Uptime monitor** on `https://www.remynest.com/api/health` **[OPERATOR: configure]** — the
  primary "is it down" signal (liveness; 200 = app process alive).
- **Sentry** alerts **[OPERATOR: configure DSN + rules]** — handled 500s + unhandled errors,
  correlated by route/requestId (LA4). Env-gated: no DSN → no alerts.
- **Provider status pages** — Vercel, Supabase, Stripe, OpenAI, OneSignal.
- **User reports** — the fallback signal we want to avoid relying on.

---

## 2. Triage (first 5 minutes)

1. **Classify severity** (DR plan §6): SEV1 (outage/data-loss/breach) · SEV2 (major feature) ·
   SEV3 (degraded) · SEV4 (cosmetic).
2. **Localise the fault** with the health probe:
   - `/api/health` **times out / 5xx** → app or Vercel → [runbook 2](deployment-and-migration-rollback.md) (if just deployed) or [runbook 3E](dependency-outages.md) (Vercel outage).
   - `/api/health` **200** but a feature fails → **downstream**: identify which (Supabase / Stripe / OpenAI / OneSignal) via its status page + Sentry, then the matching [runbook 3](dependency-outages.md) section.
3. **Is data at risk?** If yes → also open the [breach policy](../compliance/16-incident-response-policy.md) and start the Art 33 clock (72h) — the clock starts at *awareness*, so start it early even if unconfirmed.

---

## 3. Mitigate (stop the bleeding — before root-causing)

- **Just deployed?** → **Vercel promote the last-good deployment** (instant rollback) — the
  single most common + fastest mitigation. Root-cause after service is restored.
- **Bad migration?** → run the migration's rollback block ([runbook 1C](database-and-storage-recovery.md)/[2B](deployment-and-migration-rollback.md)).
- **Runaway/abuse?** → rate limiting is already on the sensitive routes (fails open); if a
  specific actor, handle via Supabase/Stripe. 
- **Data being deleted?** → stop the offending process/deploy FIRST (minimise the restore window).
- **Provider outage?** → nothing to fix our side; communicate status, wait out, verify on recovery.

---

## 4. Recover

- Follow the specific runbook (1–4) for the failure class.
- **Data-loss incidents:** restore per [runbook 1](database-and-storage-recovery.md) (RPO ≤24h,
  daily backups; Storage = the HIGH residual).
- **Verify recovery** with the smoke test (below) + `scripts/check-production-env.mjs`.
- Confirm **no data reconciliation** is outstanding (e.g. Stripe webhook backlog has drained —
  [runbook 3B](dependency-outages.md)).

**Smoke test (post-recovery):** load `/api/health` → log in → view a memory (+ media) →
create a memory → open the reminders page → (web) reach a checkout entry point → confirm no
new Sentry errors.

---

## 5. Communicate

- **Internal:** note the incident, severity, timeline, actions in an incident log.
- **Users:** for SEV1/2, a brief honest status message (no speculation, no PHI).
- **App Store / support:** if iOS is affected, note it in support channels; the web-URL
  architecture means most fixes ship without a resubmission.
- **Regulator/data subjects:** only via the [breach policy](../compliance/16-incident-response-policy.md)
  (Art 33/34) — do not free-lance breach notifications.

---

## 6. Post-incident review (within a week of any SEV1/SEV2)

Blameless. Capture:
- **Timeline** — detection → mitigation → recovery, with timestamps.
- **Root cause** — the actual cause, not just the symptom.
- **What worked / what was slow** — did the runbook/monitor/backup do its job?
- **Actions** — concrete fixes + owners (e.g. "enable Storage backup", "add an alert rule",
  "tighten a migration"). Feed these back into this plan + the [automation roadmap](../DISASTER_RECOVERY_PLAN.md).
- **RTO/RPO actuals vs. targets** — did we meet §3 of the DR plan? If not, why?

**A DR plan is only as good as its last drill + its last post-mortem.** Keep both current.
