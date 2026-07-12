# RemyNest LA5.1 — Apple Guideline 1.2 (User-Generated Content) Compliance

**Date:** 2026-07-12  **Phase:** LA5.1 (the CRITICAL engineering blocker from LA5)
**Method:** minimum production-ready moderation framework, then a 6-lens multi-agent review
(Apple App Review / Senior Security / Healthcare Architect / Supabase / Next.js / GDPR-Privacy)
→ **all 6 lenses: `satisfiesApple12 = true`**, **1 blocking defect + nits, all fixed**.
**Constraint:** maintain the existing architecture + authorization model; no social features;
structured-results-never-throw; frozen reminder engine untouched; no change to existing tables.

---

## 1. Apple 1.2 Compliance Status — **SATISFIED**

All six independent reviewers agreed the report-user / report-content / block / leave mechanism
is present, reachable, private, and IDOR-free. RemyNest now provides, for its private invite-only
caregiver model:
- **Report a user** — abusive/authorized user, 7 reasons + optional detail.
- **Report shared content** — a Report button on care-workspace search results for memories
  authored by someone else.
- **Block a user** — prevents future interaction (blocks new caregiver invitations AND accepting
  a pending invite, in either direction).
- **Leave a workspace** — a caregiver's self-service exit (recourse from an abusive owner).
- **Published contact + EULA** — the zero-tolerance "Objectionable content & abusive behavior"
  clause + 24h action window shipped in LA5 (`/terms`); the Safety Center restates it.

## 2. Engineering Changes Made

- **DB (migration, operator-applied):** `moderation_reports` (report a user or content;
  RLS insert-own + **select-own only**, no update/delete for users → status is service-role only)
  + `user_blocks` (RLS own-only; a blocked user can't discover who blocked them). Additive,
  reversible, probe-gated. FKs: reporter/blocker → CASCADE, reported/memory → **SET NULL** (record
  survives deletion without dangling PII). **No "must-have-target" CHECK** (see §4).
- **Config:** `lib/moderation/config.ts` (reasons/status/types, single source) + a `report`
  rate-limit preset.
- **Server actions** (`app/(app)/settings/safety/actions.ts`, structured/never-throw,
  session-derived actor, service-role reads scoped to the viewer's own access, degrade if tables
  absent): `reportUser`, `reportContent`, `blockUser`, `unblockUser`, `leaveWorkspace`,
  `listSafetyOverview`. Authorization boundary = `getSharedCarePeopleIds` (report/block only
  someone you share care with). Rate-limited + duplicate-report guard.
- **Block enforcement:** `inviteCaregiver` (create) **and** `acceptInvite` (accept) reject a
  blocked pairing in either direction (fail-open pre-activation).
- **UI:** `/settings/safety` Safety Center + settings link; shared portaled/focus-trapped
  `ReportDialog`; a Report button on care-context search results (`SearchResultRow` — sibling of
  the row link, no nesting; reportable rows are non-navigational to avoid the user_id-scoped 404).
- **GDPR export:** the user's own reports + blocks enrolled in `collect-user-data.ts` (v1.2).

## 3. Files Modified

**New:** `supabase/migrations/20260712120000_moderation_foundation.sql` ·
`lib/moderation/config.ts` · `app/(app)/settings/safety/{actions.ts,page.tsx}` ·
`components/moderation/{ReportDialog.tsx,SafetyCenter.tsx}` · `docs/features/moderation.md`.
**Modified:** `app/(app)/dashboard/actions.ts` (block enforcement on invite create + accept) ·
`app/(app)/settings/page.tsx` (Safety link) · `lib/security/rate-limit.ts` (`report` preset) ·
`lib/gdpr/collect-user-data.ts` (export enrollment) · `app/api/search/global/route.ts` +
`components/search/{types.ts,SearchResultRow.tsx,SearchView.tsx}` (content-report on search).

## 4. Security Review

**No IDOR, no privilege escalation, no injection.** The actor is always session-derived; a
client-supplied id is never trusted for authorization; the report/block target must be in
`getSharedCarePeopleIds` (prevents probing arbitrary ids); the invite/accept block-check `.or()`
filter interpolates only DB/session **UUIDs** (non-injectable); service-role reads are scoped to
the viewer's own accessible profiles; reports are rate-limited + deduplicated.

**Blocking defect found + FIXED:** the `moderation_reports` FK `ON DELETE SET NULL` collided with a
"must-have-target" CHECK — deleting a **reported** user would SET NULL `reported_account_id` (with
`memory_id` already null), violating the CHECK, aborting the `auth.users` delete, and **permanently
stranding the reported user's auth/email PII** (a GDPR Art 17 failure + account-deletion
regression). Fixed by removing that CHECK (the report stays meaningful via `target_type` + reason +
description; the server never writes an empty report).

