# Supabase Backup Verification Report

**Date:** 2026-06-05
**Project ref:** `wuyughbhryyjtwfharej`
**Type:** Verification attempt. No Supabase data/settings changed.

---

## 1. Result: NOT VERIFIABLE from this environment

Backup tier, daily-backup status, PITR retention, and Storage backup strategy are
**Supabase project settings** exposed only via the Supabase **dashboard** or
**Management API** (`https://api.supabase.com`, requires an `sbp_…` personal
access token). Neither is available here:

| Check | Evidence |
|---|---|
| Management/access token in env | **Absent** (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_MANAGEMENT_TOKEN`, `SUPABASE_PROJECT_REF` not set) |
| Supabase CLI installed/authed | **No** (CLI not installed; `--no-install` blocked; no cached login) |
| Data-plane access (service role) | Yes — but the service role **cannot** read project backup/PITR settings |

The service-role key only permits data-plane reads/writes, not project
administration. Therefore this report **cannot confirm** whether backups or PITR
are enabled. This is an honest gap, **not a pass**.

## 2. What must be verified by an operator (with dashboard access)

- [ ] **Plan:** confirm the project is **Pro or higher** (Free has no managed backups).
- [ ] **Daily backups:** Dashboard → Database → Backups — confirm enabled; record
  retention window (e.g. 7 days).
- [ ] **PITR:** confirm whether the PITR add-on is enabled and its window
  (recommended for healthcare data; finer RPO).
- [ ] **Storage backups:** confirm how Storage objects (memory media) are backed
  up — these are **not** necessarily covered by Postgres backups.
- [ ] **RPO/RTO:** document targets.

### How to verify via Management API (operator)
```bash
export SUPABASE_ACCESS_TOKEN=sbp_xxx   # from Supabase account → Access Tokens
curl -s https://api.supabase.com/v1/projects/wuyughbhryyjtwfharej/database/backups \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq
# returns { region, walg_enabled (PITR), pitr_enabled, backups: [...] }
```

## 3. Restore test — NOT performed

A restore test requires dashboard/Management-API access and a scratch target
project; it **could not be performed from here**. Required procedure:

1. Restore the latest daily backup (or a PITR timestamp) into a **new scratch
   project**.
2. Validate row counts for core tables (`profiles`, `memory_profiles`, `memories`,
   `reminders`, `profile_relationships`, `caregiver_invites`).
3. Validate Storage media references resolve.
4. Record RPO/RTO achieved; document who can trigger a restore.

## 4. Conclusion

Backup/PITR/Storage protection is **unverified**. For a healthcare app this is a
**hard pre-launch gate** — an operator must verify backups (Postgres + Storage),
confirm/enable PITR, and perform a documented test restore before go-live.
