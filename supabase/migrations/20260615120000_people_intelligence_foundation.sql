-- =====================================================================
-- RemyNest — Phase C1: People Intelligence — Schema Foundation
-- =====================================================================
-- Creates the database foundation ONLY for future People Intelligence.
-- NO extraction, NO retrieval, NO Ask Remy integration, NO UI (those are
-- C2-C5). Additive + idempotent; no behavior change until later phases ship.
--
-- Design (approved architecture review):
--   * Profile-scoped person entities — keyed (created_by_account_id, memory_profile_id);
--     memory_profile_id NULL = My Nest (personal). NO global/hybrid identities.
--   * people <-> memories grounding bridge via memory_person_links (verbatim-mention
--     grounded later in C2; this phase only defines the table).
--   * RLS mirrors the verified caregiver model (20260608180000_caregiver_authz_rls.sql):
--     owner full access; caregiver read-only via profile_relationships.invite_status='accepted'.
--   * GDPR: delete_user_account (20260605120000) extended so no orphaned people/links,
--     respecting transfer / tombstone / contributed-memory paths.
--
-- OPERATOR STEP: apply in the Supabase SQL editor / migration runner after review.
-- The application does not apply migrations.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. people — one canonical individual PER WORKSPACE
--    (created_by_account_id, memory_profile_id). NULL memory_profile_id = My Nest.
-- ---------------------------------------------------------------------
create table if not exists public.people (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Owner (author/workspace owner) — drives RLS + GDPR cascade. Mirrors memories.user_id.
  created_by_account_id  uuid not null references auth.users(id) on delete cascade,
  -- Workspace scope. NULL = My Nest (personal); a profile id = a care workspace.
  memory_profile_id      uuid references public.memory_profiles(id) on delete cascade,
  display_name           text not null,
  normalized_name        text not null,                  -- lower(trim(display_name)); resolve/dedupe key
  aliases                text[] not null default '{}',   -- lowercased surface forms ("dad","john","john smith")
  role                   text,                           -- only from a literal relationship alias; NEVER inferred
  mention_count          integer not null default 0,     -- cached aggregate (links authoritative; derived)
  max_mention_confidence integer not null default 0,     -- 0-100, conforms to MemoryInsightResponse.confidence
  status                 text not null default 'active',  -- 'active' | 'merged' | 'archived'
  merged_into_person_id  uuid references public.people(id) on delete set null
);

-- Dedupe: Postgres treats NULL as DISTINCT in a UNIQUE, so a single composite
-- index would NOT dedupe personal (NULL) rows. Use TWO partial unique indexes.
create unique index if not exists people_uq_personal
  on public.people (created_by_account_id, normalized_name)
  where memory_profile_id is null;
create unique index if not exists people_uq_care
  on public.people (created_by_account_id, memory_profile_id, normalized_name)
  where memory_profile_id is not null;
-- Resolve / list lookups.
create index if not exists people_scope_idx
  on public.people (created_by_account_id, memory_profile_id, normalized_name);
create index if not exists people_profile_idx
  on public.people (memory_profile_id);

-- ---------------------------------------------------------------------
-- 2. memory_person_links — the ONLY grounding bridge (person <-> real memory)
-- ---------------------------------------------------------------------
create table if not exists public.memory_person_links (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  memory_id    uuid not null references public.memories(id) on delete cascade,
  person_id    uuid not null references public.people(id)   on delete cascade,
  matched_text text,                                       -- verbatim span (grounding provenance; set in C2)
  source       text not null default 'extraction',         -- 'extraction' | 'manual'
  unique (memory_id, person_id)
);
create index if not exists mpl_person_idx on public.memory_person_links (person_id);
create index if not exists mpl_memory_idx on public.memory_person_links (memory_id);

-- ---------------------------------------------------------------------
-- 3. RLS — mirror the verified caregiver model (owner write; owner+caregiver read).
--    profile_relationships.invite_status = 'accepted' (per delete_user_account RPC).
--    Personal rows (memory_profile_id IS NULL) are visible only to the owner.
--    Extraction (C2) MUST run as the authenticated owner (createClient), never the
--    service role (which bypasses RLS).
-- ---------------------------------------------------------------------
alter table public.people              enable row level security;
alter table public.memory_person_links enable row level security;

