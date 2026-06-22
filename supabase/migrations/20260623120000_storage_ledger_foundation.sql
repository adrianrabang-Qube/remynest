-- =====================================================================
-- Storage Ledger Foundation (accounting only — NO billing/checkout/pricing)
-- =====================================================================
-- Per-attachment storage accounting for RemyNest. The ledger is maintained
-- INCREMENTALLY by a trigger that projects `memories.attachments` (jsonb) into
-- one ledger row per attachment. This keeps accounting in sync WITHOUT touching
-- the (frozen) memory-media upload pipeline — the trigger fires for any code
-- path that writes a memory. A reconcile function rebuilds the ledger from the
-- source of truth for backfill + drift repair.
--
-- In RemyNest a "workspace" IS the memory profile: `memory_profile_id` (NULL =
-- the personal "My Nest" workspace). So workspace_id == memory_profile_id and a
-- separate profile_id column would be redundant.
--
-- SAFETY: the trigger must NEVER raise — a failing trigger would block memory
-- writes (a critical system). All jsonb access is null-guarded and size casts
-- are regex-guarded so malformed attachments degrade to 0 bytes, never an error.
-- =====================================================================

-- 1. Ledger: one row per memory attachment ------------------------------
create table if not exists public.storage_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  workspace_id    uuid null,            -- memories.memory_profile_id (NULL = My Nest)
  memory_id       uuid not null references public.memories (id) on delete cascade,
  attachment_id   text not null,        -- attachment.id within the jsonb array
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  media_type      text not null default 'file',
  created_at      timestamptz not null default now(),
  unique (memory_id, attachment_id)
);

create index if not exists storage_ledger_user_idx      on public.storage_ledger (user_id);
create index if not exists storage_ledger_workspace_idx on public.storage_ledger (workspace_id);
create index if not exists storage_ledger_memory_idx    on public.storage_ledger (memory_id);

-- 2. RLS: a user may READ only their own ledger rows. All writes happen via the
--    SECURITY DEFINER trigger (and service-role reconcile), which bypass RLS.
alter table public.storage_ledger enable row level security;

drop policy if exists storage_ledger_select_own on public.storage_ledger;
create policy storage_ledger_select_own on public.storage_ledger
  for select using (auth.uid() = user_id);

-- 3. Projection: rebuild ONE memory's ledger rows from its attachments jsonb.
create or replace function public.sync_storage_ledger()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Replace this memory's ledger rows with the current attachment set.
  delete from public.storage_ledger where memory_id = new.id;

  if new.attachments is not null
     and jsonb_typeof(new.attachments) = 'array' then
    -- DISTINCT ON the RESOLVED id so two attachments that resolve to the same
    -- key collapse to one row instead of raising an ON CONFLICT cardinality
    -- error ("cannot affect row a second time"), which would ABORT the memory
    -- write. WITH ORDINALITY keeps id-less/storagePath-less attachments distinct.
    insert into public.storage_ledger
      (user_id, workspace_id, memory_id, attachment_id,
       file_size_bytes, media_type, created_at)
    select distinct on (p.attachment_id)
      new.user_id,
      new.memory_profile_id,
      new.id,
      p.attachment_id,
      p.file_size_bytes,
      p.media_type,
      now()
    from (
      select
        coalesce(a.elem->>'id', a.elem->>'storagePath',
                 md5(a.elem::text) || '-' || a.ord) as attachment_id,
        case when a.elem->>'size' ~ '^[0-9]+$'
             then (a.elem->>'size')::bigint else 0 end as file_size_bytes,
        coalesce(a.elem->>'type', 'file') as media_type
      from jsonb_array_elements(new.attachments)
        with ordinality as a(elem, ord)
    ) p
    order by p.attachment_id;
  end if;

  return new;
end;
$$;

-- 4. Trigger: fire only when a ledger-relevant column changes (attachments /
--    workspace / owner). DELETEs are handled by the FK ON DELETE CASCADE above.
drop trigger if exists trg_sync_storage_ledger on public.memories;
create trigger trg_sync_storage_ledger
  after insert or update of attachments, memory_profile_id, user_id
  on public.memories
  for each row execute function public.sync_storage_ledger();

-- 5. Reconcile / backfill: rebuild the ENTIRE ledger from memories (idempotent).
--    Run once after deploy to account for all existing attachments; also usable
--    as a periodic drift-repair job.
create or replace function public.reconcile_storage_ledger()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Authoritative rebuild from the source of truth (memories.attachments).
  -- A full delete + re-project (atomic within this function) repairs ALL drift —
  -- removed attachments AND removed memories — which a partial delete misses.
  -- DISTINCT ON dedupes within a memory so duplicate ids never raise ON CONFLICT.
  delete from public.storage_ledger;

  insert into public.storage_ledger
    (user_id, workspace_id, memory_id, attachment_id,
     file_size_bytes, media_type, created_at)
  select distinct on (p.memory_id, p.attachment_id)
    p.user_id, p.workspace_id, p.memory_id,
    p.attachment_id, p.file_size_bytes, p.media_type, p.created_at
  from (
    select
      m.user_id            as user_id,
      m.memory_profile_id  as workspace_id,
      m.id                 as memory_id,
      coalesce(a.elem->>'id', a.elem->>'storagePath',
               md5(a.elem::text) || '-' || a.ord) as attachment_id,
      case when a.elem->>'size' ~ '^[0-9]+$'
           then (a.elem->>'size')::bigint else 0 end as file_size_bytes,
      coalesce(a.elem->>'type', 'file') as media_type,
      coalesce(m.created_at, now())     as created_at
    from public.memories m
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(m.attachments) = 'array'
           then m.attachments else '[]'::jsonb end
    ) with ordinality as a(elem, ord)
  ) p
  order by p.memory_id, p.attachment_id;
end;
$$;

-- 6. Fast read path: per-user usage aggregate. NOTE: lib/storage queries this via
--    the SERVICE-ROLE client (which BYPASSES RLS), so the load-bearing guard is the
--    explicit `.in("user_id", memberUserIds)` filter in usage.ts — NOT this view's
--    RLS. security_invoker is kept so a future RLS-client caller is also scoped.
--    Family pooling sums across a resolved member set server-side — no schema change.
create or replace view public.storage_account_usage
  with (security_invoker = true)
as
  select
    user_id,
    coalesce(sum(file_size_bytes), 0)::bigint as used_bytes,
    count(*)::bigint                          as attachment_count
  from public.storage_ledger
  group by user_id;

-- 7. Backfill existing data now.
select public.reconcile_storage_ledger();
