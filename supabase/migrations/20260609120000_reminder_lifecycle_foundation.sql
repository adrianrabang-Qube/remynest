-- =============================================================================
-- Reminder Lifecycle Foundation (Phase 1)
--
-- Adds the canonical lifecycle `status`, attribution + lifecycle timestamps, and
-- the append-only `reminder_events` audit log that powers adherence, streaks,
-- caregiver escalation, the dashboard focus engine, and future AI insights.
--
-- ADDITIVE + IDEMPOTENT. No behavior change on its own. The Phase-1 code writes
-- these columns best-effort (no-op if absent), so deploy ordering is forgiving;
-- still, apply this BEFORE deploying Phase 2 (cron decoupling).
--
-- OPERATOR: apply in the Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- reminders: canonical status + lifecycle/attribution columns
-- ---------------------------------------------------------------------------
alter table public.reminders
  add column if not exists status text not null default 'scheduled';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reminders_status_check') then
    alter table public.reminders
      add constraint reminders_status_check
      check (status in (
        'scheduled','notified','awaiting_confirmation',
        'completed','skipped','snoozed','missed'
      ));
  end if;
end $$;

alter table public.reminders
  add column if not exists missed_at     timestamptz;
alter table public.reminders
  add column if not exists snoozed_until timestamptz;
alter table public.reminders
  add column if not exists snooze_count  int not null default 0;
alter table public.reminders
  add column if not exists completed_by  uuid;
alter table public.reminders
  add column if not exists skipped_by    uuid;
alter table public.reminders
  add column if not exists actor_role    text;  -- recipient | caregiver | system

-- Backfill canonical status from the legacy boolean (delivery-era completions).
update public.reminders set status = 'completed'
  where completed is true and (status is null or status = 'scheduled');

create index if not exists reminders_profile_status_due_idx
  on public.reminders (memory_profile_id, status, remind_at);

-- ---------------------------------------------------------------------------
-- reminder_events: append-only audit/adherence log (the lifecycle spine)
--   - Intentionally NO FK to reminders(id): events outlive reminder deletion.
--   - memory_profile_id is denormalized for RLS scoping + fast care queries.
--   - Writes are service-role only (no authenticated insert/update/delete policy).
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_events (
  id                uuid primary key default gen_random_uuid(),
  reminder_id       uuid,
  memory_profile_id uuid,
  occurrence_at     timestamptz,           -- the scheduled instant this event refers to
  event_type        text not null,         -- created|scheduled|notified|completed|skipped|snoozed|missed|reopened|deleted|edited
  actor_id          uuid,                  -- null = system/cron
  actor_role        text,                  -- recipient | caregiver | system
  at                timestamptz not null default now(),
  metadata          jsonb not null default '{}'::jsonb
);

create index if not exists reminder_events_reminder_idx
  on public.reminder_events (reminder_id, at);
create index if not exists reminder_events_profile_type_idx
  on public.reminder_events (memory_profile_id, event_type, at);

alter table public.reminder_events enable row level security;

-- READ: profile owner OR caregiver of the event's memory_profile_id.
drop policy if exists "reminder_events_select_authz" on public.reminder_events;
create policy "reminder_events_select_authz"
on public.reminder_events
for select to authenticated
using (
  exists (
    select 1 from public.memory_profiles mp
    where mp.id = reminder_events.memory_profile_id
      and mp.created_by_account_id = auth.uid()
  )
  or exists (
    select 1 from public.profile_relationships pr
    where pr.memory_profile_id = reminder_events.memory_profile_id
      and pr.caregiver_account_id = auth.uid()
  )
);
-- WRITE: none for authenticated — only the service-role client (logReminderEvent).
