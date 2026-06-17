# Launch Blockers — Operator Runbook (authoritative)

**Date:** 2026-06-17 · **Supersedes:** `docs/FINAL_LAUNCH_BLOCKERS.md` (2026-06-05, stale).

Reconciled status of the V1 launch blockers from the launch-readiness audit, plus
**exact operator runbooks** (prerequisites · execution · validation · rollback) for
the items that require dashboard/operator action. **Verified read-only against
current source; no code changes were required for B2–B5** — the application code is
already correct for all of them; the gaps are runtime configuration only.

> `main` auto-deploys production on Vercel. **B1 is fixed in code** (commit
> `c8106e5`) but is **local-only until pushed** — push `main` to deploy it. B2–B5
> are dashboard/operator actions with no code dependency.

## Status summary

| ID | Blocker | Status | Type | Owner |
|----|---------|--------|------|-------|
| B1 | Middleware bounced authed users to /login | **Fixed in code** (`c8106e5`), pending push/deploy | code | push `main` |
| B2 | `memory-media` bucket is public (PHI exposure) | **OPEN** — operator config flip | operator (Supabase) | operator |
| B3 | Caregiver-authz RLS migration unapplied (write-IDOR) | **OPEN** — migration committed, not applied | operator (Supabase) | operator |
| B4 | Supabase backups / PITR unverified | **OPEN** — unverifiable from repo | operator (Supabase) | operator |
| B5 | Stripe LIVE keys + Sentry env in Vercel | **OPEN** — unverifiable from repo | operator (Vercel) | operator |

**No code change is required to clear B2–B5.** Each is a runtime/dashboard action.

---

## B2 — Flip `memory-media` bucket to private

**Why:** the bucket is public, so memory photos (PHI) are anonymously fetchable via
`…/object/public/memory-media/users/{userId}/memories/…`. The app already serves all
media via short-lived **signed URLs** (`lib/memory-media-signing.ts`); new uploads
store **paths**, legacy public URLs are re-signed on read. Flipping to private closes
the leak and **breaks no rendering** (signed URLs work on a private bucket; every
render path signs; `MemoryCoverImage` has a graceful fallback).

**Prerequisites**
- The signing code is deployed to production (it is — long-shipped, not pending).
- Supabase project admin access.

**Execution**
1. Confirm current state: Dashboard → Storage → `memory-media` → **Public bucket**
   toggle, or `curl -I "https://<project-ref>.supabase.co/storage/v1/object/public/memory-media/<any-known-path>"` (a **200** confirms the public leak).
2. Flip: toggle **Public bucket → OFF**, or run in the SQL editor:
   `update storage.buckets set public = false where id = 'memory-media';`

**Validation**
- Leak closed: the same anon `curl` now returns **400/403**.
- Signed reads work: open a memory with a photo in the app → image renders (Network
  shows `…/object/sign/…?token=`, 200).
- Legacy rows render (re-signed) + a NEW memory with a photo uploads and renders.

**Rollback (instant, no data change)**
- Toggle **Public bucket → ON**, or `update storage.buckets set public = true where id = 'memory-media';`. No migration to undo.

**Note (non-blocking):** the GDPR data export (`lib/gdpr/collect-user-data.ts`)
emits raw media references unsigned — after the flip **neither** resolves anonymously
(legacy public URLs → 403; new-format **bare storage paths** were never resolvable
URLs to begin with). Pre-existing export-completeness nit; does **not** block the
flip and needs no code change to make the flip safe (no render path is affected).

---

## B3 — Apply the caregiver-authz RLS migration

**Why:** `supabase/migrations/20260608180000_caregiver_authz_rls.sql` is committed
but **unapplied**. App-layer ownership checks are shipped, but until the DB policies
are applied, a direct PostgREST `INSERT` into `profile_relationships` /
`caregiver_invites` can self-grant a caregiver/owner relationship or forge an invite
for **any** `memory_profile_id` (write-IDOR). Verified the migration **closes the
IDOR** and **matches the legitimate flows** (owner seeds their own row; invitee
accepts a pending invite to their email; owner invites/revokes). SELECT policies are
intentionally unchanged. The migration is idempotent (`drop policy if exists`).

**Prerequisites**
- Supabase project admin access. Apply during low traffic (RLS enable is instant but
  safest off-peak).
