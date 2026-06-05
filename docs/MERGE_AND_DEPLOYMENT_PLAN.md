# RemyNest — Merge & Deployment Plan

**Date:** 2026-06-05
**Source:** `qa/playwright-phase1` · **Target:** `main` (production)
**State:** HEAD is **19 ahead, 1 behind** `origin/main`.
**Type:** Audit / plan only. No code, `.env.local`, Vercel, or Supabase changes.

---

## Branch delta (what merges into main)

19 commits: AI disclaimers, premium enforcement, GDPR export + deletion scaffold,
legal pages, ops/cron/Sentry hardening, API error-leak fixes, `/api/health`, and
docs. **App-affecting code:** `middleware.ts` (+public routes), `next.config.js`
(Sentry + `instrumentationHook`), 3 cron/notification routes (now require
`CRON_SECRET`), 2 search routes (free tier now 402), error boundaries → Sentry,
new `app/api/gdpr/*`, `app/api/health`, legal pages, AI disclaimers, sentry
configs. **No database schema changes.**

`origin/main` has **1 commit not in the branch:** `1c73835 chore: ignore
Playwright artifacts` (touches `.gitignore` only).

---

## 1. Exact merge strategy

Because `main` diverged by one commit, **fast-forward is not possible**.

1. Open a PR: `qa/playwright-phase1` → `main`.
2. **Expected conflict:** `.gitignore` — both branches added Playwright ignore
   entries. Resolve by **keeping the union** of both sets (no entries dropped).
3. Merge with a **merge commit (`--no-ff`)** to preserve the 19-commit audit
   trail. **Do not rebase/force-push** — the branch is already pushed/shared.
4. **Gate the merge** on: `npm run lint` ✅ + `npm run build` ✅ on the merge
   result, and **Vercel env configured first** (§3) — production deploys
   automatically on push to `main`, so env must exist *before* the merge lands.

Recommended sequence: **set Vercel env (§3) → verify Supabase (§4) → merge PR →
auto-deploy → smoke test (§6)**.

---

## 2. Risks of merging into main

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | `CRON_SECRET` fail-closed — reminders stop if Vercel lacks it | **Critical** | Set `CRON_SECRET` in Vercel **before** deploy (§3) |
| R2 | Semantic search now returns **402 for free tier** (`/api/search`, `/api/memories/search`) — behavior change | High | Confirm product intent; comms if needed |
| R3 | Sentry increases bundle (~88→153 kB shared; middleware ~84→144 kB) | Medium | Acceptable; tune later |
| R4 | New public routes (`/api/health`, `/privacy`, `/terms`, `/cookies`) | Low | Intended public; verify in smoke test |
| R5 | `next.config` Sentry wrap + `instrumentationHook` build change | Medium | Build verified locally; confirm Vercel build green |
| R6 | GDPR `DELETE /api/gdpr/delete-account` returns 501 (not functional) | Low | Export works; deletion by manual process |
| R7 | `.gitignore` merge conflict | Low | Resolve by union (§1) |
| R8 | 3 `remynest-e2e` test accounts remain in prod DB | Medium | Clean up (independent of merge) |
| R9 | `npm audit` vulnerabilities from new deps | Medium | Triage before/after launch |

No schema migration is required, so there is **no DB-migration risk** in this merge.

---

## 3. Required Vercel environment variables

**New (must add before deploy):**
- **`CRON_SECRET`** — Production + Preview. *Without it, cron endpoints 401 and reminders stop.* (R1)
- `NEXT_PUBLIC_SENTRY_DSN` — activates client Sentry.
- `SENTRY_DSN` — server/edge (optional; falls back to the public DSN).
- `SENTRY_ORG`, `SENTRY_PROJECT` — source-map upload target.
- `SENTRY_AUTH_TOKEN` — build-time source-map upload (secret).

**Confirm already present (unchanged):** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
the `STRIPE_*_PRICE_ID` set, `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`.

---

## 4. Required Supabase verification steps

- Confirm **RLS** remains enabled on all tables (validated on branch).
- **Verify backups/PITR** (Postgres **and** Storage); define RPO/RTO; perform a
  **test restore** (see BACKUP_RECOVERY_REPORT.md). *Hard gate for healthcare data.*
- **No schema migration** is needed — confirm none is pending.
- **Clean up E2E test data:** remove the 3 `remynest-e2e@example.com` accounts and
  their profiles/memory/relationship rows from production.
- Confirm the service-role key used by `gdpr/*`, `cron/*`, and admin paths is the
  intended production key.

---

## 5. Required Sentry activation steps

1. Set DSN/org/project/auth-token in Vercel (§3).
2. Confirm release auto-detection via `VERCEL_GIT_COMMIT_SHA` on the deploy.
3. Confirm **source maps upload** during the Vercel build (auth token present).
4. Trigger a **test error on a Preview deploy** and confirm it appears in Sentry
   with readable (symbolicated) stack traces.
5. Confirm **Session Replay stays disabled** (PHI) — already set in config.
6. Configure Sentry **alert rules** (new-issue / error-rate).

---

## 6. Required production smoke tests (post-deploy on `main`)

- `GET /api/health` → **200** `{status:"ok"}`.
- Unauthenticated `/dashboard` → redirect to `/login`.
- `GET /api/cron/send-due-reminders` **without** secret → **401**; confirm the
  **Vercel-scheduled** cron run succeeds (logs show processed count).
- Log in (real test account) → load `/memories`, `/timeline`.
- Create a memory → confirm it appears in list/detail.
- Free-tier `POST /api/search` → **402** (premium gate).
- `/privacy`, `/terms`, `/cookies` → **200**.
- Authenticated `GET /api/gdpr/export` → downloads JSON.
- Confirm **Stripe webhook** still receives events (signature path).
- Confirm a **Sentry** event is captured.

---

## 7. Rollback procedure

1. **Fastest — Vercel instant rollback:** Deployments → promote the previous
   production deployment. No code/data change; reverts all app behavior
   (semantic-402, cron auth, Sentry, legal pages) atomically.
2. **Git revert (if rollback must persist):** `git revert -m 1 <merge-commit-sha>`
   on `main` and push → triggers a clean redeploy of the pre-merge state.
3. **No database rollback required** — the merge introduces **no schema/data
   migrations**; all changes are additive or behavioral and revert with the code.
4. **Config-only issues:** if a failure is due to a missing env var (e.g.
   `CRON_SECRET`), prefer a **forward fix** (set the var, redeploy) over a full
   rollback.
5. E2E test-data cleanup and Supabase settings are independent of rollback.

---

## 8. Go / No-Go recommendation

**Conditional GO** for merge + production (web/PWA), contingent on, in order:

1. ✅ Vercel env set — **`CRON_SECRET`** (non-negotiable) + Sentry vars.
2. ✅ Supabase **backups verified + test restore** (hard gate).
3. ✅ Product sign-off on the **free-tier semantic-search 402** behavior change.
4. ✅ Merge via PR (resolve `.gitignore` union, `--no-ff`); Vercel build green.
5. ✅ Post-deploy **smoke tests** (§6) pass; Sentry receiving events.

**NO-GO** if `CRON_SECRET` is not set in Vercel or backups are unverified.
Native App Store / Play Store distribution remains a separate, later workstream.

---

### Notes
- Merge is **schema-safe** (no migrations) → low rollback complexity.
- Set env **before** merging, since pushing to `main` auto-deploys production.
