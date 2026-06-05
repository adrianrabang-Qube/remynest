# Production Test-Data Cleanup Plan

**Date:** 2026-06-05
**Project ref:** `wuyughbhryyjtwfharej` (production)
**Status:** PLAN ONLY — **nothing has been deleted.** Awaiting approval.

---

## 1. Exact data found in production (read-only inventory)

### Auth users (3) — `remynest-e2e`
| Account ID | Email |
|---|---|
| `131a2779-bfb9-44f1-91d9-89a00fe37a81` | remynest-e2e-foreign@example.com |
| `bd6aed96-d7f0-4d50-ae66-a709352830bc` | remynest-e2e-caregiver@example.com |
| `d8b7eef4-3457-443f-b344-1122335c0fad` | remynest-e2e-owner@example.com |

### Associated rows
| Table | Scope | Count |
|---|---|---|
| `profiles` | id ∈ the 3 accounts | **3** |
| `memory_profiles` | created_by ∈ accounts | **2** (`4a80c0d5` "RemyNest E2E Owner Profile A", `9f5fd3eb` "RemyNest E2E Foreign Profile B") |
| `memories` | user_id ∈ accounts (and in the 2 profiles) | **1** |
| `profile_relationships` | caregiver_account_id ∈ accounts / on the 2 profiles | **3** |
| `reminders` | user_id ∈ accounts | 0 |
| `memory_clusters` | user_id ∈ accounts | 0 |
| `device_registrations` | user_id ∈ accounts | 0 |
| `caregiver_invites` | invited_by ∈ accounts | 0 |

**Total to remove:** 3 auth users + 3 `profiles` + 2 `memory_profiles` + 1 `memory`
+ 3 `profile_relationships` = **12 rows + 3 auth users.** All other tables: none.

These are clearly-named synthetic test records (`remynest-e2e-*@example.com`,
"RemyNest E2E …", memory body "RemyNest E2E synthetic memory — do not use real
data."). No real user data is in scope.

## 2. Proposed deletion order (children → parents → auth)

1. `memories` where `memory_profile_id ∈ {4a80c0d5, 9f5fd3eb}` **or** `user_id ∈ accounts`
2. `profile_relationships` where `memory_profile_id ∈ {2 profiles}` **or** `caregiver_account_id ∈ accounts`
3. `memory_profiles` where `id ∈ {4a80c0d5, 9f5fd3eb}`
4. `profiles` where `id ∈ accounts`
5. `auth.users` — delete the 3 accounts via `auth.admin.deleteUser`

(reminders / memory_clusters / device_registrations / caregiver_invites: nothing
to delete.)

## 3. Safety

- **Scoped strictly** to the 3 `remynest-e2e` account IDs and their 2 owned
  profile IDs listed above — no wildcard deletes.
- Idempotent (delete-by-id/in-list).
- No schema change. No impact on real users (none share these IDs/emails).
- Recommend running against a confirmed backup (see BACKUP_VERIFICATION_REPORT.md)
  given it touches production.

## 4. Execution (only after approval)

A scoped Node script using the service role will perform steps 1–5 above and
print per-step deletion counts. **It will not run until you approve this plan.**

> ⚠️ Per instructions, no deletion has been performed. Approve to proceed, or
> request changes to scope.
