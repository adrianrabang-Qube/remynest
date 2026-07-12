-- =====================================================================
-- LA5.1 — Moderation Foundation (Apple Guideline 1.2 — User-Generated Content).
-- =====================================================================
-- The minimum production-ready moderation records to satisfy Apple 1.2 for a
-- PRIVATE, invite-only caregiver app: report an abusive user, report shared
-- content, and block a user. This is NOT a social platform — there are no public
-- profiles / feeds / comments / messaging; these tables only back an in-app
-- report + block mechanism and future (server-only) admin tooling.
--
-- SAFETY / SCOPE:
--  * ADDITIVE ONLY — two NEW tables; nothing existing is altered.
--  * REVERSIBLE — rollback = drop the tables (see the block at the end).
--  * PROBE-GATED — the app degrades gracefully until this migration is applied
--    (the moderation actions return a structured "unavailable" result rather than
--    crashing), so deploying the code before applying the migration is a no-op.
--  * WRITES to `status` come ONLY from the server via the service-role client
--    (which bypasses RLS) — there is intentionally NO update/delete policy for
--    authenticated/anon on moderation_reports (a reporter cannot change a report's
--    status; a reported user can never read reports about them).
--  * PRIVACY — reporter identity is NEVER exposed to the reported user: the SELECT
--    policy on moderation_reports is reporter-own only. user_blocks is blocker-own
--    only, so a blocked user cannot discover who blocked them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- moderation_reports — one report of a user OR a piece of shared content.
-- ---------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id                    uuid primary key default gen_random_uuid(),
  reporter_account_id   uuid not null references auth.users (id) on delete cascade,
  -- 'user' = report an abusive/authorized user; 'content' = report a shared memory.
  target_type           text not null check (target_type in ('user', 'content')),
  -- The reported user (for target_type='user', and also recorded as the author for
  -- content reports when known). SET NULL on account deletion so the moderation
  -- record survives without dangling PII.
  reported_account_id   uuid null references auth.users (id) on delete set null,
  -- The reported memory (for target_type='content'). SET NULL if the memory is deleted.
  memory_id             uuid null references public.memories (id) on delete set null,
  -- Workspace context (the active memory_profile_id; NULL = My Nest / no shared context).
  memory_profile_id     uuid null,
  reason                text not null check (reason in (
    'harassment', 'spam', 'fake_account', 'inappropriate_behavior',
    'inappropriate_content', 'privacy_concern', 'other'
  )),
  -- Optional free-text detail from the reporter (bounded; no PII required).
  description           text null check (description is null or char_length(description) <= 2000),
  status                text not null default 'pending' check (status in (
    'pending', 'reviewing', 'actioned', 'dismissed'
  )),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- A reporter cannot report themselves.
  constraint moderation_reports_not_self
    check (reported_account_id is null or reported_account_id <> reporter_account_id)
  -- NOTE (deliberately NO "must have a target" CHECK): a report is discriminated by
  -- target_type + reason + description and stays meaningful even when BOTH id refs
  -- are null. That state is REACHED BY DESIGN — the FKs are ON DELETE SET NULL so a
  -- moderation record survives the deletion of the reported user or memory without
  -- dangling PII. A CHECK requiring a non-null target would be re-evaluated on the
  -- SET-NULL update and ABORT the parent account/memory delete (a GDPR Art 17
  -- failure: the reported user's auth/email PII could never be erased). The server
  -- always inserts a target, so empty reports are never created at write time.
);

create index if not exists moderation_reports_reporter_idx
  on public.moderation_reports (reporter_account_id);
create index if not exists moderation_reports_reported_idx
  on public.moderation_reports (reported_account_id);
create index if not exists moderation_reports_memory_idx
  on public.moderation_reports (memory_id);
-- Admin triage: newest pending first.
create index if not exists moderation_reports_status_created_idx
  on public.moderation_reports (status, created_at desc);
-- Duplicate-report guard support: a reporter's OPEN report for the same target.
create index if not exists moderation_reports_dedup_user_idx
  on public.moderation_reports (reporter_account_id, reported_account_id)
  where target_type = 'user' and status in ('pending', 'reviewing');
create index if not exists moderation_reports_dedup_content_idx
  on public.moderation_reports (reporter_account_id, memory_id)
  where target_type = 'content' and status in ('pending', 'reviewing');

alter table public.moderation_reports enable row level security;

-- A reporter may INSERT their own reports (reporter_account_id must be themselves).
drop policy if exists "moderation_reports_insert_own" on public.moderation_reports;
create policy "moderation_reports_insert_own"
  on public.moderation_reports
  for insert
  with check (auth.uid() = reporter_account_id);

-- A reporter may READ their own reports (to see status). NO ONE else can read them
-- via RLS (the reported user can never see a report about them, nor the reporter's
-- identity). Admin reads use the service-role client, which bypasses RLS.
drop policy if exists "moderation_reports_select_own" on public.moderation_reports;
create policy "moderation_reports_select_own"
  on public.moderation_reports
  for select
  using (auth.uid() = reporter_account_id);

-- Keep updated_at fresh on any write (service-role status updates).
create or replace function public.moderation_reports_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists moderation_reports_touch_trg on public.moderation_reports;
create trigger moderation_reports_touch_trg
  before update on public.moderation_reports
  for each row execute function public.moderation_reports_touch();

-- ---------------------------------------------------------------------
-- user_blocks — a directional block (blocker no longer wants interaction with
-- blocked). Enforced at the invitation path (a block prevents a future caregiver
-- invitation in EITHER direction). Does NOT remove existing care access — that is
-- a separate explicit action (owner revoke / caregiver leave).
-- ---------------------------------------------------------------------
create table if not exists public.user_blocks (
  id                  uuid primary key default gen_random_uuid(),
  blocker_account_id  uuid not null references auth.users (id) on delete cascade,
  blocked_account_id  uuid not null references auth.users (id) on delete cascade,
  created_at          timestamptz not null default now(),
  constraint user_blocks_unique unique (blocker_account_id, blocked_account_id),
  constraint user_blocks_not_self check (blocker_account_id <> blocked_account_id)
);

create index if not exists user_blocks_blocker_idx
  on public.user_blocks (blocker_account_id);
-- Enforcement checks both directions (did EITHER party block the other), so index
-- the blocked column too.
create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_account_id);

alter table public.user_blocks enable row level security;

-- A user manages ONLY their own blocks (create / read / delete rows they authored).
-- A blocked user cannot see who blocked them (no policy exposes the blocked side).
-- The bidirectional enforcement check runs server-side via the service-role client.
drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks
  for insert
  with check (auth.uid() = blocker_account_id);

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks
  for select
  using (auth.uid() = blocker_account_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks
  for delete
  using (auth.uid() = blocker_account_id);

-- =====================================================================
-- ROLLBACK (run to fully reverse this migration):
--   drop trigger if exists moderation_reports_touch_trg on public.moderation_reports;
--   drop function if exists public.moderation_reports_touch();
--   drop table if exists public.user_blocks;
--   drop table if exists public.moderation_reports;
-- =====================================================================
