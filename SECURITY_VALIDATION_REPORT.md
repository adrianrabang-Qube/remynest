# RemyNest — Security Validation Report

**Date:** 2026-06-05
**Author:** QA Automation (Playwright Phase 1)
**Scope:** P0 authorization / data-isolation security tests
**Branch:** `qa/playwright-phase1`
**Method:** Automated Playwright E2E via **real login flows**, run against the production Supabase backend through a local dev server. Dedicated E2E test accounts only; synthetic memory content only.

---

## 1. Tests executed

| # | Test | Spec | Seed data required |
|---|---|---|---|
| 1 | Authentication Gate Protection | `e2e/auth-gate.spec.ts` | None |
| 2 | Profile Switching Data Isolation | `e2e/profile-isolation.spec.ts` | Owner login + foreign profile |
| 3a | Caregiver IDOR — forced profile switch | `e2e/caregiver-idor.spec.ts` | Caregiver login + foreign profile |
| 3b | Caregiver IDOR — direct memory URL | `e2e/caregiver-idor.spec.ts` | Caregiver login + foreign memory |

Supporting: `e2e/auth.setup.ts` authenticated the owner and caregiver via the real `/login` form and persisted `storageState`.

---

## 2. Test accounts used

Dedicated, clearly-named E2E accounts (not real users). **Passwords are not recorded here** — they exist only in the git-ignored `.env.test`.

| Role | Email | Account ID |
|---|---|---|
| Owner | `remynest-e2e-owner@example.com` | `d8b7eef4-3457-443f-b344-1122335c0fad` |
| Caregiver | `remynest-e2e-caregiver@example.com` | `bd6aed96-d7f0-4d50-ae66-a709352830bc` |
| Foreign (victim) | `remynest-e2e-foreign@example.com` | `131a2779-bfb9-44f1-91d9-89a00fe37a81` |

---

## 3. Profile IDs used

| Profile | ID | Owner | Shared with |
|---|---|---|---|
| Profile A (owner) | `4a80c0d5-feb6-4996-9cfe-65e6c614af00` | Owner | Caregiver (read) |
| Profile B (foreign) | `9f5fd3eb-063f-4ead-aefb-b2f851ba7e83` | Foreign | **No one** |

Relationship under test: **Caregiver → Profile A only.** Neither the owner nor the caregiver has any relationship to Profile B, which makes B the "foreign" tenant.

---

## 4. Memory IDs used

| Memory | ID | Profile | Content |
|---|---|---|---|
| Foreign memory | `6d0e92ea-1e54-42f0-bd2c-bdf612c991f2` | Profile B | "RemyNest E2E synthetic memory — do not use real data." |

---

## 5. Pass/fail results

| Test | Result |
|---|---|
| 1 — Authentication Gate Protection | ✅ PASS |
| 2 — Profile Switching Data Isolation | ✅ PASS |
| 3a — Caregiver IDOR (forced profile switch) | ✅ PASS |
| 3b — Caregiver IDOR (direct memory URL) | ✅ PASS |

**Overall: 4 / 4 P0 security tests passing.**

---

## 6. Evidence per test

### Test 1 — Authentication Gate Protection ✅
- **Action:** Unauthenticated requests to `/dashboard`, `/memories`, `/timeline`, `/reminders`, `/insights`, `/memory-chat`; plus `GET /api/active-profile`.
- **Observed:** All six protected pages redirected to `/login`. The protected API returned a redirect to `/login` (no `activeProfileId` payload in the body).
- **Result:** `7 passed`.
- **Enforcement point:** `middleware.ts` (`PROTECTED_ROUTES`) redirects unauthenticated non-public routes to `/login`.

### Test 2 — Profile Switching Data Isolation ✅
- **Action:** Authenticated as **Owner**, forced `POST /api/active-profile { profileId: <Profile B> }`, then read back `GET /api/active-profile` and `GET /api/timeline`.
- **Observed:** `POST` accepted (context set is permissive by design), but `GET /api/active-profile` returned `profile: null`, and the timeline did not surface Profile B. The owner could **not** read foreign profile data despite forcing the switch.
- **Result:** PASS.
- **Enforcement point:** Read path re-queries `memory_profiles` with the user's RLS-bound client (`app/api/active-profile/route.ts`); Row Level Security blocks the non-accessible profile.

### Test 3a — Caregiver IDOR (forced profile switch) ✅
- **Action:** Authenticated as **Caregiver** (who can access Profile A only), forced `POST /api/active-profile { profileId: <Profile B> }`, then `GET /api/active-profile`.
- **Observed:** `profile: null` — the caregiver could not read Profile B by forcing the active context.
- **Result:** PASS.

### Test 3b — Caregiver IDOR (direct memory URL) ✅
- **Action:** Authenticated as **Caregiver**, navigated directly to `/memories/6d0e92ea-1e54-42f0-bd2c-bdf612c991f2` (a memory in the non-shared Profile B).
- **Observed:** The app returned the Next.js `notFound()` state — HTML included `<title>404: This page could not be found.</title>`, `meta name="next-error" content="not-found"`, and `NEXT_NOT_FOUND`. The memory-page chrome that renders only on a successful load (`"Original Memory"`, `"RemyNest Cognitive Engine"`) was **absent**, i.e. **no foreign memory data was exposed.**
- **Result:** PASS.
- **Enforcement point:** `app/(app)/memories/[id]/page.tsx` scopes the query by `.eq("user_id", user.id)` and calls `notFound()` when the memory is not the user's.

#### Note on the assertion correction
The direct-URL test initially reported a **false positive**: it asserted the memory UUID was absent from the HTML, but Next.js legitimately embeds the requested route parameter (the URL) in framework-generated HTML (canonical URL) even on a 404. The assertion was corrected to evaluate the true security signal — **access denied (4xx or Next `notFound()` state) passes; the memory page actually rendering fails** — with no reliance on the UUID. Application code was not changed. After the correction the test passes, confirming the app was behaving securely all along.

---

## 7. Final conclusion

All four P0 authorization and data-isolation tests **pass**. The validation provides evidence that:

- Unauthenticated users cannot reach protected pages or protected API data.
- A user cannot read a profile they do not own or are not shared into, even by forcing the active-profile context (Row Level Security holds).
- A caregiver cannot access a non-shared profile or a non-shared memory, via either a forced profile switch or a direct memory URL (no IDOR exposure).

No cross-tenant data leakage was observed. The one initial failure was a **test-side false positive**, not an application vulnerability; it was corrected without any change to application code.

---

## 8. Notes & housekeeping

- **Environment:** Tests executed against the production Supabase project via the local dev server using real login flows. No application code, schema, or billing was modified during validation.
- **Test data:** The dedicated E2E accounts, profiles, relationship, and synthetic memory remain in production. A cleanup routine is available to remove exactly these rows and users when validation data is no longer needed.
- **Secrets:** E2E credentials are stored only in the git-ignored `.env.test`; no real credentials appear in this report or in `.env.test.example` (placeholders only).
- **Coverage scope:** This report covers Phase 1 security/isolation only. Functional QA areas (billing, memories CRUD, timeline, search, insights, notifications, reminders, GDPR) are tracked separately in `docs/QA_TEST_PLAN.md`.
