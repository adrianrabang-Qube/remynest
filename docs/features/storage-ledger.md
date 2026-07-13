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
Both auth-gated (protect-by-default).

## Upload enforcement (wired 2026-06-23)
`lib/storage/upload-guard.ts` `enforceUploadQuota(userId, files)` — the pre-upload
guard. It sums the **total batch** bytes (`totalUploadBytes`), resolves pool members
(`lib/storage/pool.ts` `resolveStoragePoolMembers` → `[userId]` today — the family
seam), calls **`checkStorageQuota`** (no duplicated accounting), and returns the full
UI payload (`currentUsage`, `limit`, `remaining`, `projectedUsage`, `percentUsed`,
formatted + raw). A **0-byte batch always passes** (text-only memory / remove-only
edit are never blocked). It is injected **just before `buildMemoryMediaPayload`** (the
shared storage-write choke point) in **`POST /api/memories/create`** and **`PUT
/api/memories/[id]`** — covering every client upload path. On over-quota the routes
return **HTTP 413** `{ error, quota }` (structured, never throws). **Fails closed** —
a degraded usage read blocks an upload with files. On the edit path only the **new**
files count (kept attachments are already in the ledger). Not wired: a client-side
pre-check (future UI) — the server is authoritative.

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

## Storage UI + upgrade experience (2026-06-23)
- `lib/storage/format.ts` — pure client-safe `formatBytes` (no server imports).
- `components/storage/useStorageUsage.ts` — react-query `GET /api/storage/usage`.
- `components/storage/StorageUsageCard.tsx` — plan + used/limit/remaining + percent +
  bar. `full` variant in **Settings** (`/settings` Storage section), `compact` widget
  on the **Dashboard**. Upgrade CTA renders only when **not native**.
- `components/storage/StorageFullModal.tsx` — surfaces the upload **HTTP 413
  `{ error, quota }`** (current / limit / remaining / projected). Wired into the
  memories page **create + edit** mutations and the dashboard **CreateMemoryForm**
  (on 413 → `setStorageFull(quota)`); the optimistic rollback still runs.
  `memories/new` sends JSON metadata only (no binary upload) so it never 413s.
- `components/storage/StorageUpgradeModal.tsx` — reusable; **web** shows the storage
  tier ladder and reuses **`POST /api/stripe/checkout {plan, interval}`** (PREMIUM/
  FAMILY map to a Stripe price; STARTER has none → "Coming soon"). **No Stripe
  backend change.**
- `components/storage/ModalShell.tsx` — portaled-to-`document.body` overlay (WebKit
  rule), Escape / click-outside / scroll-lock.

**Apple 3.1.1 / 3.1.3 (authoritative):** every purchase entry point is gated by
`useIsNativePlatform()` (render, hide-first) + `isNativePlatform()` (handler
short-circuit). On native iOS there are **no plans, prices, checkout, external links,
or "manage/subscribe on the web" steering text** — only a neutral free-up-space
message. (The task's literal native example *"Manage your subscription on the web"*
was intentionally **not** used — it would violate the 3.1.3 anti-steering rule.)

## Capacity = composed entitlement (2026-07-13)
Capacity is no longer a direct `plan → storageGB` lookup: **`lib/storage/capacity.ts`**
(`resolveStorageCapacity(tier, extraGrants)`) composes the limit as the **sum of grants** —
today exactly one (the plan's included storage), so enforcement is byte-identical.
`StorageUsage.capacity` (additive field) exposes the grant breakdown for future UI.
Future sources — a **storage-pack booster SKU** (deferred product decision; operator
approval + usage data required; must solve the lapsed-pack retention state first),
**promotions**, **grandfathered** allocations — plug in as grants via the `extraGrants`
seam (webhook writes a grant row → `getStorageUsage` fetches + passes it). Grants attach
to the **plan owner** only; pool capacity = the owner's composed total. Do not add a
second capacity-resolution path. Authoritative rationale: CLAUDE.md → "Single source of
truth (2026-07-13)".

## Not in scope (future)
Plan pricing changes / new Stripe products (e.g. a STARTER price — and storage-pack
SKUs remain gated on the product decision above); storage-plan
mapping from billing (`resolveStorageTier` still defaults FREE); `storage_pools`
membership tables + per-profile family reporting UI.
