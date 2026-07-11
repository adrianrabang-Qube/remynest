# Final Launch Blockers

**Date:** 2026-06-05
**Branch:** `qa/playwright-phase1` → `main`
**Type:** Evidence-based summary. Reports only.

> "Merge to `main`" auto-deploys production on Vercel, so merge is treated as
> equivalent to **go-live** here.

---

## Already closed (evidence) — not repeated below
- **`CRON_SECRET` in Vercel:** ✅ present (Prod+Preview) — `vercel env ls`.
- **Merge conflicts:** ✅ none — `git merge-tree` + aborted dry merge (`.gitignore`
  auto-merges).
- **Lint / build / tests:** ✅ green — 19 passed / 0 failed (FINAL_PRE_MERGE_REPORT.md).
- **Code-level launch blockers:** ✅ none remaining.

---

## HARD launch blockers (must clear before merge/deploy)

### HB1 — Supabase backups UNVERIFIED
- **Evidence:** no management token / CLI auth available; cannot confirm plan,
  daily backups, PITR, or Storage backup (BACKUP_VERIFICATION_REPORT.md).
- **Why hard:** healthcare data; deploying to production without proven recovery is
  an unacceptable data-loss risk.
- **Close it:** complete BACKUP_OPERATOR_CHECKLIST.md (all criteria + test restore).

> **RC4 reconciliation (2026-07-11):** this is an **operator/infra** item, not a code
> blocker. The *policy* is DECIDED and authoritative in `docs/REMY_MASTER_STATE.md`:
> **daily Supabase backups are the accepted recovery baseline; PITR is intentionally
> deferred post-launch (cost)** — so "PITR off" is a decision, not an open blocker.
> What genuinely REMAINS for the operator (cannot be done from code): **(1)** confirm
> daily backups are actually **enabled** on the Pro plan; **(2)** establish a
> **Storage-bucket (`memory-media`, PHI) backup/replication strategy** — Postgres daily
> backups do NOT cover Storage objects (this is the highest-consequence residual gap);
> **(3)** perform + record a **test restore of DB + media** (RTO currently unproven).
> Track (1)–(3) via BACKUP_OPERATOR_CHECKLIST.md §2/§4/§5.

*(No other hard blockers were found.)*

---

## STRONGLY RECOMMENDED before launch (not strictly deploy-breaking)

### R1 — Sentry env vars missing in Vercel
- **Evidence:** all 5 Sentry vars absent (`vercel env ls`).
- **Impact:** post-deploy there is **zero error visibility** (Sentry no-ops; no
  source maps). App functions, but you'd be flying blind.
- **Close it:** SENTRY_ENV_SETUP_GUIDE.md.

### R2 — Production test data present
- **Evidence:** 3 `remynest-e2e` accounts + 6 rows still in prod
  (TEST_DATA_CLEANUP_VALIDATION.md).
- **Impact:** data hygiene; not user-facing. Clean up (plan ready, approval pending).

### R3 — Free-tier semantic-search 402 sign-off
- **Evidence:** branch enforces premium on `/api/search` + `/api/memories/search`.
- **Impact:** behavior change for free users; needs product acknowledgement.

### R4 — Legal pages counsel review
- **Evidence:** Privacy/Terms/Cookie are templates with a review notice; Terms has a
  `[Jurisdiction]` placeholder (LEGAL_COMPLIANCE_REPORT.md).
- **Impact:** compliance; recommended before public launch.

---

## POST-LAUNCH (non-blocking)
- GDPR self-service deletion (currently dry-run scaffold; export works; manual
  deletion interim).
- Premium entitlement gaps: caregiver collaboration, memory chat, storage quota.
- Staging environment isolation (dev currently uses prod Supabase).
- `npm audit` triage; manual functional QA; remove dead
  notification endpoints.

---

## Bottom line
- **Hard blockers remaining: 1** → HB1 (backups unverified).
- Everything else is recommended or post-launch.
- The **code/merge mechanics are ready** (green, conflict-free, `CRON_SECRET` set,
  schema-safe, instant Vercel rollback available).
