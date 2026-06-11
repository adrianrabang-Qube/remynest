-- =============================================================================
-- Historical Memory Dating
--
-- Adds an optional "when did this happen" date to memories, distinct from the
-- automatic `created_at` insertion timestamp. The timeline places a memory on
-- its EFFECTIVE date = coalesce(memory_date, created_at), so existing rows
-- (memory_date NULL) are completely unchanged — no backfill, no behavior change.
--
-- `memory_date_precision` allows dating to a day, month, year, or whole decade
-- ("the 1980s"), and is the seam future bulk-import features write through.
--
-- ADDITIVE + IDEMPOTENT. No behavior change on its own. App code writes
-- `memory_date` best-effort (no-op if absent), so deploy ordering is forgiving.
--
-- OPERATOR: apply in the Supabase SQL editor.
-- =============================================================================

alter table public.memories
  add column if not exists memory_date timestamptz;

alter table public.memories
  add column if not exists memory_date_precision text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'memories_memory_date_precision_check'
  ) then
    alter table public.memories
      add constraint memories_memory_date_precision_check
      check (
        memory_date_precision is null
        or memory_date_precision in ('day','month','year','decade')
      );
  end if;
end $$;

-- Effective-date ordering helper (NULLs sort with created_at at the app layer).
create index if not exists memories_memory_date_idx
  on public.memories (memory_date);
