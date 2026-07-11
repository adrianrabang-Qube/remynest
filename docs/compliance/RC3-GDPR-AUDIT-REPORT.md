> DRAFT — RemyNest RC3 (GDPR & Privacy Compliance) audit + hardening report, 2026-07-11.
> Internal engineering record; the legally-operative posture requires sign-off by qualified
> data-protection counsel. [CONFIRM] markers throughout the compliance docs need operator input.

# RemyNest RC3 — GDPR & Privacy Compliance Report

**Date:** 2026-07-11  **Phase:** Release Candidate 3 (compliance hardening, not feature development)
**Method:** 10-dimension multi-agent source audit → verified-gap triage → low-risk code/doc hardening →
5-lens adversarial review (GDPR auditor · DPO · healthcare-privacy · Apple · Google Play).

---

## 1. Executive summary

RemyNest is **architecturally strong** on the parts of GDPR that are hardest to retrofit —
confidentiality, access control, and self-service data rights. Access + Portability (in-app JSON
export) and Erasure (reauth-gated transactional account deletion with storage cleanup) are **live**,
the media bucket is private/signed-only, authorization is single-path and fails closed, and no
third-party behavioural tracking ships anywhere.

The RC3 audit found the compliance debt is concentrated in three areas: (1) a handful of **data-map
drift** issues (the export had not kept pace with new tables; some live legal copy contradicted the
shipped code); (2) **processor-side erasure gaps** (Stripe subscription/customer and the OneSignal
device are not deleted on account deletion); and (3) **missing standalone accountability documents**
(ROPA, DPIA, DPA, retention/incident/disclosure policies).

RC3 **implemented the low-risk, clearly-correct subset** — export completeness, PII-log minimisation,
Sentry PII scrubbing, transparency-copy corrections, subprocessor-list accuracy, and data-classification
comments — and **authored six missing internal compliance documents** (ROPA, Subprocessor List, Data
Retention, Incident Response, Responsible Disclosure, DPIA). The remaining items are **behaviour/feature
changes and legal/operator tasks** deliberately left to a scoped follow-up (they are not low-risk
compliance-hardening edits). No existing feature was changed; `tsc`/`lint`/`build` are green.

## 2. GDPR compliance score

**Baseline (as-audited): 70 / 100.**  **After RC3 hardening: ~80 / 100.**

The code/data posture is now strong; the ceiling is held down by items that are **legal/operator**
(legal entity + DPO + Art 27 rep + executed DPAs, live-page↔policy reconciliation) and a few
**behaviour follow-ups** (processor-side erasure, rectification endpoints, AI opt-out). None of the
residual items is a confidentiality/security defect.

## 3. Verified compliance strengths

- **Access + Portability** — in-app self-service Export (`/api/gdpr/export` → complete JSON), auth-scoped, rate-limited, never trusts a client id.
- **Erasure** — in-app self-service Delete account, **re-authentication-gated**, transactional `delete_user_account` RPC (ordered deletes + tombstone/transfer of cross-contributed memories) + recursive **private-bucket** storage cleanup + Supabase auth-user deletion, resumable via `pending_account_deletions`.
- **Confidentiality/Art 32** — Postgres RLS; single authorization path (`resolveProfileRole` → `userCanAccessProfile`/`WriteProfile`/`OwnsProfile`); protect-by-default middleware that **fails closed**; **private** media bucket served only via short-lived signed URLs; server-generated owner-scoped storage paths; service-role always scoped by session-derived user id; API rate limiting; HTTP security headers (CSP/HSTS/XFO/…); TLS + encryption at rest.
- **Data minimisation in AI** — `ai_usage` stores **metadata only** (no prompt/content); admin aggregates are service-role-only; Ask Remy/story are server-authoritative; **Art 22** — no solely-automated decisions with legal effect; non-diagnostic AI preamble.
- **No third-party tracking** — verified across `app`/`lib`/`components` + `package.json`; insights are derived 100% from the user's own data; Sentry Session Replay disabled.
- **Store-label readiness** — Apple Privacy Nutrition Labels (05) and Google Play Data Safety (06) docs are thorough and accurate to the implementation.

## 4. Verified compliance gaps

