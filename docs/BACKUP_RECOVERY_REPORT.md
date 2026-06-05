# Backup & Recovery Readiness Report

**Date:** 2026-06-05
**Type:** Audit / documentation only. No Supabase data, settings, or schema
changed. (Backup configuration lives in the Supabase dashboard/Management API,
which is **not** accessible from this codebase — see §2.)

---

## 1. Current state (from the repository)

- **No backup/restore/PITR configuration or runbook exists in the repo.**
- [docs/LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) "Backup Recovery Validation"
  remains unchecked.
- Persistent data lives in **Supabase Postgres** (tables: `profiles`,
  `memory_profiles`, `memories`, `reminders`, `profile_relationships`,
  `caregiver_invites`, `memory_clusters`, `device_registrations`) and **Supabase
  Storage** (memory media).

## 2. What cannot be verified from here

Backup tier and PITR status are project settings exposed only via the Supabase
**dashboard** or **Management API** (requires a personal access token not present
in this environment). Therefore this report **cannot confirm** whether backups or
PITR are currently enabled — that must be checked by an operator. This is an
honest gap, not a pass.

## 3. What Supabase provides (reference)

- **Free plan:** no managed daily backups; PITR not available.
- **Pro plan:** daily backups (typically 7-day retention).
- **PITR add-on:** point-in-time recovery (e.g. 7–28 days) for finer RPO.
- **Storage** objects are not necessarily covered by Postgres backups and may
  need a separate backup strategy.

> Action required: confirm the project's actual plan and whether PITR is enabled.

## 4. Recovery readiness checklist (to complete before launch)

- [ ] Confirm Supabase plan (Pro or above for managed backups).
- [ ] Confirm **daily backups** enabled; record retention window.
- [ ] Decide on **PITR** (recommended for a healthcare app) and enable if needed.
- [ ] Confirm **Storage** (media) backup/replication strategy.
- [ ] Define **RPO/RTO** targets and document them.
- [ ] Perform a **test restore** into a scratch project and validate data + media.
- [ ] Document who can trigger a restore and how (access + steps).
- [ ] Add restore validation to the launch checklist sign-off.

## 5. Recovery runbook (template — fill in after verification)

1. **Detect & declare:** identify data-loss/corruption scope; declare incident.
2. **Choose target:** latest daily backup vs PITR timestamp (minimize data loss).
3. **Restore Postgres:** via Supabase dashboard (Backups → Restore) or PITR to a
   chosen timestamp; restore to a new project if validating first.
4. **Restore Storage:** recover media objects per the Storage backup strategy.
5. **Validate:** row counts + integrity for the core tables; spot-check media
   references resolve.
6. **Cut over & verify:** repoint env if restored to a new project; run smoke
   tests (`/api/health`, auth, memory read).
7. **Post-mortem:** record cause, RPO/RTO achieved, and follow-ups.

## 6. Conclusion

Backup/recovery is **unverified and undocumented** in the codebase. No managed
backup configuration can be confirmed from here. Before launch, an operator must
verify the Supabase plan/PITR, enable backups (incl. Storage), define RPO/RTO,
and perform a **test restore**. The checklist and runbook above are the path to
closing this P1.
