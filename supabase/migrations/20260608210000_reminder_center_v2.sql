-- =============================================================================
-- Reminder Center V2 — Phase 2 schema (priority, pinning, decoupled lifecycle)
--
-- Additive + idempotent. The Phase-1 UI (ReminderCenter) already reads these
-- columns optionally and lights up the Priority/Pinned sections + the
-- "Awaiting confirmation" lifecycle state once they exist. Apply, then ship the
-- Phase-2 code changes (cron sets `sent`/`notified_at` instead of auto-completing;
-- skip/priority/pin server actions). RLS on `reminders` is unchanged.
--
-- OPERATOR: apply in the Supabase SQL editor.
-- =============================================================================

-- Priority (calm 3-tier; scales later). Default keeps existing rows "general".
alter table public.reminders
  add column if not exists priority text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reminders_priority_check'
  ) then
    alter table public.reminders
      add constraint reminders_priority_check
      check (priority in ('critical','important','general'));
  end if;
end $$;

-- Pinning (favourites / recurring life events).
alter table public.reminders
  add column if not exists pinned boolean not null default false;

-- Decoupled lifecycle timestamps (delivery != completion).
--   notified_at  : set by the cron when a push is accepted by OneSignal.
--   completed_at : set when the USER confirms completion.
--   skipped      : user chose to skip this occurrence.
alter table public.reminders
  add column if not exists notified_at  timestamptz;
alter table public.reminders
  add column if not exists completed_at timestamptz;
alter table public.reminders
  add column if not exists skipped boolean not null default false;

-- Backfill completed_at for already-completed rows (best-effort, from created_at).
update public.reminders
  set completed_at = coalesce(completed_at, created_at)
  where completed is true and completed_at is null;

-- Helpful indexes for the Center's section queries.
create index if not exists reminders_profile_due_idx
  on public.reminders (memory_profile_id, remind_at);
create index if not exists reminders_pinned_idx
  on public.reminders (memory_profile_id) where pinned is true;

-- ---------------------------------------------------------------------------
-- Phase-2 CODE changes that pair with this migration (NOT in this file):
--   1. Cron (send-due-reminders): on a successful send set `sent=true`,
--      `notified_at=now()` (NOT `completed`); due-query excludes already-notified
--      non-recurring rows (add `(sent is null or sent = false)`); recurring
--      reschedule resets `sent=false`. This makes "notified" != "completed".
--   2. New server actions: skipReminder, setPriority, togglePin (all
--      profile-ownership scoped, same model as the existing toggle/delete).
--   3. createReminder form: optional priority select + pin toggle.
-- ---------------------------------------------------------------------------
