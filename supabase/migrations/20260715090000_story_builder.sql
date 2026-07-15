-- Remy's Activities — Story Builder (Activity #2, 2026-07-15).
-- ADDITIVE + REVERSIBLE + probe-gated: the app degrades calmly until this is
-- applied (hub shows a setting-up state; actions return structured "unavailable").
-- OPERATOR STEP: apply in the Supabase SQL editor.
--
-- Design (mirrors the Memory Puzzles contracts):
--  * A story is a VIEW over existing memories — `memory_ids` is the ORDERED
--    jsonb array of memory uuids. No memory content is copied; deleting a
--    story never touches memories or media.
--  * Workspace ownership mirrors memories/puzzles: memory_profile_id NULL =
--    My Nest. Every referenced memory is server-verified to belong to the
--    story's workspace before save (app layer).
--  * No AI columns, no scores, no timers.
--  * RLS is owner-scoped (creator); care-workspace access is mediated by the
--    server actions (service-role + userCanAccessProfile/userCanWriteProfile).

create table if not exists public.stories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_profile_id uuid references public.memory_profiles(id) on delete cascade,
  title             text not null default '',
  memory_ids        jsonb not null default '[]',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists stories_user_updated_idx
  on public.stories (user_id, updated_at desc);
create index if not exists stories_profile_updated_idx
  on public.stories (memory_profile_id, updated_at desc);

alter table public.stories enable row level security;

create policy "stories_select_own" on public.stories
  for select using (auth.uid() = user_id);
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = user_id);
create policy "stories_update_own" on public.stories
  for update using (auth.uid() = user_id);
create policy "stories_delete_own" on public.stories
  for delete using (auth.uid() = user_id);

-- ROLLBACK
-- drop table if exists public.stories;
