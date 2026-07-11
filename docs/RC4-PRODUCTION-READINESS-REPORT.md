# RemyNest RC4 — Production Launch Readiness Report

**Date:** 2026-07-11  **Phase:** Release Candidate 4 (final engineering hardening before App Store / Google Play)
**Method:** 8-dimension multi-agent production audit → verified-issue triage → low-risk hardening →
7-lens adversarial self-review (Senior Staff · SRE · DevOps · Performance · Security · Apple · Google Play).
**Constraint:** preserve all behaviour; no architecture change; the FROZEN reminder engine was not modified.

---

## 1. Executive summary

RemyNest's engineering fundamentals are strong: disciplined error boundaries at every route/segment, a
race-safe reminder cron (lease + bounded retry/abandon + fail-closed `CRON_SECRET`), an idempotent
500-retry Stripe webhook, no client memory leaks, fail-safe/fail-closed env degradation, and the RC2
security headers + RC3 PII posture. The RC4 audit found the launch-gating gaps were concentrated, not
systemic: **(a)** a hot-path **PHI/PII logging leak** (`lib/profile-access.ts` logged a caregiver email +
full care-recipient rows to prod on every navigation; `build-people.ts` logged extracted person names) —
which the RC3 hardening had not covered, compounded by the Sentry scrubber only redacting the event
message (so those console logs rode to Sentry via breadcrumbs); **(b)** a missing **iOS app privacy
manifest** (ITMS-91053); and **(c)** **timeout-budget mismatches** (the live Ask Remy call armed a 30s
OpenAI abort but set no `maxDuration`, so the platform killed the function at ~15s with a raw 504 before
the graceful path could fire). RC4 fixed all of these plus a set of low-risk hardening items, and
documented the remainder (Storage-bucket backup, a few reliability follow-ups, Android) as
operator/roadmap work. `tsc`/`lint`/`build` are green.

## 2. Production Readiness Score — **85 / 100** (was 74 pre-RC4)

The gating logging leak, the missing manifest, and the timeout mismatches are resolved. The ceiling is
held by operator/infra items (Storage-bucket backup + a proven test restore) and a small set of
scheduled reliability follow-ups — none a confidentiality/security defect.

## 3. Reliability Score — **85 / 100** (was 76)

Cron/webhook/transaction cores were already hardened. RC4 added `maxDuration` budgets to every long/AI
route so failures return the route's structured error instead of a raw platform 504, gave the story
provider call a 30s timeout (parity with every other OpenAI caller), and cleaned up orphaned storage on a
memory-insert failure. Residual: no per-event Stripe idempotency ledger (idempotent by `.eq()` for
same-event retries, but no ordering guard), the `auth_pending` deletion path has no unattended retry
cron, and a full test restore is unproven — all scheduled.

## 4. Performance Score — **78 / 100** (was 73)

Snapshots are bounded, feeds/timeline paginated, charts code-split, zero client leaks, and the AI routes
now have explicit budgets. **Known (roadmap, NOT fixed — medium-risk):** the memory feed / timeline /
detail reads use `select('*')`, which serializes the unused 1536-dim embedding vector (~20–40 KB/row) on
the hottest endpoints; the fix (an explicit column list omitting `embedding`) needs careful enumeration
against every card's field usage, so it was deliberately deferred rather than risk breaking the feed.
Also roadmap: a `pg_trgm` GIN index for the leading-wildcard global search (operator/DBA, fine at launch
scale).

## 5. Observability Score — **88 / 100** (was 62)

The biggest RC4 lift. The `profile-access` / `build-people` PHI/PII console logs are removed (routed
through the dev-gated `logger`, IDs/counts only, errors reduced to `errorMessage()`); the residual
raw-`PostgrestError` logs across `memory-enrichment`, `memories/create`, `gdpr/export`, `register-device`,
`send-notification`, and `memories/route` are message-only; and the Sentry scrubber now redacts emails
across the event **message, captured exception values, AND console breadcrumbs** (defence-in-depth on the
PHI-to-Sentry path), still never dropping an event. Sentry (`enabled` only with a DSN, Session Replay
off, `sendDefaultPii:false`) and the dependency-free liveness `/api/health` remain correct. Residual
(low): `requestId` is not propagated to Sentry scope or to the write/billing/GDPR routes — non-blocking.

## 6. Deployment Readiness Score — **90 / 100** (was 80)

Per-feature fail-safe/fail-closed gating, git-ignored secrets, Capacitor-compatible CSP/headers, and the
single Vercel cron are all sound. RC4 added `poweredByHeader:false` (removes `X-Powered-By`
fingerprinting), a committed **`.env.example`** documenting every required runtime var, and explicit
`maxDuration` on the long routes. Residual (low/doc): no central env-var startup validator (features fail
safe, so a missing var is silent feature-loss, not a crash); migrations are hand-applied via the Supabase
SQL editor (idempotent `create … if not exists` + probe-gated; only `memory_intelligence` ships a
rollback block) — an applied-migrations log is recommended.

## 7. Issues Fixed (this phase — all low-risk, behaviour-preserving)

**Security / observability (launch-gating):**
1. `lib/profile-access.ts` — removed the caregiver-email + full-care-recipient-row logs (dev-gated, IDs/counts only, `errorMessage()`). *(BLOCKING PHI leak — closed.)*
2. `lib/build-people.ts` — dropped extracted person names from error logs; message-only via `logger`.
3. `lib/observability/sentry-privacy.ts` — extended the `beforeSend` scrubber to redact exception values + console breadcrumbs (+ data), never returning null.
4. Residual raw-error logs → message-only: `memory-enrichment.ts`, `memories/create` (`logPipelineError`), `gdpr/export`, `register-device`, `send-notification`, `memories/route`.

