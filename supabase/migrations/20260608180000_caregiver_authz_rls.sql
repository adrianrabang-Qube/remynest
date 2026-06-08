-- =============================================================================
-- P0 — Caregiver authorization integrity (RLS write hardening)
--
-- Audit proved any authenticated user could INSERT arbitrary rows into
-- profile_relationships and caregiver_invites (self-grant a caregiver/owner
-- relationship, or forge an invite for ANY memory_profile_id). Confidentiality
-- was contained by ownership-based RLS on memories/memory_profiles, but the
-- write-side object-level authorization was broken. These policies restrict
-- writes to authorized users only.
--
-- OPERATOR: before applying, inspect existing policies and DROP any permissive
-- write policies this migration does not replace by name:
--   select schemaname, tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where tablename in ('profile_relationships','caregiver_invites')
--   order by tablename, cmd;
--
-- SELECT (read) policies are intentionally left unchanged — the audit confirmed
-- cross-user reads are already blocked (users see only their own rows; owners
-- see their profile's caregivers; invitees see invites addressed to them).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profile_relationships
-- ---------------------------------------------------------------------------
alter table public.profile_relationships enable row level security;

-- Replace any pre-existing permissive write policies (Supabase defaults + ours).
drop policy if exists "Enable insert for authenticated users only" on public.profile_relationships;
drop policy if exists "Enable insert access for all users"        on public.profile_relationships;
drop policy if exists "Enable update for authenticated users only" on public.profile_relationships;
drop policy if exists "Enable delete for authenticated users only" on public.profile_relationships;
drop policy if exists "profile_relationships_insert_authz" on public.profile_relationships;
drop policy if exists "profile_relationships_update_authz" on public.profile_relationships;
drop policy if exists "profile_relationships_delete_authz" on public.profile_relationships;

-- INSERT: caller may only insert THEIR OWN caregiver row, AND either
--   (a) they own the target profile (owner seeding the owner/admin row on create), or
--   (b) a pending invite addressed to their email exists for that profile (accept flow).
create policy "profile_relationships_insert_authz"
on public.profile_relationships
for insert to authenticated
with check (
  caregiver_account_id = auth.uid()
  and (
    exists (
      select 1 from public.memory_profiles mp
      where mp.id = profile_relationships.memory_profile_id
        and mp.created_by_account_id = auth.uid()
    )
    or exists (
      select 1 from public.caregiver_invites ci
      where ci.memory_profile_id = profile_relationships.memory_profile_id
        and lower(ci.email) = lower(auth.email())
        and ci.status = 'pending'
    )
  )
);

-- UPDATE: only the profile owner manages relationships on their profile.
create policy "profile_relationships_update_authz"
on public.profile_relationships
for update to authenticated
using (
  exists (
    select 1 from public.memory_profiles mp
    where mp.id = profile_relationships.memory_profile_id
      and mp.created_by_account_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.memory_profiles mp
    where mp.id = profile_relationships.memory_profile_id
      and mp.created_by_account_id = auth.uid()
  )
);

-- DELETE: the owner removes a caregiver, or a caregiver leaves their own row.
create policy "profile_relationships_delete_authz"
on public.profile_relationships
for delete to authenticated
using (
  caregiver_account_id = auth.uid()
  or exists (
    select 1 from public.memory_profiles mp
    where mp.id = profile_relationships.memory_profile_id
      and mp.created_by_account_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- caregiver_invites
-- ---------------------------------------------------------------------------
alter table public.caregiver_invites enable row level security;

drop policy if exists "Enable insert for authenticated users only" on public.caregiver_invites;
drop policy if exists "Enable insert access for all users"        on public.caregiver_invites;
drop policy if exists "Enable update for authenticated users only" on public.caregiver_invites;
drop policy if exists "Enable delete for authenticated users only" on public.caregiver_invites;
drop policy if exists "caregiver_invites_insert_authz" on public.caregiver_invites;
drop policy if exists "caregiver_invites_update_authz" on public.caregiver_invites;
drop policy if exists "caregiver_invites_delete_authz" on public.caregiver_invites;

-- INSERT: only the OWNER of the target profile may invite, and invited_by must be self.
create policy "caregiver_invites_insert_authz"
on public.caregiver_invites
for insert to authenticated
with check (
  invited_by_account_id = auth.uid()
  and exists (
    select 1 from public.memory_profiles mp
    where mp.id = caregiver_invites.memory_profile_id
      and mp.created_by_account_id = auth.uid()
  )
);

-- UPDATE: the addressed invitee (accept/decline) or the inviting owner (revoke).
create policy "caregiver_invites_update_authz"
on public.caregiver_invites
for update to authenticated
using (
  lower(email) = lower(auth.email())
  or invited_by_account_id = auth.uid()
)
with check (
  lower(email) = lower(auth.email())
  or invited_by_account_id = auth.uid()
);

-- DELETE: the inviting owner can withdraw a pending invite.
create policy "caregiver_invites_delete_authz"
on public.caregiver_invites
for delete to authenticated
using (invited_by_account_id = auth.uid());
