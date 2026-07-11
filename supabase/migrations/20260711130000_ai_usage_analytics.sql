-- =====================================================================
-- AI Usage Analytics (Phase 27) — richer aggregates for the dashboard,
-- quota enforcement, and server-only admin analytics.
-- =====================================================================
-- Adds accurate, row-cap-free aggregate functions over `ai_usage` (created in
-- 20260711120000_ai_usage_foundation). All are SERVICE-ROLE ONLY (execute revoked
-- from public/anon/authenticated → no IDOR via PostgREST); the server always calls
-- them with a session-derived user_id (per-user reads) or as trusted ops (admin).
-- Additive only; the app degrades to zeros if this migration is not yet applied.
-- =====================================================================

-- Per-user (+ optional workspace) usage window: powers the quota gate and the
-- usage dashboard/API. Latency/token averages are over SUCCESSFUL calls only, so a
-- fast failure never skews "average response latency".
create or replace function public.ai_usage_overview(
  p_user_id      uuid,
  p_workspace_id uuid,
  p_since        timestamptz
)
returns table (
  conversations     bigint,
  success_count     bigint,
  error_count       bigint,
  prompt_tokens     bigint,
  completion_tokens bigint,
  total_tokens      bigint,
  estimated_cost    numeric,
  avg_latency_ms    numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'success')::bigint,
    count(*) filter (where status = 'error')::bigint,
    coalesce(sum(prompt_tokens), 0)::bigint,
    coalesce(sum(completion_tokens), 0)::bigint,
    coalesce(sum(total_tokens), 0)::bigint,
    coalesce(sum(estimated_cost), 0)::numeric,
    coalesce(avg(latency_ms) filter (where status = 'success'), 0)::numeric
  from public.ai_usage
  where user_id = p_user_id
    and (p_workspace_id is null or workspace_id = p_workspace_id)
    and created_at >= p_since;
$$;

-- Global (ALL users) rollup for server-only admin analytics. NEVER exposed publicly.
create or replace function public.ai_usage_admin_overview(p_since timestamptz)
returns table (
  conversations    bigint,
  success_count    bigint,
  error_count      bigint,
  avg_latency_ms   numeric,
  avg_total_tokens numeric,
  estimated_cost   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'success')::bigint,
    count(*) filter (where status = 'error')::bigint,
    coalesce(avg(latency_ms) filter (where status = 'success'), 0)::numeric,
    coalesce(avg(total_tokens) filter (where status = 'success'), 0)::numeric,
    coalesce(sum(estimated_cost), 0)::numeric
  from public.ai_usage
  where created_at >= p_since;
$$;

-- Per-model request counts (for "most used model"), global — server-only admin.
create or replace function public.ai_usage_admin_model_usage(p_since timestamptz)
returns table (model text, request_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select model, count(*)::bigint
  from public.ai_usage
  where created_at >= p_since
  group by model
  order by count(*) desc, model asc;
$$;

-- Lock all three to the service role only.
revoke execute on function public.ai_usage_overview(uuid, uuid, timestamptz) from public;
revoke execute on function public.ai_usage_overview(uuid, uuid, timestamptz) from anon, authenticated;
grant  execute on function public.ai_usage_overview(uuid, uuid, timestamptz) to service_role;

revoke execute on function public.ai_usage_admin_overview(timestamptz) from public;
revoke execute on function public.ai_usage_admin_overview(timestamptz) from anon, authenticated;
grant  execute on function public.ai_usage_admin_overview(timestamptz) to service_role;

revoke execute on function public.ai_usage_admin_model_usage(timestamptz) from public;
revoke execute on function public.ai_usage_admin_model_usage(timestamptz) from anon, authenticated;
grant  execute on function public.ai_usage_admin_model_usage(timestamptz) to service_role;
