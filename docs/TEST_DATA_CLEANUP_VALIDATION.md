# Test-Data Cleanup Validation

**Date:** 2026-06-05
**Re-verifies:** TEST_DATA_CLEANUP_PLAN.md
**Type:** Read-only re-check. **Nothing deleted.**

---

## 1. Re-verification result — inventory UNCHANGED ✅

Re-queried production (`wuyughbhryyjtwfharej`) at `2026-06-05T13:31:50Z`:

| Item | Plan | Re-verified | Match |
|---|---|---|---|
| auth users (`remynest-e2e`) | 3 | 3 | ✅ |
| `profiles` | 3 | 3 | ✅ |
| `memory_profiles` | 2 | 2 | ✅ |
| `memories` (user_id) | 1 | 1 | ✅ |
| `memories` (in owned profiles) | 1 | 1 | ✅ |
| `profile_relationships` (caregiver) | 3 | 3 | ✅ |
| `profile_relationships` (on profiles) | 3 | 3 | ✅ |
| `reminders` | 0 | 0 | ✅ |
| `memory_clusters` | 0 | 0 | ✅ |
| `device_registrations` | 0 | 0 | ✅ |
| `caregiver_invites` (sent) | 0 | 0 | ✅ |

The plan's inventory is **still accurate**. No new test data has appeared and none
has disappeared.

## 2. Account / profile IDs (confirmed)

- Accounts: `131a2779…` (foreign), `bd6aed96…` (caregiver), `d8b7eef4…` (owner)
- Profiles: `4a80c0d5…` (Owner Profile A), `9f5fd3eb…` (Foreign Profile B)

## 3. Scope safety re-confirmed

- All matches are scoped to the 3 `remynest-e2e@example.com` accounts and their 2
  owned profiles. No real-user rows are in scope.
- Deletion order in the plan (children → parents → auth) remains valid.

## 4. Status

The cleanup plan is **validated and ready to execute on approval**. **No deletion
has been performed.** Recommend executing only after a confirmed backup (see
BACKUP_OPERATOR_CHECKLIST.md), since it writes to production.