**Reliability:**
5. `maxDuration` added to `memory-chat` (60), `remy/story` page (60), `memories/search` (60), `memories/create` (60), `memories/upload-url` (30), `gdpr/export` (60), `gdpr/delete-account` (60), `build-relationships` (60).
6. `lib/remy/providers/openai-provider.ts` — 30s `AbortSignal.timeout` on the story completion (parity → graceful "unavailable" degrade).
7. `memories/create` — remove just-uploaded storage objects on a DB-insert failure (mirrors the over-quota cleanup; prevents orphan bytes).

**Deployment / store:**
8. `next.config.js` — `poweredByHeader:false`.
9. `.env.example` — committed reference of every required runtime var (allowlisted in `.gitignore`).
10. `ios/App/App/Info.plist` — `ITSAppUsesNonExemptEncryption=false` (removes the export-compliance prompt).
11. `ios/App/App/PrivacyInfo.xcprivacy` — **new** app privacy manifest (tracking=false; data types matching the nutrition labels; UserDefaults CA92.1).

**Docs:** `FINAL_LAUNCH_BLOCKERS.md` HB1 reconciled with the master-state backup decision.

## 8. Remaining Risks

| # | Risk | Severity | Disposition |
|---|---|---|---|
| R1 | **Storage-bucket (`memory-media`, PHI) has no backup/replication strategy** (Postgres daily backups don't cover Storage) | High | **Operator/infra** — highest-consequence residual; establish + test-restore before launch |
| R2 | Test restore never performed → RTO unproven | High | Operator — run + record a DB+media restore (BACKUP_OPERATOR_CHECKLIST §5) |
| R3 | `select('*')` ships the unused embedding vector on hot endpoints | Medium | Roadmap — enumerate explicit columns (verify vs card usage) |
| R4 | Stripe webhook has no per-event idempotency ledger / ordering guard | Medium | Roadmap — event-id dedup + version guard (rare; events arrive seconds apart) |
| R5 | `auth_pending` account-deletion has no unattended retry cron | Medium | Roadmap (RC3 item) |
| R6 | Android not Play/push-ready (no `google-services.json`/FCM; `allowBackup=true`; versionCode 1) | Medium | **Defer** — post-iOS workstream |
| R7 | Offline handling is event-only (no offline UI/queue) | Low | Accepted (server.url architecture); post-launch banner |
| R8 | No central env-var startup validation; no `requestId`→Sentry correlation | Low | Roadmap |
| R9 | createProfile care-limit is read-then-act (TOCTOU) | Low | Accepted for launch (≤1 extra profile on concurrent double-submit) |

## 9. Final Launch Checklist

**Code (done this phase):** ✅ PHI/PII log leaks closed · ✅ Sentry breadcrumb/exception scrubbing · ✅ AI/long-route `maxDuration` · ✅ story-provider timeout · ✅ memory-create orphan cleanup · ✅ `poweredByHeader:false` · ✅ `tsc`/`lint`/`build` green.

**Operator — iOS (before submission):**
- [ ] Add `ios/App/App/PrivacyInfo.xcprivacy` to the **App target → Copy Bundle Resources** in Xcode (a file in the folder is not bundled until it has target membership), then `pod install` + a native rebuild.
- [ ] Verify/extend `NSPrivacyAccessedAPITypes` against Xcode's **Privacy Report** (add File Timestamp / System Boot Time / Disk Space reasons only if your first-party code triggers them; third-party SDKs like OneSignal ship their own manifests).
- [ ] Confirm the `ITSAppUsesNonExemptEncryption=false` key is picked up (no more "Missing Compliance").
- [ ] Confirm App Privacy answers on App Store Connect match the manifest + nutrition-label doc (`docs/compliance/05`).

**Operator — infra (before/at launch):**
- [ ] Confirm daily Supabase backups are **enabled** (Pro plan) — BACKUP_OPERATOR_CHECKLIST §2.
- [ ] Establish a **Storage-bucket backup/replication** strategy (R1) — §4.
- [ ] Perform + record a **DB + media test restore** (R2) — §5; capture RTO.
- [ ] Set all `.env.example` vars in Vercel prod (esp. `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY`); apply the probe-gated migrations.
- [ ] Add a `pg_trgm` GIN index for global search at scale (R3, `CREATE INDEX CONCURRENTLY`).

**Config:** ✅ Stripe LIVE + webhook secret · ✅ Sentry DSN (prod) · ✅ OneSignal prod app id + REST key · ✅ security headers · ✅ `main` auto-deploy + Vercel instant-rollback runbook (MERGE_AND_DEPLOYMENT_PLAN §7).

## 10. Recommendation

- **READY FOR APP STORE — with the listed operator steps.** The iOS code is submission-ready (usage
  strings, per-config APNs entitlements, background modes, Capacitor config, the new privacy manifest +
  encryption key, and the Ask-Remy timeout fix). The gating items are operator actions (wire the privacy
  manifest into the Xcode target + native rebuild; confirm backups + a test restore), not code or
  architecture changes.
- **NOT READY FOR GOOGLE PLAY this cycle — defer Android.** The build succeeds, but there is no
  `google-services.json`/FCM configured (remote push / OneSignal would not deliver) and `allowBackup=true`;
  Play readiness is a post-iOS workstream (wire FCM, set `allowBackup=false`, bump `versionCode`).

---

*Full per-dimension audit evidence is in the RC4 session transcript. Frozen reminder system untouched.
The one HIGH residual (Storage-bucket backup, R1) is operator/infra and must be closed before launch.*