**Closed or materially improved by RC3** (code/doc): export completeness (people/ai_usage/memory_intelligence/storage_ledger); stale "deletion being finalized" privacy copy; subprocessor over/under-disclosure (analytics/Resend removed, OneSignal content added); Sentry PII scrubbing; raw-error-object PII logging; cookie transparency; care-profile authority note; and the six missing accountability documents (now Draft).

**Remaining (roadmap — behaviour/feature/legal, NOT done in RC3):**

| # | Gap | GDPR basis | Disposition |
|---|---|---|---|
| C1 | Stripe subscription not cancelled / customer not deleted on account deletion | Art 17 | **Critical follow-up** (billing phase) — interim: policy tells users to cancel first |
| H1 | OneSignal device/player not deleted at the processor on account deletion | Art 17 | High follow-up — interim: policy corrected |
| H2 | Per-memory delete + edit-removed attachments orphan storage bytes; no orphan-sweeper | Art 5(1)(e)/17 | High follow-up (orphan-sweep cron) — documented in-code |
| H3 | No in-product lawful-basis/authority capture + Art 14 notice for care-recipient data | Art 6/9/14 | High (legal + design) — RC3 added an in-form authority note (partial) |
| M1 | Rectification partial — care-profile name + own DOB/country not self-editable | Art 16 | Medium follow-up (edit endpoint) |
| M2 | No granular AI opt-out; content sent to OpenAI automatically | Art 21/9 | Medium follow-up (opt-out toggle) |
| M3 | OpenAI Zero-Data-Retention status unconfirmed (default ≤30-day API retention) | Art 28/5(1)(e) | Medium — [CONFIRM ZDR] + document |
| M4 | `ai_usage` has no TTL/rollup; `reminder_local_confirmations` not in deletion RPC; `auth_pending` has no retry cron | Art 5(1)(e)/17 | Medium follow-ups — documented in-code |
| M5 | Live legal pages diverge from `docs/compliance/*` (counsel-review banner; `[Jurisdiction to be confirmed]`; missing legal entity/DPO/legal-bases/retention detail) | Art 13/14 | Medium — reconcile live pages + resolve entity/jurisdiction/DPO |
| M6 | Derived cognitive/Alzheimer-risk "insights" vs the policy's "no health evaluations" | Art 9/13/22 | Medium — product/legal decision (also an App-Store risk) |
| M7 | Media exported as references, not portable binaries | Art 20 | Medium — bundle binaries / signed URLs |

## 5. Code improvements made (RC3)

- **Export completeness** — `lib/gdpr/collect-user-data.ts` now also exports `people`, `ai_usage`, `memory_intelligence`, `storage_ledger` (owner-scoped, additive, schemaVersion 1.1; operator-gated tables degrade to `[]`).
- **Sentry PII scrubbing** — new `lib/observability/sentry-privacy.ts` (`sendDefaultPii:false` + a `beforeSend` that strips request cookies/headers/body and redacts emails, never dropping events) wired into all three Sentry configs.
- **PII log minimisation** — new `logger.errorMessage()`; raw error **objects** (which can echo row values like an invitee email in a Postgres `.details`) replaced with message-only logs across `dashboard/actions.ts`, `active-profile`/`profile`/`timeline`/`build-relationships`/`memory-chat` routes and `onboarding`; a client-side console log of the plan removed; AI-chat narration dev-gated.
- **Transparency copy** — `app/privacy/page.tsx` corrected (self-service deletion is live; Art 22/no-training line added); `app/cookies/page.tsx` per-cookie transparency list; `components/CreateProfileForm.tsx` authority-attestation note (non-blocking).
- **Doc accuracy** — privacy-policy §13 subprocessor table corrected; deletion policy processor-side gaps disclosed; export report refreshed.
- **Data-classification / retention / erasure-gap comments** — added across the deletion, storage, media, cookie, AI-usage, and migration files so future edits keep the classification and known gaps visible.

## 6. Remaining documentation required

