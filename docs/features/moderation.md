# Moderation & Safety (Apple Guideline 1.2)

**Status:** Implemented (LA5.1, 2026-07-12). The MINIMUM production-ready moderation
framework that satisfies Apple App Store Review Guideline 1.2 (User-Generated Content)
for RemyNest's **private, invite-only caregiver** model. This is **not** a social
platform — there are no public profiles, feeds, comments, messaging, or likes.

## Why RemyNest needs it

Users create memories and co-manage **care profiles** with invited caregivers/family.
That makes RemyNest a multi-user, content-sharing app, so Apple 1.2 requires an in-app
way to **report** abusive users / objectionable content and to **block** a user to
prevent further interaction. (The EULA "zero-tolerance" clause shipped separately in
LA5, on `/terms`.)

## What a user actually sees of another user (the scope that shaped this)

- The memory **feed** (`/api/memories`) and the memory **detail** page (`/memories/[id]`)
  are `user_id`-scoped — a user only sees **their own** memories there (the detail page
  `notFound()`s another author's memory).
- **Cross-user content IS visible** in two care-workspace surfaces, both scoped by
  `memory_profile_id` with **no** `user_id` filter (they return all contributors'
  memories): **global search** (`/api/search/global`) and the **care Timeline**
  (`app/(app)/timeline` CARE branch). "Report shared content" is currently wired on
  **search results** (a Report button on other-authored memory hits). A Report affordance
  on the care **Timeline** cards is a documented **follow-up** — Apple 1.2 is already
  satisfied because a working, reachable content-report path exists (search) plus
  report-user + block via the Safety Center. *(Whether these surfaces actually render
  another author's content depends on the dashboard-managed `memories` RLS SELECT policy;
  the feature assumes cross-author care reads, consistent with the existing search/timeline
  queries and the "shared care record" model.)*
- Cross-user **interaction** is caregiver invitation + co-management (no messaging), so
  "block prevents further interaction" is enforced at the **invitation path** (both invite
  creation and accept).

## Data model (`supabase/migrations/20260712120000_moderation_foundation.sql`)

Two additive tables (nothing existing is altered; reversible; probe-gated):

- **`moderation_reports`** — `reporter_account_id`, `target_type` (`user` | `content`),
  `reported_account_id` (nullable), `memory_id` (nullable), `memory_profile_id`,
  `reason` (enum), `description` (≤2000), `status` (`pending`/`reviewing`/`actioned`/
  `dismissed`), timestamps. **RLS:** insert-own + **select-own only** (a reporter can see
  their own reports' status; the reported user can **never** read reports about them, and
  reporter identity is never exposed). **No update/delete policy** → `status` transitions
  are **service-role only** (future admin tooling). FKs: reporter → `auth.users` CASCADE,
  reported → SET NULL, memory → SET NULL (moderation records survive account/memory
  deletion without dangling PII).
- **`user_blocks`** — `blocker_account_id`, `blocked_account_id`, unique + not-self.
  **RLS:** insert/select/delete **own only** (a blocked user cannot discover who blocked
  them). The bidirectional enforcement check runs server-side via the service-role client.

## Server actions (`app/(app)/settings/safety/actions.ts`)

All are **structured results, never throw**; the actor is **session-derived**
(`getCurrentUser`); cross-user reads use the **service-role client scoped to the viewer's
own accessible profiles**; every action **degrades gracefully** (returns a structured
"unavailable") if the migration isn't applied yet.

- `reportUser` / `reportContent` — validate the target (you can only report someone you
  **share care with**, or content in a **profile you can access + didn't author**),
  **rate-limit** (`isRateLimited('report', user.id)`), **dedup** (one open report per
  reporter per target), then insert.
- `blockUser` / `unblockUser` — you can only block someone you share care with; idempotent
  (unique constraint → "already blocked" is success).
- `leaveWorkspace` — a caregiver removes their **own** accepted, non-owner relationship
  (the caregiver-side counterpart to the owner's `revokeCaregiver`).
- `listSafetyOverview` — the Safety Center read model (people you share care with + block
  status + leavable workspaces).

**Authorization boundary:** `getSharedCarePeopleIds(viewerId)` = the other members (owner
+ accepted caregivers) of every profile the viewer can access. Reporting/blocking is
restricted to this set, which also prevents probing arbitrary account ids.

## Block enforcement (`app/(app)/dashboard/actions.ts` → `inviteCaregiver` + `acceptInvite`)

A block in **either direction** between the two accounts **rejects a new caregiver
invitation** AND blocks **accepting a pending invite** that predates the block
(`acceptInvite` runs the same bidirectional check) — the concrete "prevent further
interaction". A block **never** removes existing care access (that's the explicit
revoke/leave path — "preserve legitimate caregiver relationships unless explicitly
removed"). **Fail-open** if the `user_blocks` table isn't applied yet. The invite-blocked
message is neutral (it doesn't confirm to the inviter that the other party blocked them).

## UI

- **Safety Center** — `/settings/safety` (`components/moderation/SafetyCenter.tsx`),
  linked from Settings. Report / Block / Unblock the people you share care with; Leave a
  care workspace.
- **ReportDialog** (`components/moderation/ReportDialog.tsx`) — shared, portaled,
  focus-trapped; reason radio group + optional description; states reports are private.
- **Report shared content** — a `Report` button on care-context search results for
  memories authored by **someone else** (`SearchResultRow` renders it as a **sibling** of
  the row link — no nesting; API adds `reportableMemoryId` only for others' shared
  memories in a care workspace).

## Privacy / GDPR

- Reporter identity is **never** exposed to the reported user (RLS select-own + all reads
  are reporter/blocker-scoped).
- **Data minimisation** — only reason + optional bounded description; no unnecessary PII.
  The Safety Center **masks** co-caregivers' emails (`jo•••@example.com`) since it's
  visible to non-owner caregivers.
- **Art 15/20 export** — the reports a user FILED (`reporter_account_id`) and the blocks
  they SET (`blocker_account_id`) are enrolled in the GDPR export
  (`lib/gdpr/collect-user-data.ts`, schemaVersion 1.2). Reports ABOUT a user are NOT
  exported (that would leak reporter identity).
- **Lawful basis** — safety / legitimate interest (protecting users from abuse).
- **Retention / Art 17** — a reporter's account deletion CASCADEs their own reports +
  blocks; deleting a REPORTED user (or a reported memory) SET-NULLs the id ref, so the
  moderation record survives **without dangling PII**. There is deliberately **no
  "must-have-target" CHECK** — that CHECK would be re-evaluated on the SET-NULL update and
  abort the account/memory delete (a hard Art 17 regression). A surviving free-text
  `description` after the subject's erasure is retained under Art 17(3) (legitimate
  interest for safety); a future retention/rollup policy can bound it.

## Known limitations (accepted; documented)

- **RLS insert boundary is app-layer, not RLS-encoded.** The "you can only report/block
  someone you share care with" boundary lives in the server actions
  (`getSharedCarePeopleIds`), not in the table INSERT policies (which only enforce
  reporter/blocker-own + not-self + unique). A user calling PostgREST directly with their
  own JWT could insert a report/block against an arbitrary id. **Low impact** — the
  reported user can't read reports; a planted block only prevents a future invite the actor
  themselves would issue; it's moderation noise, not a data leak. This matches the repo's
  app-layer-authz-over-RLS pattern. Hardening to a `SECURITY DEFINER` RPC is a future option.
- **Care Timeline** lacks a per-item Report affordance (see the scope section above) —
  a documented follow-up, not an Apple-1.2 gap.

## Operator activation (REQUIRED before iOS submission)

Apply `supabase/migrations/20260712120000_moderation_foundation.sql` in the Supabase SQL
editor. The code **degrades gracefully** until then (report/block return a structured
"unavailable"), so deploying before applying the migration is a no-op — but the mechanism
must be **live** for App Review. `main` auto-deploys on push.

## Deliberately out of scope (not built)

Public profiles / feeds / comments / messaging / likes / recommendations / a moderation
**dashboard** (records are admin-ready; no admin UI). Enrolling `moderation_reports` /
`user_blocks` in the account-deletion RPC is covered by the FK cascade/set-null; a
dedicated admin review tool is a future operator workstream.
