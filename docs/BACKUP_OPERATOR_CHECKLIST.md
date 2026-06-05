# Backup Operator Checklist (Supabase)

**Date:** 2026-06-05
**Project ref:** `wuyughbhryyjtwfharej`
**Why this exists:** Backup/PITR status **cannot be verified from code/CLI access**
(no management token; CLI not authed) — see BACKUP_VERIFICATION_REPORT.md. An
operator with Supabase dashboard access must complete this checklist.
**This document does NOT claim backups are enabled.** Status is UNKNOWN until proven.

---

## 1. Plan tier

- **Where:** Dashboard → select project `wuyughbhryyjtwfharej` → **Settings →
  Billing** (or top bar plan badge).
- **Inspect:** the active plan (Free / Pro / Team / Enterprise).
- **PASS:** Pro or higher. **FAIL:** Free (no managed backups available).

## 2. Daily (scheduled) backups

- **Where:** Dashboard → **Database → Backups**.
- **Inspect/screenshot:** the **Scheduled backups** list — most recent backup
  timestamp and the retention window shown.
- **PASS:** backups present, recent (≤24h old), retention documented (≥7 days).
- **FAIL:** "no backups", empty list, or backups disabled.

## 3. Point-in-Time Recovery (PITR)

- **Where:** Dashboard → **Database → Backups → Point in Time** tab.
- **Inspect/screenshot:** whether PITR is **enabled** and its **recovery window**
  (e.g. 7 days).
- **PASS (recommended for healthcare):** PITR enabled; window recorded.
- **NOTE:** PITR is an add-on; if disabled, record the decision/risk acceptance.

## 4. Storage (media) backup strategy

- **Where:** Dashboard → **Storage** (buckets), and **Settings → Storage**.
- **Inspect:** how objects (memory media) are protected — standard Postgres
  backups do **not** necessarily include Storage objects.
- **PASS:** a documented Storage backup/replication approach exists.
- **FAIL:** no Storage backup strategy.

## 5. Test restore (proof)

- **Where:** Dashboard → Database → Backups → **Restore** (restore a daily backup
  or a PITR timestamp into a **scratch/new project**, not production).
- **Steps:** restore → validate row counts for `profiles`, `memory_profiles`,
  `memories`, `reminders`, `profile_relationships`, `caregiver_invites` →
  confirm Storage media references resolve.
- **PASS:** restore completes; data + media validated; RPO/RTO recorded.
- **FAIL:** restore unavailable or data/media missing.

---

## Pages / screenshots to capture for the record
1. Settings → Billing (plan tier).
2. Database → Backups → Scheduled (latest backup + retention).
3. Database → Backups → Point in Time (enabled? window).
4. Storage (buckets) + Settings → Storage.
5. Restore confirmation + post-restore validation notes.

## Overall pass criteria (all must hold to clear the gate)
- [ ] Plan = Pro+ 
- [ ] Daily backups enabled, recent, retention ≥7d
- [ ] PITR enabled (or risk explicitly accepted)
- [ ] Storage backup strategy documented
- [ ] Test restore completed and validated
- [ ] RPO/RTO documented

Until **all** are checked with evidence, treat backups as **NOT verified**.
