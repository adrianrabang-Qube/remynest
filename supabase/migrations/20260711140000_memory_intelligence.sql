-- =====================================================================
-- Memory Intelligence V2 (Phase 28) — ADDITIVE per-memory intelligence state.
-- =====================================================================
-- A NEW side table holding the MUTABLE V2 signals the pure engines can't derive
-- from `memories` alone: retrieval reinforcement, conversation frequency, manual
-- pin / favourite, and the cached deterministic classification + event cluster.
--
-- SAFETY / SCOPE:
--  * ADDITIVE ONLY — this does NOT alter the (dashboard-managed) `memories` table
--    in place; it is a 1:1 side table keyed by memory_id (FK, on delete cascade).
--  * REVERSIBLE — rollback = drop the function + table (see the block at the end).
--  * The pure engines treat a MISSING row as the default state, so this table is a
--    cache/overlay: backfill is OPTIONAL and safe (rows are created lazily on the
--    first reinforce/pin/favourite, or eagerly via backfill_memory_intelligence).
--  * Writes come ONLY from the server via the service-role client (which bypasses
--    RLS) — there is intentionally NO insert/update policy for authenticated/anon.
--  * Users may READ their own rows (select-own RLS) for a future usage/insight UI.
--  * In RemyNest `workspace_id` == the active `memory_profile_id` (NULL = My Nest).
-- =====================================================================

create table if not exists public.memory_intelligence (
  memory_id            uuid primary key references public.memories (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  workspace_id         uuid null,                          -- memory_profile_id (NULL = My Nest)
  retrieval_count      integer not null default 0 check (retrieval_count >= 0),
  last_recalled_at     timestamptz null,
  reinforcement_events integer not null default 0 check (reinforcement_events >= 0),
  down_rank_events     integer not null default 0 check (down_rank_events >= 0),
  conversation_count   integer not null default 0 check (conversation_count >= 0),
  pinned               boolean not null default false,
  favourite            boolean not null default false,
  classification       text null,                          -- cached controlled-taxonomy category
  cluster_type         text null,                          -- cached event cluster key
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists memory_intelligence_user_idx
  on public.memory_intelligence (user_id);
create index if not exists memory_intelligence_workspace_idx
  on public.memory_intelligence (workspace_id);
-- Fast "recently reinforced" / forgotten scans per user.
create index if not exists memory_intelligence_user_recalled_idx
  on public.memory_intelligence (user_id, last_recalled_at desc nulls last);

alter table public.memory_intelligence enable row level security;

drop policy if exists "memory_intelligence_select_own" on public.memory_intelligence;
create policy "memory_intelligence_select_own"
  on public.memory_intelligence
  for select
  using (auth.uid() = user_id);

-- Keep updated_at fresh on any write.
create or replace function public.memory_intelligence_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists memory_intelligence_touch_trg on public.memory_intelligence;
create trigger memory_intelligence_touch_trg
  before update on public.memory_intelligence
  for each row execute function public.memory_intelligence_touch();

-- SAFE BACKFILL (service-role only): eagerly seed default intelligence rows for a
-- user's memories that don't have one yet. Idempotent (ON CONFLICT DO NOTHING) and
-- non-destructive (never updates existing rows). Optional — reads work without it.
create or replace function public.backfill_memory_intelligence(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  insert into public.memory_intelligence (memory_id, user_id, workspace_id)
  select m.id, m.user_id, m.memory_profile_id
  from public.memories m
  where m.user_id = p_user_id
  on conflict (memory_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke execute on function public.backfill_memory_intelligence(uuid) from public;
revoke execute on function public.backfill_memory_intelligence(uuid) from anon, authenticated;
grant  execute on function public.backfill_memory_intelligence(uuid) to service_role;

-- ATOMIC reinforcement (service-role only): a successful retrieval increments the
-- counters + stamps last_recalled in ONE upsert (no read-modify-write race). The
-- reinforcement hook the future retrieval path will call; scoped by the caller's
-- session-derived user_id.
create or replace function public.reinforce_memory(
  p_memory_id    uuid,
  p_user_id      uuid,
  p_workspace_id uuid,
  p_now          timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.memory_intelligence (memory_id, user_id, workspace_id, retrieval_count, reinforcement_events, last_recalled_at)
  values (p_memory_id, p_user_id, p_workspace_id, 1, 1, p_now)
  on conflict (memory_id) do update
    set retrieval_count      = public.memory_intelligence.retrieval_count + 1,
        reinforcement_events = public.memory_intelligence.reinforcement_events + 1,
        last_recalled_at     = p_now
  where public.memory_intelligence.user_id = p_user_id;
$$;

revoke execute on function public.reinforce_memory(uuid, uuid, uuid, timestamptz) from public;
revoke execute on function public.reinforce_memory(uuid, uuid, uuid, timestamptz) from anon, authenticated;
grant  execute on function public.reinforce_memory(uuid, uuid, uuid, timestamptz) to service_role;

-- =====================================================================
-- ROLLBACK (reversible):
--   drop function if exists public.backfill_memory_intelligence(uuid);
--   drop trigger  if exists memory_intelligence_touch_trg on public.memory_intelligence;
--   drop function if exists public.memory_intelligence_touch();
--   drop table    if exists public.memory_intelligence;
-- =====================================================================
