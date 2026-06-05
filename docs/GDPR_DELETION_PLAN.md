# GDPR Deletion — Architecture & Dry-Run Plan (Launch Blocker #2)

**Date:** 2026-06-05
**Status:** Dry-run scaffold only. **No destructive code. No schema changes. No
production data changes. No disposable accounts.**
**Goal:** Validate the deletion architecture before any destructive implementation
is approved.

---

## 1. Decisions taken (this pass)

- **Mechanism:** Plan/scaffold only — no destructive code yet.
- **Shared owned profiles:** Treated as a **blocker pending product policy** (not
  deleted).
- **Verification:** **Logic / dry-run only** — no real deletes, no disposable
  accounts, validated read-only against the existing E2E owner account.

---

## 2. Exact deletion cascade (children → parents → auth)

Defined in `lib/gdpr/plan-user-deletion.ts` as `DELETION_ORDER`:

| # | Stage | Scope |
|---|---|---|
| 1 | `storage_media` | files referenced by `memories.cover_image_url` + `attachments[]` |
| 2 | `memory_clusters` | `user_id = account` |
| 3 | `memories` | `user_id = account` |
| 4 | `reminders` | `user_id = account` |
| 5 | `profile_relationships` | grants where `caregiver_account_id = account` (and others' grants to the account's owned profiles) |
| 6 | `caregiver_invites` | sent (`invited_by_account_id`) + received (`email`) |
| 7 | `device_registrations` | `user_id = account` |
| 8 | `memory_profiles` | `created_by_account_id = account` |
| 9 | `profiles` | `id = account` |
| 10 | `auth_user` | Supabase auth user (admin) |

Media/storage is removed first so no rows are orphaned from their files; the auth
user is removed last so the account exists throughout the cascade.

---

## 3. Validation / ownership checks

The planner ([lib/gdpr/plan-user-deletion.ts](../lib/gdpr/plan-user-deletion.ts))
computes, **read-only**:

- Per-stage **counts** of what would be deleted (head-only queries).
- `ownership.sharedOwnedProfiles` — owned care profiles that have **other**
  caregivers attached (`profile_relationships.caregiver_account_id != account`).
  Each is a **blocker** (deleting would destroy shared data for other users).
- `ownership.crossAuthoredMemories` — memories authored by the account inside
  profiles it does **not** own (flagged as a note, handling pending policy).
- `blocked` / `blockers[]` — true when policy must be resolved before deletion.

---

## 4. Endpoint (scaffold)

`/api/gdpr/delete-account` ([route](../app/api/gdpr/delete-account/route.ts)):
- **GET** → authenticated; returns the dry-run `UserDeletionPlan` (read-only,
  `executable: false`).
- **DELETE** → authenticated; returns **501** `DELETION_NOT_IMPLEMENTED`. No
  destructive path exists.

### Dry-run report shape
```json
{
  "mode": "dry-run",
  "executable": false,
  "account": { "userId": "...", "email": "..." },
  "steps": [{ "order": 1, "stage": "storage_media", "count": 0 }, ...],
  "totals": { "rows": 0, "mediaFiles": 0 },
  "ownership": { "sharedOwnedProfiles": [...], "crossAuthoredMemories": 0 },
  "blockers": ["..."],
  "blocked": true,
  "notes": ["Dry-run only: no data was modified.", "..."]
}
```

---

## 5. Tests

[e2e/gdpr-deletion.spec.ts](../e2e/gdpr-deletion.spec.ts) (project `gdpr-deletion`):

| Test | Result |
|---|---|
| GET returns dry-run plan with the **exact** cascade order | ✅ |
| Ownership check flags a shared owned profile as a **blocker** | ✅ |
| DELETE is disabled (501 `DELETION_NOT_IMPLEMENTED`) | ✅ |
| Unauthenticated access denied | ✅ |

**6 passed** (incl. setup). `npm run lint` ✅ · `npm run build` ✅.
No data modified.

---

## 6. Open decisions required before destructive implementation

1. **Soft vs hard delete** → if soft, requires a **schema** column (`deleted_at` /
   grace period) — needs approval.
2. **Shared owned profiles** → block deletion, reassign ownership, or delete and
   revoke others' access? (Critical System: caregiver workflows.)
3. **Cross-authored memories** (in others' profiles) → delete or retain?
4. **Storage deletion** strategy (bucket paths from references) and idempotency /
   partial-failure recovery.
5. **Confirmation + audit trail** for an irreversible operation.
6. **Where to execute** real deletion (staging vs prod; dedicated disposable
   account for first live test).

Destructive implementation should not proceed until 1–3 are answered.
