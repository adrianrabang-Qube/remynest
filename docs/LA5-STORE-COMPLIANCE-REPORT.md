# RemyNest LA5 — Apple App Store & Google Play Compliance

**Date:** 2026-07-12  **Phase:** LA5 (store-review compliance audit — behaviour-preserving)
**Method:** a 6-lens multi-agent audit (Apple App Review / Google Play policy / Mobile engineer /
Privacy-GDPR / Healthcare compliance / Security) over the real source — 28 raw findings → **21
survived adversarial per-finding verification** → scored synthesis. Safe, behaviour-preserving fixes
were then implemented and independently multi-agent reviewed.
**Constraint:** no architecture/business-logic/subscription/schema change; the FROZEN reminder engine
untouched (only a placeholder STRING changed); no native purchase UI; no new features.

---

## 1. Apple Compliance Score — **74 / 100** (pre-fix) → ~**80** after LA5's safe fixes

Strong on the hard parts (web-only purchase gating is comprehensive, self-service deletion + export
present, private signed-URL PHI, `PrivacyInfo.xcprivacy`, no tracking/IDFA/ATT), but held down by the
**CRITICAL Apple 1.2 gap** (no in-app report/block mechanism for content shared across accounts) which
is a **feature build**, not a copy fix — so the ceiling stays below submission-ready until it ships.
LA5 closed the *safe* half of 1.2 (the EULA zero-tolerance clause) and removed the residual
health-claim risks, but the score cannot cross ~85 until the report/block mechanism exists.

## 2. Google Play Compliance Score — **57 / 100**

Play is **not submittable** and remains a **decided post-iOS deferral**: `versionCode 1`, no release
signing, and no FCM/`google-services.json` (so Android push is non-functional). The Data Safety form +
Health-apps declaration are unstarted operator work. LA5's `allowBackup=false` hardening and the
Sentry/health-claim copy fixes reduce future-Android risk, but the same UGC report/block feature +
EULA clause are prerequisites there too.

## 3. GDPR Compliance Status — **Substantially compliant, with resolved accuracy gaps**

Self-service export (Art 15/20) + deletion (Art 17) exist, RLS + private signed-URL storage, PII-
scrubbed Sentry, non-diagnostic AI, no Art 22 automated decisions. LA5 fixed two **Art 13 recipient-
disclosure** gaps (Sentry now disclosed as a processor; account-deletion data-rights address
reconciled) and added an honest subscription-cancel-before-delete caveat. **Still open (operator/
roadmap):** controller legal-entity/DPO identity + provisioned mailboxes; the deletion executor does
not yet cancel Stripe / delete OneSignal-device PII (LOCKED RC3 roadmap feature); governing-law
jurisdiction (counsel).

## 4. Privacy Compliance Status — **Strong foundation; declaration drift reduced**

`PrivacyInfo.xcprivacy` present + accurate for tracking; no IDFA/ATT; private PHI. LA5 removed the
xcprivacy↔privacy-page **Sentry** inconsistency. **Remaining product decision (operator):** whether
freeform memory content is declared **Health/Sensitive** in the ASC label + (future) Play Data Safety,
and align all surfaces — today it is filed as *OtherUserContent*.

## 5. Subscription Compliance Status — **Compliant (web-only model)**

All Stripe checkout/portal/upgrade CTAs are gated off native via `lib/platform.ts`
(`useIsNativePlatform` render guard + `isNativePlatform()` handler guard) → no IAP/StoreKit and **no
Restore Purchases obligation** (nothing to restore); anti-steering (3.1.3) holds (no purchase link on
native). The only gap is a **consumer-accuracy** one, not a store-review IAP issue: account deletion
does not cancel a live web subscription — LA5 added the interim privacy-page caveat; the full
processor-side cancel is a separate LOCKED roadmap feature.

---

## 6. Required Fixes (before iOS submission)

