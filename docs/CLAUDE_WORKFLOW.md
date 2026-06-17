# Claude Code Workflow — RemyNest

> **`/CLAUDE.md` is the single source of workflow truth and is authoritative for the
> session-start sequence, operating modes, and the Documentation Maintenance /
> Session Continuity rules. If anything here diverges, `/CLAUDE.md` wins.** This file
> is supporting guidance (prompt templates + project-specific tips).

How to drive efficient sessions on this codebase. **Start every session by
reading:** `docs/handoffs/HANDOFF_CURRENT.md` **first** (then the relevant
`/CLAUDE.md` sections, then `docs/MASTER_SPEC.md` / `docs/features/*` /
`docs/architecture/*` only as the task needs). This avoids rediscovery. Update
`HANDOFF_CURRENT.md` (and `/CLAUDE.md` for architectural decisions) at the end of
each major session.

## Ground rules (project-specific)
- **Schema is dashboard-managed** (no repo migrations except delete-account).
  To verify FKs/RLS/columns, run SQL in the Supabase SQL editor (PostgREST/REST
  cannot read catalogs). The harness can probe tables read-only via service role.
- **Middleware path lists** gate auth — a new page must be added to
  `PROTECTED_ROUTES`/`PUBLIC_ROUTES`, not just created.
- **Service-role bypasses RLS** — scope every admin query by user id/email.
- **Non-clinical:** never present AI/cognitive output as diagnosis/medical advice;
  keep disclaimers.
- Don't commit/push/merge unless asked. `main` auto-deploys to production.

---

## Prompt: Feature implementation
> Implement <feature>. First read `docs/MASTER_SPEC.md`, the relevant
> `docs/features/*` and `docs/architecture/*`. Before coding: list files to
> create/modify, DB dependencies (verify column/FK facts via SQL if unsure),
> API routes, and risks. Do not change schema without showing the migration.
> Respect middleware route registration and RLS scoping. Then implement,
> `npm run lint` + `npm run build`, and report. Do not commit unless I say so.

## Prompt: Bug investigation
> Investigate <bug>. Reproduce the code path from route → lib → DB. Check the
> known-issues list in `HANDOFF_CURRENT.md` first. Identify root cause with
> file:line references. Propose a fix and its blast radius. Do not modify code
> until I approve.

## Prompt: Production audit
> Audit <area> against production reality. Confirm middleware classification,
> auth, RLS enforcement, and error handling. Use read-only probes only; do not
> modify prod/Supabase/Vercel. Output findings + severity + exact fixes. No
> code changes.

## Prompt: Database review
> Review the schema for <tables>. Run the catalog queries (FKs + ON DELETE in
> `information_schema`, policies in `pg_policies`, nullability in
> `information_schema.columns`) in the SQL editor and report: ownership model,
> relationships, deletion behavior, RLS. Remember `memories` has no declared FKs
> and `auth.users` has no cascade. No code changes.

## Prompt: Release preparation
> Prepare a release for <branch>. Verify: working tree clean, branch synced,
> no merge conflicts vs `main`, lint+build green, env vars present
> (`vercel env ls`). Remember `main` auto-deploys. Produce the exact merge
> sequence (`--no-ff`) and a production smoke-test checklist
> (`/api/health` 200, auth redirect, cron 401, legal pages, free-tier 402,
> GDPR export). Do not merge/push until I confirm.

## Prompt: Security review
> Security-review <area>. Check: RLS enforcement (anon sees 0 rows), service-role
> scoping, middleware fail-closed behavior, `CRON_SECRET` on cron/notification
> endpoints, error-message leakage, public-bucket exposure. Read-only. Output
> risks (severity) + mitigations. No code changes.

## Prompt: Delete Account review
> Review the Delete Account system (`docs/features/gdpr-delete-account.md`).
> Verify: `memories.user_id` FK target + nullability, `memories` RLS policy text,
> deletion order vs FK rules, tombstone strategy (sentinel vs Admin-API; never
> raw `auth.users` insert), storage retain-aware cleanup, auth-last + pending
> recovery. Confirm Apple 5.1.1(v)/Play compliance. No destructive runs; test
> only on a disposable/non-prod account.

---

## Useful read-only probes (harness, service role)
- Table reachability / RLS signal: anon vs service-role row counts.
- FK existence: PostgREST embedding (`from(X).select('id, Y(id)')` — resolves if
  FK X→Y exists in `public`; cannot see `auth` schema).
- Vercel env: `npx vercel env ls`. Build check: `npm run build`.