-- people: READ = owner OR accepted caregiver of the (care) workspace.
drop policy if exists "people_select_authz" on public.people;
create policy "people_select_authz" on public.people
for select to authenticated
using (
  created_by_account_id = auth.uid()
  or (
    memory_profile_id is not null and exists (
      select 1 from public.profile_relationships pr
      where pr.memory_profile_id = people.memory_profile_id
        and pr.caregiver_account_id = auth.uid()
        and pr.invite_status = 'accepted'
    )
  )
);

-- people: WRITE = owner only.
drop policy if exists "people_insert_authz" on public.people;
create policy "people_insert_authz" on public.people
for insert to authenticated
with check (created_by_account_id = auth.uid());

drop policy if exists "people_update_authz" on public.people;
create policy "people_update_authz" on public.people
for update to authenticated
using (created_by_account_id = auth.uid())
with check (created_by_account_id = auth.uid());

drop policy if exists "people_delete_authz" on public.people;
create policy "people_delete_authz" on public.people
for delete to authenticated
using (created_by_account_id = auth.uid());

-- memory_person_links: scope through the parent person (same owner/caregiver predicate).
drop policy if exists "mpl_select_authz" on public.memory_person_links;
create policy "mpl_select_authz" on public.memory_person_links
for select to authenticated
using (
  exists (
    select 1 from public.people p
    where p.id = memory_person_links.person_id
      and (
        p.created_by_account_id = auth.uid()
        or (
          p.memory_profile_id is not null and exists (
            select 1 from public.profile_relationships pr
            where pr.memory_profile_id = p.memory_profile_id
              and pr.caregiver_account_id = auth.uid()
              and pr.invite_status = 'accepted'
          )
        )
      )
  )
);

-- memory_person_links: WRITE = owner of the parent person only.
drop policy if exists "mpl_insert_authz" on public.memory_person_links;
create policy "mpl_insert_authz" on public.memory_person_links
for insert to authenticated
with check (
  exists (
    select 1 from public.people p
    where p.id = memory_person_links.person_id
      and p.created_by_account_id = auth.uid()
  )
);

drop policy if exists "mpl_delete_authz" on public.memory_person_links;
create policy "mpl_delete_authz" on public.memory_person_links
for delete to authenticated
using (
  exists (
    select 1 from public.people p
    where p.id = memory_person_links.person_id
      and p.created_by_account_id = auth.uid()
  )
);
-- (No UPDATE policy: links are immutable facts — created or deleted, never updated.)

-- ---------------------------------------------------------------------
-- 4. GDPR — extend delete_user_account so no orphaned people/links remain and
--    transfer/tombstone/contributed paths are respected.
--
--    FK cascades alone PREVENT ORPHANS (memory_person_links cascades off both
--    memories and people; people cascades off memory_profiles and auth.users).
--    But cascades would DELETE the departing user's people in OTHER owners'
--    profiles when auth.users is finally removed — destroying person data on
--    memories that were transferred/tombstoned to the surviving owner. So, exactly
--    as the RPC re-authors (tombstones) cross-contributed memories, we RE-OWN those
--    people to the profile's owner BEFORE the user's own rows are deleted.
--
--    This is a full re-create of the function preserving ALL existing logic; the
--    ONLY changes are the three clearly-marked "[C1]" blocks.
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

  -- [C1] 2b) Re-own people the departing user created in profiles owned by
  --      someone else (including profiles just transferred in step 1) to that
  --      profile's owner, so person links on surviving/tombstoned memories are
  --      preserved and are NOT cascade-deleted with the auth.users row later.
  update people p
     set created_by_account_id = mp.created_by_account_id,
         updated_at = now()
    from memory_profiles mp
   where p.memory_profile_id = mp.id
     and p.created_by_account_id = p_user_id
     and mp.created_by_account_id <> p_user_id;

  -- 3) Ordered deletion of the user's own data ------------------------
  delete from memory_clusters where user_id = p_user_id;          -- 1
  -- [C1] person links on the user's own memories + the user's own people
  --      (personal Nest + sole-owned profiles). Links on people cascade.
  delete from memory_person_links
   where memory_id in (select id from memories where user_id = p_user_id);
  delete from people where created_by_account_id = p_user_id;
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
  -- [C1] clear person links + people in sole-owned profiles first (defense;
  --      catches rows authored by others, e.g. a future writer-caregiver).
  delete from memory_person_links
   where memory_id in (
     select id from memories where memory_profile_id in (
       select id from memory_profiles where created_by_account_id = p_user_id
     )
   );
  delete from people
   where memory_profile_id in (
     select id from memory_profiles where created_by_account_id = p_user_id
   );
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