| Document | Status | Notes |
|---|---|---|
| Privacy Policy | **Partial** | Strong `docs/compliance/01`; **live `/privacy` diverges** — reconcile + resolve entity/DPO |
| Terms of Service | **Partial** | `docs/compliance/02` complete; live `/terms` has `[Jurisdiction to be confirmed]` + counsel banner |
| Cookie Policy | **Partial** | Live `/cookies` accurate (RC3 added per-cookie table); no standalone doc |
| Data Processing Agreement (DPA) | **Missing** | Bilateral contract — needs legal entity + counsel (roadmap) |
| Subprocessor List | **Complete (Draft)** | **RC3 authored** `docs/compliance/14` (authoritative register) |
| Security Policy | **Partial** | Described in Privacy Policy §12; no standalone Art 32 policy |
| Responsible Disclosure Policy | **Complete (Draft)** | **RC3 authored** `docs/compliance/17`; `security.txt` still roadmap |
| Data Retention Policy | **Complete (Draft)** | **RC3 authored** `docs/compliance/15` |
| Incident Response Policy | **Complete (Draft)** | **RC3 authored** `docs/compliance/16` |
| DPIA (Art 35) | **Complete (Draft)** | **RC3 authored** `docs/compliance/18` |
| ROPA (Art 30) | **Complete (Draft)** | **RC3 authored** `docs/compliance/13` |

## 7. Apple / Google Play readiness

**Apple Privacy Nutrition Labels** (grounded in the implementation; `docs/compliance/05`):
- **Tracking: "Data Not Used to Track You"** — no ATT/IDFA, no analytics/ad SDK.
- Contact Info (Name, Email): Collected=Yes, Linked=Yes, Tracking=No — App Functionality.
- User Content (Photos/Videos, Other, Customer Support): Collected=Yes, Linked=Yes, Tracking=No.
- Identifiers (User ID, Device ID/push token): Collected=Yes, Linked=Yes, Tracking=No. IDFA: **Not Collected**.
- Diagnostics (Crash/Performance): Collected=Yes, **Linked=No**, Tracking=No (Sentry sets no user, Replay off).
- Usage Data / Financial (iOS): **Not Collected** (no analytics; web-only Stripe, no native purchase UI).
- Health & Fitness / Location / Contacts: **Not Collected** (free-text content, not HealthKit — be ready to explain memory content may be special-category to App Review).

**Google Play Data Safety** (`docs/compliance/06`):
- Encrypted in transit=**Yes**; request deletion=**Yes** (in-app + `/account-deletion`); data export=**Yes**; data sold=**No**; shared with third parties=**No** (processors only).
- Collected (not shared): Name/Email/User IDs; Photos/Videos; Files/notes; Crash+Diagnostics; Device/other IDs; Purchase history (server-side Stripe).
- App activity/analytics: **Not collected** at launch (no analytics SDK). Audio/voice: future only.

## 8. Prioritised action plan

**Before public launch (operator/legal):**
1. Resolve the **registered legal entity + address + DPO/`privacy@`/`security@` mailboxes + Art 27 representative**; fill every `[CONFIRM]` in `docs/compliance/*`.
2. **Reconcile the live legal pages** (`/privacy`, `/terms`, `/cookies`) with `docs/compliance/01–02`, resolve `[Jurisdiction]` (Ireland per doc 02), and gate the counsel-review banner to non-production.
3. Confirm/execute **DPAs** with all six subprocessors; **[CONFIRM] OpenAI Zero-Data-Retention** and document it.
4. Legal decision on the **care-recipient Art 9 basis** + **Art 14** route; strengthen the authority attestation.
5. Product/legal decision on the **cognitive/Alzheimer-risk insights** (disclose with Art 9 basis, or remove) — also an App-Store risk.

**Engineering follow-ups (scoped phases — NOT this compliance-hardening pass):**
6. **Processor-side erasure** on account deletion: cancel Stripe subscription + delete customer; delete the OneSignal device (C1, H1).
7. **Storage erasure**: remove media on per-memory delete + edit; add an **orphan-sweep cron** (H2).
8. **Rectification**: care-profile name + own DOB/country edit endpoint (M1); **AI opt-out** toggle (M2).
9. Deletion robustness: enrol `reminder_local_confirmations` in the RPC; add an `auth_pending` retry cron; add an `ai_usage` TTL/rollup (M4).
10. Art 20: deliver **media binaries** (or signed URLs) in the export (M7); publish `/.well-known/security.txt` (needs a one-line middleware allowlist).

---

*Cross-references: `docs/compliance/13-records-of-processing-activities-ROPA.md`, `14-subprocessor-list.md`,
`15-data-retention-policy.md`, `16-incident-response-policy.md`, `17-responsible-disclosure-policy.md`,
`18-DPIA.md`. Full per-dimension audit evidence is in the RC3 session transcript.*
