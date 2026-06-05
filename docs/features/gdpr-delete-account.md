# Feature: GDPR Delete Account

## Current implementation
Self-service account deletion (in-app + public info page), with ownership transfer
for shared profiles and anonymisation of cross-contributed memories. **Code
complete; SQL migration not yet applied; not yet runtime-tested end-to-end.**

## Architecture
- Planner (dry-run): `lib/gdpr/plan-user-deletion.ts` — counts + shared profiles
  (transfer-eligible) + cross-contributed memories.
- Executor: `lib/gdpr/execute-user-deletion.ts` — snapshot retained media → RPC
  (DB) → storage prefix cleanup (retain-aware) → auth deletion (last) → audit.
- RPC (migration): `supabase/migrations/20260605120000_delete_account.sql` —
  `delete_user_account(uuid, jsonb)` SECURITY DEFINER, transactional: transfer,
  tombstone, ordered deletes (steps 1–8).
- Failure recovery: `pending_account_deletions` + `lib/gdpr/retry-pending-deletion.ts`,
  wired into `app/(app)/layout.tsx` (next-login retry).
- Re-auth: enforced in the DELETE route (password for email; recent sign-in for
  OAuth).
- Tombstone author (`lib/gdpr/tombstone.ts`, id `…0001`) for anonymised
  cross-contributed memories.

## Deletion order
storage → memory_clusters → memories → reminders → profile_relationships →
caregiver_invites → device_registrations → (sole-owned) memory_profiles →
profiles → **auth user (last)**. `auth.users` has no cascade, so all explicit.

## Policies (approved)
- Shared owned profiles → **transfer** to an accepted successor (admin preferred,
  earliest tie); else delete.
- Cross-contributed memories → **anonymise** to tombstone (default) or **delete**
  (user choice). **Never reassign authorship to a real person.**

## Database dependencies
All core tables + `pending_account_deletions` + tombstone rows.

## API routes
`/api/gdpr/delete-account` (GET dry-run, DELETE execute), `/api/gdpr/export`.

## UI components
`components/profile/sections/DeleteAccountSection.tsx`,
`components/profile/DeleteAccountModal.tsx`, `app/account-deletion/page.tsx`
(public), surfaced in `app/(app)/settings/page.tsx` (Danger Zone).

## Limitations / open items
- **Migration not applied**; tombstone strategy pending `memories.user_id` FK
  confirmation (recommended: **sentinel UUID** if no FK; Admin-API auth user if
  FK→auth.users — not raw SQL insert).
- Not yet tested against scenarios A–F (own-only, transfer, retain, delete,
  storage, auth-failure recovery).
- Raw `auth.users` insert in the migration is unsupported — replace per audit.

## Future enhancements
Confirmation email; audit table; admin tooling; scheduled (grace-period) deletion.
