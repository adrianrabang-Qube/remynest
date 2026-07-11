-- =====================================================================
-- AI Usage Foundation (observability + cost accounting — NO enforcement yet)
-- =====================================================================
-- Per-execution usage log for every real AI provider call (Phase 26). One row
-- per executeConversation() invocation records who ran it, in which workspace,
-- which provider/model, the REAL token usage returned by the provider, an
-- estimated cost (computed app-side from a model-aware price table), latency,
-- and success/failure + a structured error code.
--
-- In RemyNest a "workspace" IS the memory profile: `workspace_id` == the active
-- `memory_profile_id` (NULL = the personal "My Nest" workspace) — same convention
-- as `storage_ledger`.
--
-- SAFETY / SCOPE:
--  * Writes come ONLY from the server via the service-role client (which bypasses
--    RLS); there is intentionally NO INSERT policy for authenticated/anon roles.
--  * Users may READ their own usage (select-own RLS) for a future usage UI.
--  * This table is observability only — it enforces NO quota/limit. The app
--    degrades gracefully if this migration is not yet applied (inserts/reads are
--    wrapped and never break AI execution), so deploying the code is a no-op
--    until the operator applies this migration.
--  * DATA CLASSIFICATION (GDPR Art 5(1)(c)): METADATA ONLY — provider/model/token
--    counts/cost/latency/status/ids. NO prompt text, memory content, or PHI.
--  * RETENTION (Art 5(1)(e)): rows cascade-delete with the user, but there is NO
--    TTL/rollup yet — add a purge/aggregate policy before scale. Rows are included
--    in the GDPR export (lib/gdpr/collect-user-data.ts).
-- =====================================================================

create table if not exists public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  workspace_id      uuid null,                      -- memory_profile_id (NULL = My Nest)
  provider          text not null,                  -- e.g. 'openai'
  model             text not null,                  -- e.g. 'gpt-4o-mini'
  operation         text not null,                  -- e.g. 'story_narration'
  prompt_tokens     integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens      integer not null default 0 check (total_tokens >= 0),
  estimated_cost    numeric(12, 6) not null default 0 check (estimated_cost >= 0),  -- USD
  latency_ms        integer not null default 0 check (latency_ms >= 0),
  status            text not null check (status in ('success', 'error')),
  error_code        text null,
  created_at        timestamptz not null default now()
);

-- Read paths: per-user, per-workspace, time-windowed (today / this month).
create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at desc);
create index if not exists ai_usage_workspace_created_idx
  on public.ai_usage (workspace_id, created_at desc);

-- RLS: users read ONLY their own rows; inserts are service-role only (no INSERT
-- policy → RLS denies non-service-role writes; the service-role client bypasses RLS).
alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage
  for select
  using (auth.uid() = user_id);

-- Accurate, row-cap-free aggregate for the quota/observability reads. SERVICE-ROLE ONLY
-- (execute revoked from public/authenticated → no IDOR via PostgREST; the server always calls it
-- with the session-derived user_id). When p_workspace_id is NULL the summary spans ALL of the user's
-- workspaces (per-user quota); pass a workspace id to scope to one.
create or replace function public.ai_usage_summary(
  p_user_id      uuid,
  p_workspace_id uuid,
  p_since        timestamptz
)
returns table (request_count bigint, total_tokens bigint, total_cost numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(total_tokens), 0)::bigint,
    coalesce(sum(estimated_cost), 0)::numeric
  from public.ai_usage
  where user_id = p_user_id
    and (p_workspace_id is null or workspace_id = p_workspace_id)
    and created_at >= p_since;
$$;

revoke execute on function public.ai_usage_summary(uuid, uuid, timestamptz) from public;
revoke execute on function public.ai_usage_summary(uuid, uuid, timestamptz) from anon, authenticated;
grant execute on function public.ai_usage_summary(uuid, uuid, timestamptz) to service_role;
