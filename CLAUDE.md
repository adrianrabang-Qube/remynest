# RemyNest — Claude Workflow (authoritative)

This is the **single source of workflow truth**. `/docs` is the source of **content
truth**. Do not create parallel instruction files (no CLAUDE_BOOT.md, no second
rules doc) — enhance this file instead.

## Mandatory startup protocol (every session)
1. **Read `docs/handoffs/HANDOFF_CURRENT.md` FIRST** — current state, in‑progress
   work, known issues, next priority.
2. Read **only the docs relevant to the task**:
   - Product/system → `docs/MASTER_SPEC.md`
   - A feature → `docs/features/<feature>.md`
   - Architecture → `docs/architecture/system-architecture.md`,
     `database-overview.md`, `api-overview.md`
   - Audit entry point → `docs/architecture/project-map.md`
   - Priorities → `docs/roadmap/launch-roadmap.md`
   - Prompt templates → `docs/CLAUDE_WORKFLOW.md`
3. **Trust `/docs` over rediscovery.** Do not re-derive architecture the docs
   already cover.

## Token efficiency
- **No repository-wide scanning** unless the task explicitly requires an audit.
- Prefer targeted reads (named files/sections) over broad greps.
- Reuse facts from `/docs`; only re-verify when asked to audit or when a fact is
  marked _(verify)_.
- Schema is **dashboard-managed** — confirm FK/RLS/columns in the Supabase SQL
  editor, not by scanning code.

## Two modes
**Investigation Mode** (audit / review / "why·where·is it safe"):
- Read-only. No code, migration, Vercel, or Supabase mutations.
- Output findings + `file:line` refs + a clear conclusion. No speculative fixes.

**Execution Mode** (build / fix / implement):
- Make the change → run `npm run lint` && `npm run build` → report results.
- Respect: middleware route registration; RLS scoping (the service-role client
  **bypasses RLS** — scope every admin query by user id); **return structured
  results, don't `throw`, for expected business rules** (Server Action errors are
  redacted in prod); non-clinical AI language.
- Don't commit/push/merge unless asked. **`main` auto-deploys to production.**
- Destructive / outward-facing actions (DB migrations, deletions, Vercel, deploys)
  are **operator steps** unless explicitly authorized — provide the exact command.

## Critical systems — do not break
Authentication · Supabase (RLS) · Stripe billing · OneSignal · memory CRUD ·
media uploads · timeline · search · memory chat · AI insights (non-clinical) ·
profile/workspace switching · caregiver workflows · GDPR export/delete.

## Before implementation, state
Files affected · risks · DB/schema/migration impact · testing.

## After implementation, always
Run `npm run lint` and `npm run build` and report results. Update
`docs/handoffs/HANDOFF_CURRENT.md` after major changes.

## Standardized output format
1. **Summary** — one line.
2. **Findings / Changes** — bullets with `file:line`.
3. **Verification** — lint/build/test results (Execution) or evidence (Investigation).
4. **Risks / follow-ups** — including operator actions with exact commands.
5. **Next step** — a single clear action.