- Pre-check existing policies (the migration's own header note):
  ```sql
  select schemaname, tablename, policyname, cmd, qual, with_check
  from pg_policies
  where tablename in ('profile_relationships','caregiver_invites')
  order by tablename, cmd;
  ```
  Drop any **permissive write** policy not replaced by name in the migration.

**Execution** (either path)
- CLI (if the project is linked): `supabase db push` (applies pending migrations).
- Dashboard: paste the full contents of
  `supabase/migrations/20260608180000_caregiver_authz_rls.sql` into the SQL editor
  and run.

**Validation**
- IDOR blocked: as User A, attempt a **direct** insert of a `profile_relationships`
  row for a `memory_profile_id` owned by User B (e.g. via the PostgREST REST API with
  A's JWT) → must now be **rejected** by RLS (was previously accepted).
- Legit flows still work (regression check) — perform each as a **real account**
  (the policies key on `auth.email()`, so test with actual signed-in users):
  (a) create a care profile → the owner relationship is seeded; (b) owner invites a
  caregiver (email) → invite created; (c) the invited user **accepts** → relationship
  created + workspace switch works; (d) the invited user **declines** another invite →
  status flips to declined; (e) owner revokes/removes a caregiver.
  *(Verified safe: the four authenticated flows in `app/(app)/dashboard/actions.ts`
  each satisfy the new policies — notably acceptInvite inserts the relationship while
  the invite is still `pending`, then flips it to `accepted` — and all service-role /
  GDPR paths bypass RLS.)*
- `select relrowsecurity from pg_class where relname in ('profile_relationships','caregiver_invites');` → both `t`.

**Rollback** — *prefer fixing the policy forward; any revert re-opens the write-IDOR.*
- ⚠️ The migration also runs `alter table … enable row level security` (sql:26, 95).
  **Dropping the new authz policies is NOT a valid rollback** — with RLS enabled and no
  write policy the tables become **deny-all**, breaking createProfile / inviteCaregiver
  / acceptInvite. To genuinely restore the prior (permissive) write behavior, do ONE of:
  ```sql
  -- (i) recreate a permissive write policy (keeps RLS enabled):
  create policy "tmp_permissive_write" on public.profile_relationships
    for all to authenticated using (true) with check (true);
  create policy "tmp_permissive_write" on public.caregiver_invites
    for all to authenticated using (true) with check (true);
  -- (ii) OR, only if RLS was previously DISABLED on these tables, turn it back off:
  -- alter table public.profile_relationships disable row level security;
  -- alter table public.caregiver_invites    disable row level security;
  ```
  Either option **re-opens the IDOR** — use only to restore service, then fix forward.

---

## B4 — Verify Supabase backups / PITR (hard gate)

**Why:** healthcare PHI in production with **no proven recovery** is an unacceptable
data-loss risk. Cannot be verified from the repo (no management token/DB access).

**Prerequisites**
- Supabase project owner access + the existing checklist `docs/BACKUP_OPERATOR_CHECKLIST.md`.

**Execution / Validation** (complete the checklist)
1. Confirm the plan tier supports **daily backups** and **PITR**; confirm **Storage**
   backup coverage for the `memory-media` bucket.
2. Define RPO/RTO targets.
3. **Perform a test restore** (restore to a scratch project or PITR to a recent point)
   and confirm data + storage integrity.
4. Record results in `docs/BACKUP_VERIFICATION_REPORT.md`.

**Rollback** — N/A (verification only; no production change).

---

## B5 — Verify production Stripe (LIVE) + Sentry env in Vercel

**Why:** `lib/stripe.ts` and `app/api/stripe/webhook/route.ts` hard-require
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (non-null) and the
`STRIPE_{PLAN}_{INTERVAL}_PRICE_ID` vars. A **test-mode** key or a **mismatched**
webhook secret silently breaks all real payments + subscription sync. Sentry no-ops
without its DSN (`enabled: Boolean(dsn)`), so missing vars = **zero prod error
visibility** (launching blind). Cannot be verified from the repo.

**Prerequisites** — Vercel project admin; Stripe + Sentry dashboards.

**Execution / Validation**
1. `vercel env ls` → confirm **Production** has: `STRIPE_SECRET_KEY` (must start with
   `sk_live_`), `STRIPE_WEBHOOK_SECRET`, and every `STRIPE_*_PRICE_ID` the checkout
   builds (see `app/api/stripe/checkout/route.ts`). Add any missing via
   `vercel env add <NAME> production`.
2. Confirm the **live** webhook endpoint in Stripe → its signing secret **matches**
   `STRIPE_WEBHOOK_SECRET` in Vercel; send a Stripe test event → 200 + subscription
   row updates.
3. Sentry: `npm run validate:sentry-env` (checks `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
   `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`). Add any missing in Vercel;
   redeploy; trigger a test error → confirm it appears in Sentry.

**Rollback** — env changes are reversible via `vercel env rm` / re-add; redeploy.

---

## After these are done
- **Hard blockers remaining → 0** once B1 is pushed + B2/B3/B4/B5 operator steps are
  completed and validated above.
- Remaining items are the audit's **App Store** track (icon, 3.1.1/IAP, OneSignal App
  ID), the **high/medium** code items, and **production risks** — none of which block
  the web go-live and all of which are tracked separately in the HANDOFF.
