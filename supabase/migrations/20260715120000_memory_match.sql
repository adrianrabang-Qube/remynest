-- Remy's Activities — Memory Match (Activity #3, 2026-07-15).
-- ADDITIVE + REVERSIBLE + probe-gated: the app degrades calmly until this is
-- applied (hub shows "Remy is setting up the matching table"; actions return
-- structured "unavailable"). OPERATOR STEP: apply in the Supabase SQL editor.
--
-- Design (mirrors the Memory Puzzles / Story Builder contracts):
--  * A game is a VIEW over existing photo memories — `photos` is the ordered
--    jsonb array of { memoryId, path } (pair index = array index; each photo
--    becomes two cards). Every entry is server-verified: the memory belongs
--    to the game's workspace AND the path is one of that memory's own
--    attachments. Deleting a game never touches memories or media.
--  * No timers, scores, streaks, or leaderboard columns — never add them.
--  * RLS is owner-scoped (creator); care-workspace access is mediated by the
--    server actions (service-role + userCanAccessProfile/userCanWriteProfile).

create table if not exists public.match_games (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_profile_id uuid references public.memory_profiles(id) on delete cascade,
  photos            jsonb not null default '[]',
  pairs             int  not null check (pairs in (3, 4, 6, 8)),
  shuffle_seed      int  not null default 1,
  completed_count   int  not null default 0,
  last_played_at    timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists public.match_game_progress (
  game_id      uuid primary key references public.match_games(id) on delete cascade,
  -- Matched PAIR indexes (0..pairs-1); flipped-but-unmatched state is ephemeral.
  matched      jsonb not null default '[]',
  updated_at   timestamptz not null default now()
);

create table if not exists public.match_game_completions (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.match_games(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index if not exists match_games_user_played_idx
  on public.match_games (user_id, last_played_at desc nulls last);
create index if not exists match_games_profile_played_idx
  on public.match_games (memory_profile_id, last_played_at desc nulls last);

alter table public.match_games enable row level security;
alter table public.match_game_progress enable row level security;
alter table public.match_game_completions enable row level security;

create policy "match_games_select_own" on public.match_games
  for select using (auth.uid() = user_id);
create policy "match_games_insert_own" on public.match_games
  for insert with check (auth.uid() = user_id);
create policy "match_games_update_own" on public.match_games
  for update using (auth.uid() = user_id);
create policy "match_games_delete_own" on public.match_games
  for delete using (auth.uid() = user_id);

create policy "match_game_progress_select_own" on public.match_game_progress
  for select using (
    exists (select 1 from public.match_games g where g.id = game_id and g.user_id = auth.uid())
  );

create policy "match_game_completions_select_own" on public.match_game_completions
  for select using (auth.uid() = user_id);

-- ROLLBACK
-- drop table if exists public.match_game_completions;
-- drop table if exists public.match_game_progress;
-- drop table if exists public.match_games;
