-- =====================================================================
-- RemyNest — GDPR Delete Account infrastructure
-- =====================================================================
-- Adds:
--   1. pending_account_deletions table for auth-deletion failure recovery.
--   2. delete_user_account(uuid, jsonb) — SECURITY DEFINER, transactional:
--      ownership transfer, tombstoning, ordered cleanup. Auth-user deletion
--      itself is performed by the application (service role) AFTER this RPC.
--
-- The tombstone (anonymised author) account is provisioned in application code
-- (Admin API), NOT here — see section 1. The RPC receives the tombstone id via
-- p_options->>'tombstoneId'.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tombstone account — PROVISIONED IN APPLICATION CODE (not here)
-- ---------------------------------------------------------------------
-- memories.user_id REFERENCES auth.users(id) (ON DELETE CASCADE, NOT NULL), so
-- the anonymised-author tombstone must be a REAL auth.users row. The Supabase
-- Admin API cannot create a user with a fixed UUID, so the tombstone is created
-- once via `lib/gdpr/provision-tombstone.ts` (auth.admin.createUser + a profiles
-- display row) and its id is stored in the TOMBSTONE_USER_ID env var. The RPC
-- below receives that id via p_options->>'tombstoneId'. No raw auth.users DML.

-- ---------------------------------------------------------------------
-- 2. Pending-deletion recovery table
-- ---------------------------------------------------------------------
create table if not exists public.pending_account_deletions (
  user_id      uuid primary key,
  email        text,
  requested_at timestamptz not null default now(),
  data_deleted_at timestamptz,
  storage_deleted_at timestamptz,
  status       text not null default 'auth_pending',
  last_error   text,
  attempts     integer not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.pending_account_deletions enable row level security;
-- No policies => only the service role (which bypasses RLS) can read/write.

-- ---------------------------------------------------------------------
-- 3. delete_user_account RPC
-- ---------------------------------------------------------------------
create or replace function public.delete_user_account(
  p_user_id uuid,
  p_options jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tombstone uuid := nullif(p_options->>'tombstoneId', '')::uuid;
  v_delete_contributed boolean := coalesce((p_options->>'deleteContributed')::boolean, false);
  v_email text;
  v_profile record;
  v_successor uuid;
  v_transferred int := 0;
  v_tombstoned int := 0;
  v_contributed_deleted int := 0;
begin
  -- tombstoneId is required unless the caller is hard-deleting contributed memories.
  if v_tombstone is null and not v_delete_contributed then
    raise exception 'tombstoneId option is required when retaining contributed memories';
  end if;

  if v_tombstone is not null and p_user_id = v_tombstone then
    raise exception 'Refusing to delete the tombstone account';
  end if;

  select email into v_email from auth.users where id = p_user_id;

  -- 1) Ownership transfer for shared owned profiles ---------------------
  for v_profile in
    select mp.id
    from memory_profiles mp
    where mp.created_by_account_id = p_user_id
      and exists (
        select 1 from profile_relationships pr
        where pr.memory_profile_id = mp.id
          and pr.caregiver_account_id <> p_user_id
          and pr.invite_status = 'accepted'
      )
  loop
    select pr.caregiver_account_id
      into v_successor
      from profile_relationships pr
     where pr.memory_profile_id = v_profile.id
       and pr.caregiver_account_id <> p_user_id
       and pr.invite_status = 'accepted'
     order by (pr.access_level = 'admin') desc, pr.created_at asc
     limit 1;

    if v_successor is not null then
      update memory_profiles
         set created_by_account_id = v_successor
       where id = v_profile.id;

      delete from profile_relationships
       where memory_profile_id = v_profile.id
         and caregiver_account_id = p_user_id;

      v_transferred := v_transferred + 1;
    end if;
  end loop;

  -- 2) Cross-contributed memories (authored by user, profile now owned by
  --    someone else). NEVER reassign authorship to a real person.
  if v_delete_contributed then
    with del as (
      delete from memories m
       where m.user_id = p_user_id
         and m.memory_profile_id is not null
         and m.memory_profile_id in (
           select id from memory_profiles where created_by_account_id <> p_user_id
         )
      returning 1
    )
    select count(*) into v_contributed_deleted from del;
  else
    with tomb as (
      update memories m
         set user_id = v_tombstone
       where m.user_id = p_user_id
         and m.memory_profile_id is not null
         and m.memory_profile_id in (
           select id from memory_profiles where created_by_account_id <> p_user_id
         )
      returning 1
    )
    select count(*) into v_tombstoned from tomb;
  end if;

  -- 3) Ordered deletion of the user's own data ------------------------
  delete from memory_clusters where user_id = p_user_id;          -- 1
  delete from memories where user_id = p_user_id;                 -- 2
  delete from reminders where user_id = p_user_id;                -- 3
  delete from profile_relationships where caregiver_account_id = p_user_id; -- 4
  delete from caregiver_invites
   where invited_by_account_id = p_user_id
      or (v_email is not null and email = v_email);               -- 5
  delete from device_registrations where user_id = p_user_id;     -- 6

  -- 7) sole-owned memory_profiles (shared ones were transferred away).
  --    Clear ALL child rows in those profiles first (any author/status) so the
  --    profile delete cannot be blocked by a RESTRICT FK
  --    (reminders -> memory_profiles and profile_relationships -> memory_profiles
  --    are confirmed FKs; their delete_rule is not relied upon here).
  delete from memories
   where memory_profile_id in (
     select id from memory_profiles where created_by_account_id = p_user_id
   );
  delete from reminders
   where memory_profile_id in (
     select id from memory_profiles where created_by_account_id = p_user_id
   );
  delete from profile_relationships
   where memory_profile_id in (
     select id from memory_profiles where created_by_account_id = p_user_id
   );
  delete from memory_profiles where created_by_account_id = p_user_id;

  -- 8) profiles row
  delete from profiles where id = p_user_id;

  -- (9 = auth.users deletion is performed by the application, last.)

  return jsonb_build_object(
    'ok', true,
    'transferredProfiles', v_transferred,
    'tombstonedMemories', v_tombstoned,
    'contributedDeleted', v_contributed_deleted
  );
end;
$$;

revoke all on function public.delete_user_account(uuid, jsonb) from public, anon, authenticated;
-- Only the service role may call it.