| # | Severity | Fix | Class | Status |
|---|----------|-----|-------|--------|
| 1 | **CRITICAL** | **In-app report-content + block-user mechanism** for shared UGC (Apple 1.2) — report action on shared memories → moderation with a ~24h SLA; block/eject an abusive invited caregiver beyond owner-only revoke. `components/CaregiverManager.tsx` / `dashboard/actions.ts`. | **feature** | **OPEN** — the primary blocker; a dedicated engineering task (out of a compliance-fix scope). |
| 2 | HIGH | EULA zero-tolerance objectionable-content/abuse clause (Apple 1.2 / Play UGC). `app/terms/page.tsx`. | safe-code-fix | ✅ **DONE (LA5)** |
| 3 | HIGH | Terms governing-law bracketed placeholder `[Jurisdiction to be confirmed by counsel]` (Apple 2.1 placeholder content). `app/terms/page.tsx:111`. | legal | **OPEN** — needs counsel; do not fabricate a jurisdiction. |

## 7. Recommended Fixes

**Implemented in LA5 (safe, behaviour-preserving):**
- Removed the **residual pseudo-clinical cognitive-decline scoring** (`declineRisk`/`monitoringLevel`/
  `interventionSuggested` synthesized from journaling patterns) — deleted
  `lib/analytics/cognitiveDeclineSignals.ts` + the "Routine Changes" card
  (`components/insights/BehavioralAnalyticsCard.tsx`) + its `useMemo`/import/prop
  (`components/insights/InsightsClient.tsx`). Completes LA1's de-medicalization; honest routine/
  adherence/emotional-tone/activity views preserved.
- Dropped **health-app positioning** from reviewer-loadable metadata: JSON-LD `applicationCategory`
  `HealthApplication`→`LifestyleApplication` (`app/page.tsx`); removed "cognitive-care" from
  `lib/seo.ts`, the `/terms` metadata, and `app/contact/page.tsx`.
- Replaced the **named-prescription reminder placeholder** ("Donepezil 10 mg — with breakfast" →
  "Morning medication — with breakfast") — string-only; frozen form/scheduling untouched.
- **Sentry disclosed** as a processor (`app/privacy/page.tsx`) + cookies third-party
  (`app/cookies/page.tsx`); **subscription-cancel-before-delete** caveat added to the privacy deletion
  paragraph; **data-rights contact reconciled** to `admin@remynest.com` (`app/account-deletion/page.tsx`).
- **Android `allowBackup="false"`** (`android/app/src/main/AndroidManifest.xml`) so WebView session
  cookies/tokens aren't swept to Google Drive Auto Backup (Android deferred → zero iOS/web impact).

**Recommended (operator/product — not implemented here):**
- Provision + monitor real `support@`/`privacy@`/`dpo@`/`security@` mailboxes (or standardize on
  `admin@`); name the controller legal entity/address (+ DPO) in the privacy policy "Who we are".
- Decide the Health/Sensitive data declaration for the ASC label + Play Data Safety and align all
  surfaces.
- If OAuth login is ever added, add `accounts.google.com`/`appleid.apple.com` to
  `capacitor.config` `allowNavigation` (latent today — auth is email/password only).

## 8. Potential Rejection Risks (ranked)

1. **CRITICAL (Apple 1.2):** reviewer's two-account test — invite a second account, share a memory,
   find no way to report the content or block that user → near-certain rejection. **Mitigation:** ship
   the report/block mechanism (open).
2. **HIGH (Apple 2.1):** the `/terms` governing-law bracketed placeholder is visible incomplete
   content. **Mitigation:** counsel confirms jurisdiction (open).
3. **MEDIUM→LOW (Apple 5.1.3):** residual cognitive-decline scoring in a dementia-adjacent app —
   **RESOLVED by LA5** (surface removed).
4. **MEDIUM (Play):** not submittable (no signing/FCM) + Data Safety/health declaration unstarted —
   known deferral.
5. **MEDIUM (Apple 4.2/2.1):** the remote-URL shell dead-ends if `www.remynest.com` is unreachable
   during review. **Mitigation:** guarantee uptime + surface the real native integrations (APNs push,
   local notifications) in review notes.

## 9. Remaining Compliance Gaps

