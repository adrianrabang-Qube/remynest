# RemyNest — Claude Workflow (authoritative)

The **single source of workflow truth**. `/docs` is the source of **content truth**.
Do not create parallel workflow/instruction files — enhance this one.

## Start every session (mandatory) — Session Continuity Rule
1. **Read `docs/handoffs/HANDOFF_CURRENT.md` FIRST**, then the **relevant sections of
   this `CLAUDE.md`** second. **Continue from the documented project state.**
2. Read **only the docs relevant to the task** (map below). Trust docs over rediscovery.
3. **Do not scan unrelated files** or run repository-wide analysis unless the task
   explicitly requires an audit. Identify the smallest set of files first.
4. **Do not repeat investigations already documented** (HANDOFF / this file), and
   **do not reintroduce retired features or re-litigate already-approved decisions**
   (e.g. the Workspace-navigation note below — the My Nest drawer row is retired).
5. **Treat documented architectural decisions as source-of-truth** — follow them
   unless concrete evidence in the current code proves a doc is stale; if so, fix the
   doc in the same task rather than silently diverging.

Doc map → product/system: `docs/MASTER_SPEC.md` · feature: `docs/features/<x>.md` ·
architecture: `docs/architecture/{system-architecture,database-overview,api-overview}.md` ·
audit entry: `docs/architecture/project-map.md` · priorities:
`docs/roadmap/launch-roadmap.md` · prompt templates: `docs/CLAUDE_WORKFLOW.md`.

## Operating modes

### INVESTIGATION MODE — default
Any prompt that does **not** contain the literal `EXECUTION MODE`. Read-only; no
code/migration/infra changes. Output **exactly** these four sections, then STOP and
wait for approval:
- **Documents Read**
- **Understanding**
- **Suspected Files**
- **Investigation Plan**

### EXECUTION MODE — on keyword
Triggered when the prompt contains `EXECUTION MODE`. Run the full cycle **without
waiting for approval**: investigate → implement → test → `npm run lint` →
`npm run build` → validate → update docs → commit → report (Completion Protocol).

## Token efficiency
- Documentation is authoritative; prefer it over rediscovery.
- Read the minimum necessary; targeted reads over broad greps.
- Never repository-wide scan when targeted inspection works.
- Schema is dashboard-managed — verify FK/RLS/columns in the Supabase SQL editor,
  not by scanning code.

## Engineering rules
- Respect middleware route registration; RLS scoping (the service-role client
  **bypasses RLS** — scope every admin query by user id); **return structured
  results, never `throw`, for expected business rules** (Server Action errors are
  redacted in production); non-clinical AI language.
- No `eslint-disable` / TS suppression; never weaken auth or validation; no Stripe
  or schema changes without approval.
- Destructive / outward-facing actions (DB migration, deletion, Vercel, deploy) are
  **operator steps** unless explicitly authorized — provide the exact command.
- **`main` auto-deploys to production.** Don't commit/push/merge unless asked
  (EXECUTION MODE authorizes the commit step for the task at hand).

### Critical systems — do not break
Authentication · Supabase (RLS) · Stripe billing · OneSignal · memory CRUD ·
media uploads · timeline · search · memory chat · AI insights (non-clinical) ·
profile/workspace switching · caregiver workflows · GDPR export/delete.

**Workspace navigation (authoritative, 2026-06-17):** **"My Nest"** (the personal
workspace) navigation lives in the **profile dropdown** — `ProfileHub` renders the
"My Nest" entry, which closes the menu, calls `setPersonalWorkspace` (cookie), and
navigates to `/home`. Selecting it **switches to the Personal Workspace and
navigates to `/home`** — My Nest is **not a page; it is a workspace state**.
**Care-profile switching + management** (enter a care workspace, invite caregiver,
add a person) lives in the **workspace drawer** (`WorkspaceSelector`, in the header)
and is **preserved on both desktop + mobile**. The drawer's old "My Nest" row was
**intentionally retired** — rationale: eliminates the drawer's recurring overlay/
scroll-lock trap, removes the duplicate My-Nest navigation path, preserves the
workspace architecture, and improves mobile UX. There is **no dedicated "My Nest"
page** (it is a workspace context; its home is `/home`).
Do **not** reintroduce a "My Nest" row in the workspace drawer, a "Switch to My
Nest" button in `ProfileMenuItems`, or a dedicated My Nest route.

## Mandatory documentation maintenance (Definition of Done)
A task is **not complete** until, in the **same commit**:
- `docs/handoffs/HANDOFF_CURRENT.md` is updated;
- the relevant `docs/features/*` is updated **if** architecture/behavior changed;
- `docs/roadmap/launch-roadmap.md` is updated **if** priorities changed.

**Documentation Maintenance Rule.** Any completed implementation that changes
**architecture · navigation · authentication · billing · database schema · AI
behavior · memory architecture · mobile behavior · deployment workflow ·
integrations · user-facing workflows** MUST, in the **same commit**, update **both**:
1. `docs/handoffs/HANDOFF_CURRENT.md`; **and**
2. **`CLAUDE.md`** — whenever the change establishes, retires, or supersedes an
   architectural decision or standard. Record it as **authoritative** (with a date)
   so future sessions don't re-investigate, re-litigate, or reintroduce it.

### HANDOFF_CURRENT.md must always contain
Current status · Completed work · Open issues · Active branch · Next priorities ·
Blockers · Recent commits.

## Completion protocol (end every EXECUTION task with)
1. Summary
2. Files Changed
3. Documentation Updated
4. Tests Run
5. Build Status
6. Commit Hash
7. Next Recommended Action
