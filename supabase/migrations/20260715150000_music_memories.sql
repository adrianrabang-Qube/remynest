-- Remy's Activities — Music Memories (Activity #4, 2026-07-15).
-- ADDITIVE + REVERSIBLE + probe-gated: the app degrades calmly until this is
-- applied (hub shows "Remy is setting up the music room"; actions return
-- structured "unavailable"). OPERATOR STEP: apply in the Supabase SQL editor.
--
-- Approved v1 ("The songs of your life"): a song memory is song METADATA the
-- user typed (title/artist/era/note) plus an ORDERED, OPTIONAL set of linked
-- existing memories. NO audio of any kind in v1 — no upload, playback,
-- recording, streaming, or catalog (audio is a separately approved future
-- phase). Deleting a song memory never touches memories or media.
--  * Workspace ownership mirrors stories: memory_profile_id NULL = My Nest;
--    every linked memory is server-verified to belong to the song's workspace.
--  * RLS is owner-scoped (creator); care-workspace access is mediated by the
--    server actions (service-role + userCanAccessProfile/userCanWriteProfile).

create table if not exists public.song_memories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_profile_id uuid references public.memory_profiles(id) on delete cascade,
  title             text not null,
  artist            text not null default '',
  era               text not null default '',
  note              text not null default '',
  memory_ids        jsonb not null default '[]',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists song_memories_user_updated_idx
  on public.song_memories (user_id, updated_at desc);
create index if not exists song_memories_profile_updated_idx
  on public.song_memories (memory_profile_id, updated_at desc);

alter table public.song_memories enable row level security;

create policy "song_memories_select_own" on public.song_memories
  for select using (auth.uid() = user_id);
create policy "song_memories_insert_own" on public.song_memories
  for insert with check (auth.uid() = user_id);
create policy "song_memories_update_own" on public.song_memories
  for update using (auth.uid() = user_id);
create policy "song_memories_delete_own" on public.song_memories
  for delete using (auth.uid() = user_id);

-- ROLLBACK
-- drop table if exists public.song_memories;
