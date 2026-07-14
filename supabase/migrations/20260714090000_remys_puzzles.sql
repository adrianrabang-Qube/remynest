-- Remy's Activities — Memory Puzzles foundation (Phase 1A, 2026-07-14).
-- ADDITIVE + REVERSIBLE + probe-gated: the app degrades gracefully until this is
-- applied (queries resolve to empty / actions return a structured "unavailable").
-- OPERATOR STEP: apply in the Supabase SQL editor.
--
-- Design (approved 2026-07-13 architecture):
--  * A puzzle is a VIEW over a memory — image_path references an existing
--    memory-media object (server-verified from the memory's own attachments;
--    never client-supplied). Crop is METADATA (no derivative image).
--  * Workspace ownership mirrors memories: memory_profile_id NULL = My Nest.
--  * No duration/score columns — deliberately (no timers, no pressure).
--  * RLS is owner-scoped (creator); care-workspace access is mediated by the
--    server actions (service-role + userCanAccessProfile/userCanWriteProfile),
--    matching the reminders/moderation pattern.

create table if not exists public.puzzles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  memory_profile_id uuid references public.memory_profiles(id) on delete cascade,
  memory_id         uuid references public.memories(id) on delete set null,
  image_path        text not null,
  title             text not null default '',
  crop              jsonb not null,
  pieces            int  not null check (pieces in (9, 16, 36, 64, 100)),
  difficulty        text not null check (difficulty in ('gentle','easy','medium','challenging','expert')),
  shuffle_seed      int  not null default 1,
  favourite         boolean not null default false,
  completed_count   int not null default 0,
  last_played_at    timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists public.puzzle_progress (
  puzzle_id    uuid primary key references public.puzzles(id) on delete cascade,
  -- Compact progress: the piece indexes already placed (pieces snap only to
  -- their correct slot, so "placed" is the whole state).
  placements   jsonb not null default '[]',
  placed_count int not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists public.puzzle_completions (
  id           uuid primary key default gen_random_uuid(),
  puzzle_id    uuid not null references public.puzzles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now()
);

create index if not exists puzzles_user_played_idx
  on public.puzzles (user_id, last_played_at desc nulls last);
create index if not exists puzzles_profile_played_idx
  on public.puzzles (memory_profile_id, last_played_at desc nulls last);
create index if not exists puzzle_completions_puzzle_idx
  on public.puzzle_completions (puzzle_id, completed_at desc);

alter table public.puzzles enable row level security;
alter table public.puzzle_progress enable row level security;
alter table public.puzzle_completions enable row level security;

-- Owner-scoped RLS (creator). Care-workspace reads/writes go through the
-- service-role server actions after app-layer authorization.
create policy "puzzles_select_own" on public.puzzles
  for select using (auth.uid() = user_id);
create policy "puzzles_insert_own" on public.puzzles
  for insert with check (auth.uid() = user_id);
create policy "puzzles_update_own" on public.puzzles
  for update using (auth.uid() = user_id);
create policy "puzzles_delete_own" on public.puzzles
  for delete using (auth.uid() = user_id);

create policy "puzzle_progress_select_own" on public.puzzle_progress
  for select using (
    exists (select 1 from public.puzzles p where p.id = puzzle_id and p.user_id = auth.uid())
  );

create policy "puzzle_completions_select_own" on public.puzzle_completions
  for select using (auth.uid() = user_id);

-- ROLLBACK
-- drop table if exists public.puzzle_completions;
-- drop table if exists public.puzzle_progress;
-- drop table if exists public.puzzles;
