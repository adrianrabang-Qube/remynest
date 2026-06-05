# Final Merge Checklist

**Date:** 2026-06-05
**Source:** `qa/playwright-phase1` → **Target:** `main`
**Type:** Audit / plan. No code or git history changed (dry-run merge was aborted).

---

## 1. Branch position

- HEAD is **19 ahead / 1 behind** `origin/main`.
- `origin/main` has one commit not in the branch: `1c73835 chore: ignore
  Playwright artifacts` (`.gitignore` only).
- Fast-forward is **not** possible (histories diverged) → use a **merge commit**.

## 2. Merge conflicts — NONE

Verified two ways (both non-destructive; dry merge aborted, tree clean):

- `git merge-tree --write-tree origin/main HEAD` → exit 0, **no conflict markers**.
- `git merge --no-commit --no-ff origin/main` → **merge exit 0**, **0 conflicted
  files** (`git diff --diff-filter=U` empty). `.gitignore` **auto-merged** cleanly
  (both sides' Playwright-ignore additions reconciled), then `git merge --abort`.

> The previously-anticipated `.gitignore` conflict does **not** occur — Git merges
> it automatically.

## 3. Recommended merge procedure

1. Open PR `qa/playwright-phase1` → `main`.
2. Confirm CI/local `npm run lint` + `npm run build` green (see FINAL_PRE_MERGE_REPORT.md).
3. Merge with a **merge commit (`--no-ff`)** — preserves the 19-commit audit
   trail. **No rebase/force-push** (branch is shared/pushed).
4. No conflict resolution needed.

## 4. Pre-merge gates (must be satisfied first)

- [x] Lint/build/tests green (FINAL_PRE_MERGE_REPORT.md)
- [x] No merge conflicts (this report)
- [x] `CRON_SECRET` present in Vercel (VERCEL_ENV_READINESS_REPORT.md)
- [ ] **Sentry env vars added to Vercel** (currently missing → monitoring inactive)
- [ ] **Supabase backups verified + test restore** (BACKUP_VERIFICATION_REPORT.md — unverified)
- [ ] **Production test-data cleanup approved/executed** (TEST_DATA_CLEANUP_PLAN.md)
- [ ] Product sign-off on free-tier semantic-search **402** behavior change

## 5. Post-merge (deploy) steps

1. Pushing `main` auto-deploys production on Vercel — ensure env is set first.
2. Run production smoke tests (see MERGE_AND_DEPLOYMENT_PLAN.md §6):
   `/api/health` 200, auth redirect, cron 401 + scheduled run, login + memory
   CRUD, free-tier `/api/search` 402, legal pages 200, GDPR export download,
   Stripe webhook, Sentry capture (once DSN set).
3. Rollback if needed: Vercel instant rollback, or `git revert -m 1 <merge-sha>`
   (no DB migration → schema-safe).

## 6. Recommendation

The branch is **technically ready to merge** (clean, green, conflict-free).
Hold the **deploy** until the open gates in §4 are closed — specifically Sentry
env (monitoring), Supabase backup verification (hard gate for healthcare), and
test-data cleanup. Merging to `main` triggers a production deploy, so close those
gates **before** merging.
