-- My Nest (PERSONAL) reminders.
--
-- Enables the Reminder Center for the PERSONAL workspace ("My Nest") using the
-- app-wide convention already used by memories / timeline / search:
--     memory_profile_id IS NULL  +  user_id = owner
-- The app code (app/(app)/reminders/page.tsx) now reads/writes personal reminders
-- with .is("memory_profile_id", null).eq("user_id", auth user). CARE reminders are
-- unchanged (still scoped by memory_profile_id).
--
-- ⚠️ OPERATOR — the `reminders` table is DASHBOARD-MANAGED (not created in any
-- migration). VERIFY the current state in the Supabase SQL editor BEFORE applying,
-- and apply only the parts that are actually required:
--
--   -- (a) is the column nullable already?  (want: YES)
--   select is_nullable from information_schema.columns
--     where table_name = 'reminders' and column_name = 'memory_profile_id';
--
--   -- (b) do existing policies already admit personal rows? is RLS even enabled?
--   select relrowsecurity from pg_class where relname = 'reminders';
--   select polname, cmd, qual, with_check from pg_policies where tablename = 'reminders';
--
-- This migration is idempotent and ADDITIVE (Postgres RLS policies are OR-ed, so the
-- existing CARE policies are unaffected). It intentionally does NOT toggle RLS
-- enablement: if RLS is currently DISABLED on reminders, do NOT enable it here without
-- first confirming CARE-profile policies exist (enabling RLS with only these personal
-- policies would block CARE reminders).

-- (a) Allow NULL memory_profile_id for personal reminders. No-op if already nullable.
--     (The FK memory_profile_id -> memory_profiles already permits NULL.)
alter table public.reminders
  alter column memory_profile_id drop not null;

-- (b) RLS: let an authenticated user fully manage their OWN personal (null-profile)
--     reminders. Apply ONLY if RLS is enabled and no equivalent policy exists.
drop policy if exists "reminders_personal_owner_select" on public.reminders;
create policy "reminders_personal_owner_select" on public.reminders
  for select to authenticated
  using (memory_profile_id is null and user_id = auth.uid());

drop policy if exists "reminders_personal_owner_insert" on public.reminders;
create policy "reminders_personal_owner_insert" on public.reminders
  for insert to authenticated
  with check (memory_profile_id is null and user_id = auth.uid());

drop policy if exists "reminders_personal_owner_update" on public.reminders;
create policy "reminders_personal_owner_update" on public.reminders
  for update to authenticated
  using (memory_profile_id is null and user_id = auth.uid())
  with check (memory_profile_id is null and user_id = auth.uid());

drop policy if exists "reminders_personal_owner_delete" on public.reminders;
create policy "reminders_personal_owner_delete" on public.reminders
  for delete to authenticated
  using (memory_profile_id is null and user_id = auth.uid());
