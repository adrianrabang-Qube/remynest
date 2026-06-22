# Feature: Storage Ledger (accounting foundation)

**Status:** foundation implemented 2026-06-23 (migration operator-applied). **No
billing / pricing / checkout** — this is only the accounting layer that future
storage subscriptions will depend on.

## What it is
Per-attachment storage accounting measured in **bytes**, kept in sync with the
single source of truth (`memories.attachments`) by a **database trigger** — so it
works without touching the frozen memory-media upload pipeline.

## Decision — incremental (maintained) vs dynamic (computed)
**Maintained incrementally via a trigger, recommended and implemented.** Reasoning:
- Usage reads + upload enforcement must be O(1)-ish; re-summing `jsonb` across all
  of a workspace's memories on every check does not scale.
- The upload pipeline is **frozen**, so app-level dual-writes aren't available — a
  DB trigger on `memories` keeps the ledger correct for *any* write path.
- Per-attachment rows enable family-pool `GROUP BY`, per-media analytics, and audit.
- Drift risk (the usual downside of incremental) is covered by
  `reconcile_storage_ledger()` — a dynamic rebuild from the source of truth, used
  for backfill and as a periodic repair job.

## Schema (`20260623120000_storage_ledger_foundation.sql`)
- **`storage_ledger`** — one row per attachment: `id, user_id, workspace_id
  (= memory_profile_id, NULL = My Nest), memory_id (FK CASCADE), attachment_id,
  file_size_bytes, media_type, created_at`, `unique (memory_id, attachment_id)`.
  RLS: a user may `select` only their own rows; writes only via the SECURITY
  DEFINER trigger / service role.
- **`sync_storage_ledger()`** trigger on `memories` `AFTER INSERT OR UPDATE OF
  attachments, memory_profile_id, user_id` — re-projects the row's attachments
  into the ledger. **Null/non-array/malformed-safe** (never raises — a failing
  trigger would block memory writes). DELETEs are handled by the FK cascade.
- **`reconcile_storage_ledger()`** — full rebuild from `memories` (idempotent
  backfill + drift repair). Run once after deploy.
- **`storage_account_usage`** view (`security_invoker`) — per-user
  `used_bytes` + `attachment_count`, the fast read path.

In RemyNest a *workspace* **is** the memory profile, so `workspace_id ==
memory_profile_id`; a separate `profile_id` column would be redundant.

## Plan abstraction (`lib/storage/plans.ts`) — config only, no pricing
`STORAGE_PLANS`: **FREE** 1 GB · **STARTER** 20 GB · **PREMIUM** 100 GB · **FAMILY**
100 GB (`pooled: true`). Placeholder limits. Separate from the frozen
`lib/billing/plans.ts`; the bridge is `resolveStorageTier()` (today: **FREE** for
everyone — the seam where future billing maps a subscription → a storage tier).

## Usage + enforcement (`lib/storage/usage.ts`, `lib/storage/enforcement.ts`)
- `getStorageUsage(userId, { memberUserIds?, tier? })` → `{ usedBytes, limitBytes,
  remainingBytes, percentUsed, tier, attachmentCount, memberUserIds }`. Sums the
  usage view across a **member set** (service-role client, **always explicitly
  scoped** by the id set). Single-user today (`[userId]`); a family pool passes
  every member id — same path, no redesign.
- `checkStorageQuota(userId, additionalBytes, { memberUserIds? })` → structured
  `{ allowed, projectedBytes, overageBytes, usage, reason? }`. **Never throws** and
  **fails closed** if the usage read is degraded (`usage.degraded`) — never approves
  an upload it could not verify. Byte-based, so videos/voice/documents are
  future-proof with no change.

## APIs
- **GET `/api/storage/usage`** → the usage summary for the authed user.
- **POST `/api/storage/check`** `{ bytes }` → projected-usage quota check.
Both auth-gated (protect-by-default). The check route is the enforcement
**primitive** — it is **not** yet wired into the (frozen) upload pipeline.

## Family-pool readiness (no later redesign)
The ledger keys per `user_id`; pooling is a query-time `SUM` over a resolved member
set. A future `storage_pools` / `storage_pool_members` mapping + passing the member
ids to `getStorageUsage`/`checkStorageQuota` yields a shared pool (e.g. Mary+John+
Sarah → one 100 GB FAMILY pool) **with no change to the ledger or accounting math**.

## Operator step (required to activate)
Apply the migration in the Supabase SQL editor (schema is dashboard-managed):
`supabase/migrations/20260623120000_storage_ledger_foundation.sql`. The final
statement backfills existing attachments. Until applied, the new code is dormant
(no existing UI calls it).

## Not in scope (future)
Plan pricing / Stripe checkout; upload-pipeline enforcement wiring; storage-plan
mapping from billing; `storage_pools` membership tables; UI (usage meter).
