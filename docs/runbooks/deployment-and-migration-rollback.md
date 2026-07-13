# Runbook 2 — Deployment & Migration Rollback

A broken release is live, a bad schema migration was applied, or the environment/config is
lost. `main` **auto-deploys to production** on push, so a bad merge reaches users in
minutes — but Vercel keeps every prior deployment immutable, so rollback is fast.

---

## A. Broken release (bad deploy is live)

**Detect:** error spike in Sentry right after a deploy; `/api/health` up but a feature 500s;
user reports immediately post-release.

**Impact:** feature/whole-app breakage. **No data loss** (compute is stateless). RTO ≤15 min.

**Immediate actions (fastest path first):**
1. **[OPERATOR] Vercel → Deployments →** find the last-known-good deployment → **"Promote to
   Production"** (instant rollback, no rebuild). This is the fastest mitigation — do this
   FIRST, diagnose after.
2. Confirm `/api/health` + a smoke test on the rolled-back build.
3. Then fix forward on a branch; do **not** re-push the bad commit to `main`.

**Git-side (source of truth):** the bad commit is still on `main`. Either revert it
(`git revert <sha>` → PR → merge, which triggers a clean deploy) or fix-forward. Vercel's
promote is the *mitigation*; the git revert is the *durable* fix so the next deploy is clean.

**Caveat — schema coupling:** if the bad release shipped **with a migration**, rolling back
code alone can leave code+schema mismatched. For the **additive feature migrations** (which
are probe-gated), an *extra* table/column is harmless (older code ignores it) and a *missing*
one is handled by the degrade path — so code and schema can be rolled back independently. For
**core/structural** migrations this isn't guaranteed. If the migration itself is
destructive/bad, see §B and coordinate: roll back code, then reverse the migration.

**Verify:** Sentry quiet; smoke test (login → memory CRUD → reminders page → checkout entry
[web]); `scripts/check-production-env.mjs`.

---

## B. Bad migration applied

RemyNest migrations are **operator-applied** in the Supabase SQL editor (dashboard-managed
schema) and **forward-only**. See also [runbook 1 §C](database-and-storage-recovery.md).

**Recovery:**
1. **Reverse it.** Only the two newest migrations ship an explicit `-- ROLLBACK` SQL comment —
   **`20260711140000_memory_intelligence.sql`** and **`20260712120000_moderation_foundation.sql`**
   (drop-table reversible, no impact on existing tables); copy the block into the SQL editor.
   The **other 11 migrations have no rollback block** — reverse a purely-additive one by hand
   (drop the added table/column/policy/trigger), and treat one that altered existing data as
   corruption (step 2).
2. If the migration **altered/backfilled existing data** incorrectly, treat it as data
   corruption → [runbook 1 §B](database-and-storage-recovery.md) (restore).
3. Re-align code: if code depends on the reversed migration, roll back that deploy too (§A).

**Prevent:** rehearse in a staging project (roadmap); **add a rollback block to new
migrations** (only the two newest have one today); keep new features probe-gated so schema
and code deploy independently.

---

## C. Environment / configuration loss

**Detect:** post-deploy, a whole subsystem silently stops (uploads, AI, push, cron 401s) —
often a **missing/rotated env var**. The app **fails safe** (silent feature loss), so this
is easy to miss without the check below.

**Immediate actions:**
1. Run **`node scripts/check-production-env.mjs`** against the environment (or eyeball
   Vercel → Settings → Environment Variables against [`../.env.example`](../../.env.example)).
   It reports which **required** vars are missing (never prints secret values).
2. Restore the missing var from the **encrypted offline secrets copy**
   ([runbook 4](secrets-and-credential-rotation.md)); redeploy.

**Per-var failure mode** (from `.env.example`): missing `SUPABASE_SERVICE_ROLE_KEY` → GDPR/
admin/ledger paths fail; missing `CRON_SECRET` → the reminder cron fails **closed** (401,
no delivery); missing `STRIPE_WEBHOOK_SECRET` → webhook signature rejects (entitlements
stall); missing `OPENAI_API_KEY` → AI degrades to "unavailable"; missing `ONESIGNAL_API_KEY`
→ server push stops (iOS local notifications still fire); missing Sentry DSN → observability
off (no-op).

**Verify:** re-run `check-production-env.mjs` (all required present); smoke test the
restored subsystem.

**Prevent:** keep the Vercel env store as the source of truth **and** an encrypted offline
backup; run the check script as a pre-deploy gate; never delete an env var without knowing
the degrade path above.

---

## D. Native (iOS/Android) release problems

The iOS shell loads the **live web URL**, so **web fixes reach iOS users without an App
Store release** — a broken web deploy is fixed by the web rollback above, no resubmission
needed. A **native** problem (crash on launch, bad `Info.plist`/entitlement/privacy
manifest, plugin linking) requires a new TestFlight/App Store build:

1. Reproduce on a device/simulator; check the Capacitor plugin linking (CocoaPods — do NOT
   migrate to SPM per the locked decision) and `Info.plist`/`PrivacyInfo.xcprivacy`.
2. Fix, `cd ios/App && pod install`, rebuild, re-submit. There is **no rollback** for a
   shipped native binary except shipping a new one — so the web-URL architecture is itself a
   resilience feature (most fixes are web-only). Android is a decided post-iOS deferral.
