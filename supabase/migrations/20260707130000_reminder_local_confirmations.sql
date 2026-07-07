-- =============================================================================
-- Reminder LOCAL-delivery confirmations (native iOS duplicate-notification fix)
--
-- On native iOS a reminder is delivered by an on-device local notification AND by the
-- cron's OneSignal push (external_id targeting reaches the same device) — a duplicate
-- when backgrounded/locked. This table lets the device record, PER REMINDER, that it has
-- an actual pending local notification for it. The cron (probe-gated) then SKIPS the
-- redundant push for confirmed reminders while STILL running its lifecycle bookkeeping
-- (recurring reschedule / one-time complete) — so the DB stays correct and no duplicate
-- is sent.
--
-- SAFETY: this fails TOWARD delivery. A confirmation is only written when a local is
-- actually pending on the device, is time-bounded (the cron ignores stale rows), and the
-- cron only suppresses when the confirmation's user_id MATCHES the reminder's user_id — so
-- a missing/stale/foreign confirmation always falls back to the push (never a silent miss).
--
-- ADDITIVE + IDEMPOTENT. Inert until applied (the cron probes for the table) AND until a
-- native build runs the confirmer. OPERATOR: apply in the Supabase SQL editor.
-- =============================================================================

-- Composite PK (reminder_id, user_id): a reminder can be confirmed by MORE THAN ONE
-- account (e.g. two caregivers each running the app on their own device), and the cron
-- suppresses a push only when there is a confirmation whose user_id MATCHES the reminder's
-- user_id — so one confirmer can never clobber another, and a foreign confirmation is inert.
create table if not exists public.reminder_local_confirmations (
  reminder_id  uuid not null,
  user_id      uuid not null,
  confirmed_at timestamptz not null default now(),
  primary key (reminder_id, user_id)
);

create index if not exists reminder_local_confirmations_confirmed_idx
  on public.reminder_local_confirmations (confirmed_at);

alter table public.reminder_local_confirmations enable row level security;

-- A user may only write/read confirmations under THEIR OWN user_id. The cron reads via
-- the service-role client (RLS bypassed). This prevents one account from suppressing
-- another account's reminder push (griefing) — and the cron's user_id match is a second
-- guard on top of this.
drop policy if exists "reminder_local_confirmations_select_own" on public.reminder_local_confirmations;
create policy "reminder_local_confirmations_select_own"
  on public.reminder_local_confirmations
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "reminder_local_confirmations_insert_own" on public.reminder_local_confirmations;
create policy "reminder_local_confirmations_insert_own"
  on public.reminder_local_confirmations
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reminder_local_confirmations_update_own" on public.reminder_local_confirmations;
create policy "reminder_local_confirmations_update_own"
  on public.reminder_local_confirmations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reminder_local_confirmations_delete_own" on public.reminder_local_confirmations;
create policy "reminder_local_confirmations_delete_own"
  on public.reminder_local_confirmations
  for delete to authenticated
  using (user_id = auth.uid());