**Accepted, documented (low-impact):** the "shares a care workspace" boundary is enforced in the
server actions, not the RLS INSERT policies — a direct PostgREST insert could plant moderation
noise (not a leak; reported users can't read reports; a planted block only blocks a future invite
the actor would issue). Matches the repo's app-layer-authz-over-RLS pattern.

## 5. Privacy Review

**GDPR-aligned.** Reporter identity is **never** exposed to the reported user (select-own RLS + all
reads reporter/blocker-scoped; no update/delete policy). Data minimisation: only reason + bounded
(≤2000) description; the Safety Center **masks** co-caregiver emails. Lawful basis = safety /
legitimate interest. Art 15/20 export now includes the user's own reports + blocks (v1.2). Art 17:
reporter deletion cascades their reports/blocks; reported/memory deletion SET-NULLs the ref so the
record survives without dangling PII (a surviving free-text description is retained under Art 17(3);
a retention/rollup policy is a future bound).

## 6. Remaining Apple Blockers — **NONE (engineering)**

**No remaining engineering blockers exist for iOS submission on Apple Guideline 1.2.** The one
remaining LA5 blocker (this mechanism) is now implemented and multi-agent-verified. The only other
LA5 iOS items are **non-engineering**: the `/terms` governing-law **jurisdiction** (legal/counsel)
and the App-Store submission package (metadata/screenshots/privacy labels/demo account).

## 7. Remaining Non-Engineering Tasks

- **OPERATOR (required to activate):** apply `20260712120000_moderation_foundation.sql` in the
  Supabase SQL editor **before** iOS submission (the code degrades to "unavailable" until then, so
  the mechanism must be live for App Review). Then run the deletion regression (report a user →
  delete that user → confirm `auth.admin.deleteUser` succeeds, no `auth_pending` stranding).
- **LEGAL:** governing-law jurisdiction (from LA5, unchanged).
- **PRODUCT/OPERATOR:** App-Store submission package (from LA5).

## 8. Production Readiness

**Production-ready** (behaviour-preserving; tsc/lint/build green; multi-agent-verified; probe-gated
so the deploy is a no-op until the operator applies the migration). Documented **follow-ups** (not
blockers): a Report affordance on the care **Timeline** (a second cross-user content surface —
Apple 1.2 is already satisfied via search + Safety Center); a `SECURITY DEFINER` RPC to move the
share-care boundary into RLS; a moderation-record retention/rollup policy; a (server-only) admin
review tool.

## 9. Updated Apple Compliance Score — **~80 → ~90 / 100**

LA5 scored Apple ~80 with the CRITICAL 1.2 mechanism open. With report/block/leave implemented +
verified, the last **code-level** 1.2 gate is closed; the residual gap to 100 is non-engineering
(jurisdiction + submission package + the operator migration step).

## 10. Launch Recommendation

**iOS — engineering-ready for submission on Guideline 1.2.** No remaining engineering blockers.
Sequence to submit: (a) **operator applies the moderation migration** + runs the deletion
regression; (b) counsel confirms the governing-law jurisdiction; (c) assemble the submission
package (metadata/screenshots/privacy labels/demo account). **Google Play remains deferred**
(no FCM/signing).

---

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green (re-verified
after the review fixes). Review: 7 agents, 0 errors, all 6 lenses `satisfiesApple12=true`, 1 blocking
defect + nits — the blocking defect and the high-value non-blocking items (GDPR export, accept-time
block enforcement, email minimisation, search dead-link, neutral invite message, corrected
architectural claim) all applied.*