- **Report/block moderation mechanism (feature/backend)** — the CRITICAL Apple 1.2 gate.
- Account deletion does not cancel Stripe / delete OneSignal-device PII (LOCKED RC3 roadmap; LA5 added
  only the interim caveat).
- Governing-law jurisdiction (legal/counsel).
- Real contact mailboxes + controller legal identity/DPO (operator/legal).
- Health/Sensitive data declaration decision + ASC/Play Data Safety alignment (product/operator).
- Android launch blocked (no FCM/`google-services.json`, `versionCode 1`, no release signing).
- Operator/native: wire `PrivacyInfo.xcprivacy` into the Xcode App target; confirm daily Postgres
  backups + a `memory-media` Storage backup + a test restore.

## 10. Launch Recommendation

**iOS — DO NOT SUBMIT YET.** The app is otherwise strong and LA5 closed every *safe* compliance gap,
but the **CRITICAL Apple 1.2 report/block mechanism** (a feature build) and the **Terms jurisdiction**
(counsel) must land first. Sequence: (a) ship report-content + block-user + the 24h SLA; (b) counsel
confirms the governing-law jurisdiction; (c) provision the contact mailboxes; (d) decide the
Health-data declaration; then submit with review notes surfacing the native integrations.

**Google Play — DEFERRED / not submittable** (`versionCode 1`, no signing, no FCM). Treat the Data
Safety + Health-apps declaration and `allowBackup` hardening as pre-Android-launch work; the same
report/block feature + EULA clause are prerequisites.

---

## Multi-agent review of the fixes

An independent 6-lens review (Apple / Google Play / Mobile / Privacy / Healthcare / Security, 7 agents)
confirmed **behaviour preserved by all six lenses, 0 blocking regressions** — the decline-scoring
removal is complete (no dangling refs; the four honest Insights cards still render), the metadata
de-health-positioning is fully applied, the reminder change is placeholder-string-only (frozen
scheduling byte-unchanged), and `allowBackup=false` + the Sentry disclosure + the EULA clause + the
cancel-before-delete caveat are all truthful and non-over-promising. No native purchase UI and no new
medical claim were introduced.

The review found **one real must-fix** (flagged by 5 of 6 lenses) and three non-blocking items — **all
applied in this same pass**:
- **MUST-FIX (applied):** the data-rights/deletion contact reconciliation was *incomplete* — moving
  `/account-deletion` to `admin@` while `/support` (via `lib/contact.ts` `CONTACT.privacy`/`dpo`)
  still routed to the unprovisioned `privacy@`/`dpo@` *introduced* a divergence. Fixed at the single
  source: `lib/contact.ts` `privacy` + `dpo` → `admin@remynest.com`, so every live legal surface
  (`/privacy`, `/account-deletion`, `/terms`, `/cookies`, `/support`) now names ONE monitored
  data-rights/deletion contact. (Repoint to dedicated aliases once the operator provisions them.)
- **NB (applied):** neutralized a second residual pseudo-clinical surface — the "Memory Activity" card
  showed `cognitiveActivity` values "Declining"/"Reduced" derived from days-since-last-memory; renamed
  the field to `loggingActivity` and the values to "Quiet"/"Quieter"/"No entries yet"
  (`lib/analytics/inactivityDetection.ts` + `components/insights/BehavioralAnalyticsCard.tsx`).
- **NB (applied):** mirrored the subscription-cancel-before-delete caveat onto the canonical
  `/account-deletion` page (the deletion URL reviewers actually read).
- **NB (applied):** fixed the stale `docs/features/ai-memory-engine.md` engine-inputs list (dropped
  `cognitiveDeclineSignals` [deleted here] and the LA1-deleted cognition engines
  `attention/continuity/risk/sleepRecovery/wearable`).

Post-follow-up verdict: **SAFE TO COMMIT** — behaviour-preserving, no regressions, compliance-correct.

*Validation: `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm run build` green (re-verified
after the follow-ups). Audit: 35 agents, 0 errors, 28→21 verified findings. Fix review: 7 agents, 0
errors, 0 blocking regressions, 1 must-fix + 3 nits all applied.*
