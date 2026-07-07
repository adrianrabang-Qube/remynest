-- =============================================================================
-- Reminder processing-lock LEASE (recovery for stuck `processing=true`)
--
-- The reminder cron takes an optimistic lock (`processing=true where processing=false`)
-- but had no timestamp — so a cron invocation that timed out / crashed / was interrupted
-- by a deploy AFTER locking but BEFORE releasing left the row `processing=true` forever,
-- and the due-query (`processing=false`) never selected it again → a permanent silent miss.
--
-- This adds `processing_at` (when the lock was taken). The cron (probe-gated, so this is
-- inert until applied) reclaims a lock older than its lease window, atomically and
-- race-safely (the reclaim WHERE checks `processing_at < lease` and the update SETS
-- `processing_at = now()`, so only one concurrent tick can win).
--
-- ADDITIVE + IDEMPOTENT. No behavior change until the code probe sees the column.
-- OPERATOR: apply in the Supabase SQL editor.
-- =============================================================================

alter table public.reminders
  add column if not exists processing_at timestamptz;

-- Supports the reclaim scan over currently-locked rows.
create index if not exists reminders_processing_at_idx
  on public.reminders (processing_at)
  where processing is true;
