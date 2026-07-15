-- Remy's Activities — Family Activities: Together Time (Activity #5, 2026-07-15).
-- ADDITIVE + REVERSIBLE + probe-gated: the app degrades calmly until this is
-- applied (hub shows "Remy is setting up the family room"; actions return
-- structured "unavailable"). OPERATOR STEP: apply in the Supabase SQL editor.
--
-- Together Time v1 (locked decisions): PRIVATE reusable sets ONLY — an ordered
-- view over 3–8 existing memories with fixed, deterministic, non-AI prompts
-- assigned in code by moment index. NO session history/completion state, no
-- sharing, no live sync, no prompts in the database. `last_opened_at` orders
-- the hub and is updated BEST-EFFORT (write-permitted users only; a read-only
-- caregiver runs a set without any forced write). Deleting a set never touches
-- memories, media, or Voice Memory attachments.
--  * RLS is owner-scoped (creator); care-workspace access is mediated by the
--    server actions (service-role + userCanAccessProfile/userCanWriteProfile).

create table if not exists public.together_times (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_profile_id uuid references public.memory_profiles(id) on delete cascade,
  title             text not null default '',
  memory_ids        jsonb not null default '[]',
  last_opened_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists together_times_user_opened_idx
  on public.together_times (user_id, last_opened_at desc nulls last, updated_at desc);
create index if not exists together_times_profile_opened_idx
  on public.together_times (memory_profile_id, last_opened_at desc nulls last, updated_at desc);

alter table public.together_times enable row level security;

create policy "together_times_select_own" on public.together_times
  for select using (auth.uid() = user_id);
create policy "together_times_insert_own" on public.together_times
  for insert with check (auth.uid() = user_id);
create policy "together_times_update_own" on public.together_times
  for update using (auth.uid() = user_id);
create policy "together_times_delete_own" on public.together_times
  for delete using (auth.uid() = user_id);

-- ROLLBACK
-- drop table if exists public.together_times;
