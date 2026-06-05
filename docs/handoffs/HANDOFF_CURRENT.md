# Handoff — Current

> Update this after every major session. Keep it short and truthful. Date each
> revision.

**Last updated:** 2026-06-05 (Delete Account execution pass)

## Completed features
- Web app **live in production** (Vercel → `www.remynest.com`); launch-hardening
  merged to `main`: Playwright security automation, AI disclaimers, premium 402,
  GDPR export, legal pages (`/privacy`, `/terms`, `/cookies`), CRON_SECRET,
  `/api/health`, error-message sanitisation, Sentry wiring + error boundaries.
- Memory system (CRUD + AI enrichment + embeddings), reminders, semantic search,
  memory chat, insights, caregiver sharing, Stripe subscriptions (checkout/
  webhook/status), GDPR export.
- **Settings v1** (`/settings`): account info (edit name), export data, privacy
  links, danger-zone Delete Account; middleware-registered.
- **Delete Account**: code complete + hardened. FK confirmed
  `memories.user_id → auth.users(id)` (ON DELETE CASCADE, NOT NULL). Tombstone =
  **Admin-API-provisioned auth user**, id in `TOMBSTONE_USER_ID` env; raw
  `auth.users` SQL insert **removed**; RPC takes `tombstoneId` via options; RPC
  hardened to clear child reminders/relationships before deleting sole-owned
  profiles (RESTRICT-safe). Planner dry-run **validated against live schema**.
  Remaining = apply migration + provision tombstone + set env + run A–F on
  non-prod (see Immediate tasks).
- **Mobile**: Capacitor remote-URL wrapper; iOS build verified; native projects
  committed on `feat/capacitor-mobile`.
- **Compliance pack**: `docs/compliance/*` (privacy policy, ToS, data deletion,
  support, Apple labels, Play data-safety, permissions, AI transparency, risk
  audits, store listing, launch checklist).

## In progress
- Developer documentation system (this `/docs` set).

## Known issues (verified)
- ⚠️ `users` table **does not exist** → `save-onesignal`, `save-subscription`
  broken.
- ⚠️ `/api/stripe/cancel` **missing** → BillingSection cancel broken.
- ⚠️ `UserProfileDropdown` shows **hardcoded** profile data.
- ⚠️ Delete-account **migration not applied yet** and **tombstone not
  provisioned** / `TOMBSTONE_USER_ID` not set. Destructive A–F tests not yet run
  (must use a non-prod project — dev points at prod). FK strategy now resolved.
- ⚠️ **Sentry inactive** (env vars not set in Vercel).
- ⚠️ Dev uses **prod Supabase**; no staging.
- ⚠️ Media bucket `memory-media` is **public**.

## Open technical debt
- Export logic duplicated (`GDPRSection` vs `ExportDataSection`).
- Two render paths (dropdown via ProfileHub vs settings page).
- Two search endpoints. Schema not version-controlled. `npm audit` advisories.

## Deployment status
- Prod: live, `main` auto-deploys. `CRON_SECRET` set; Sentry env missing.
- **New env var required:** `TOMBSTONE_USER_ID` (provisioned tombstone auth user
  id) — unset locally and in Vercel; set after running `provisionTombstone()`.
- Branches: `feat/capacitor-mobile` (mobile, pushed), Delete Account + settings +
  these docs currently **uncommitted** on the working branch.

## Next priority
P0 in `roadmap/launch-roadmap.md`: apply+verify Delete Account migration; fix
Stripe cancel; fix/remove broken OneSignal endpoints; confirm Apple Sign In.

## Immediate tasks (Delete Account → production)
1. Apply `supabase/migrations/20260605120000_delete_account.sql` to the target DB.
2. Run `provisionTombstone()` once; set `TOMBSTONE_USER_ID` env (prod + preview).
3. Verify the `profiles` tombstone insert satisfies all NOT-NULL columns.
4. Run scenarios A–F + guard tests on a **non-prod** project; fix any failures.
5. Decide branch/commit strategy for the uncommitted Delete Account + docs work.
