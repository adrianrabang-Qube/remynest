# RemyNest V1 — Manual QA Test Plan

Owner: Senior QA Lead
Last Updated: 2026-06-05
Method: Manual QA only (no automated test suite is currently configured)
Status: Active — Launch Readiness QA Sprint

---

## Security Validation

Phase 1 authorization and data-isolation validation is **complete** — see
[SECURITY_VALIDATION_REPORT.md](../SECURITY_VALIDATION_REPORT.md).

Automated Playwright E2E (real login flows) covering Authentication Gate
Protection, Profile Switching Data Isolation, and Caregiver IDOR Protection.
Result: **4 / 4 P0 security tests passing.** This covers the security-critical
items in §1 (Authentication), §10 (Caregiver workflows), and §11 (Profile
switching) below.

---

## How to use this plan

- Execute every section as each applicable **role** (see below).
- Mark each item: `[x]` pass, `[ ]` not run, and log failures as defects (see end).
- A section is **not complete** until all P0 items pass for all roles.

### Severity legend

- **[P0]** Launch blocker — data loss, security, billing integrity, data isolation, or core flow broken.
- **[P1]** Must-fix before launch — significant functional or UX defect with no safe workaround.
- **[P2]** Should-fix — minor defect, polish, or edge case.

### Test roles

- **Owner-Free** — account owner on the Free plan.
- **Owner-Premium** — account owner on a paid plan.
- **Caregiver** — user invited to one or more shared profiles.

### Environments / devices

- Desktop Chrome (primary)
- iOS Safari + installed PWA
- Android Chrome
- Run against production-equivalent config (Supabase, OpenAI, Stripe, OneSignal env vars present).

---

## 0. Cross-cutting / environment

- [ ] [P1] App builds and deploys clean (`npm run lint`, `npm run build`) as sprint baseline
- [ ] [P1] App loads on desktop Chrome, iOS Safari, Android Chrome
- [ ] [P1] PWA installs; service worker + OneSignal workers register without errors
- [ ] [P1] All required env vars present in the test environment
- [ ] [P2] No console errors/warnings on each primary screen
- [ ] [P2] Loading, empty, and error states render on every list and detail screen
- [ ] [P1] Accessibility smoke: keyboard navigation, focus order, alt text, color contrast

---

## 1. Authentication

- [ ] [P0] Sign up with a new email succeeds; confirmation/callback flow completes
- [ ] [P0] Login with valid credentials succeeds; invalid credentials rejected with a clear error
- [ ] [P0] Logout clears the session; browser back button does not restore an authenticated view
- [ ] [P0] Unauthenticated access to protected routes (dashboard, memories, timeline, reminders, insights, memory-chat) redirects to login
- [ ] [P0] Protected **API** routes reject unauthenticated requests (401), not only the UI
- [ ] [P1] Authenticated user visiting `/login` or `/signup` is redirected appropriately
- [ ] [P1] Session persists across refresh; expired/invalid token forces re-authentication
- [ ] [P1] Duplicate-email signup is handled gracefully
- [ ] [P1] Password rules enforced; weak/empty password rejected
- [ ] [P2] Onboarding runs for new users and is idempotent/skippable on return

---

## 2. Billing (Stripe) — observe & report only, do not modify

- [ ] [P0] Free user sees correct plan and limits via billing status
- [ ] [P0] Checkout session creates and redirects to Stripe
- [ ] [P0] Successful payment upgrades the user to Premium (plan/flags updated)
- [ ] [P0] Webhook verifies signature; rejects unsigned/forged payloads
- [ ] [P0] Premium-gated features are blocked for Free users at the **API layer**, not just hidden in the UI
- [ ] [P1] Webhook is idempotent (duplicate delivery does not double-apply)
- [ ] [P1] Cancel/downgrade revokes premium and re-applies Free limits
- [ ] [P1] Failed/declined payment leaves the user on Free with clear messaging
- [ ] [P1] Usage limits enforced at the boundary (last allowed vs first blocked action)
- [ ] [P2] Family/shared plan entitlements apply to the correct members
- [ ] [P2] Billing telemetry events fire correctly

---

## 3. Memories

- [ ] [P0] Create a text memory; it persists and appears in list and detail
- [ ] [P0] Create a memory with a photo attachment; media uploads and renders
- [ ] [P0] A user can only read/edit/delete memories within an **accessible** profile (no cross-profile access by ID)
- [ ] [P1] Oversized / unsupported file types rejected with a clear error
- [ ] [P1] Failed upload does not create an orphaned/partial memory; cleanup verified
- [ ] [P1] Edit updates correctly; Delete removes the memory **and** its media/storage
- [ ] [P2] Metadata (date, tags, relationships) saves and displays
- [ ] [P2] Image orientation/EXIF handled; thumbnails generate
- [ ] [P2] Long text, special characters, and emoji handled without breaking layout/storage

---

## 4. Timeline

- [ ] [P0] Timeline loads memories in correct chronological order
- [ ] [P0] Timeline reflects the **active profile only**; switching profile changes the set
- [ ] [P1] Pagination / infinite scroll loads more without duplicates or gaps
- [ ] [P1] A newly created memory appears in the correct position by date
- [ ] [P2] Empty state shows for a profile with no memories
- [ ] [P2] Date grouping/headers correct across month/year boundaries and timezones
- [ ] [P2] Edited/deleted memory updates the timeline without stale cache

---

## 5. Search

- [ ] [P0] Keyword search returns relevant memories
- [ ] [P0] Results are scoped to the **accessible/active profile** — never another tenant's memories
- [ ] [P1] Semantic/embedding search returns sensible results
- [ ] [P1] No-results query shows an empty state, not an error
- [ ] [P2] Special characters, very short, and very long queries handled
- [ ] [P2] Result click navigates to the correct memory detail
- [ ] [P2] Search latency acceptable on realistic data volume

---

## 6. Insights (AI) — healthcare-sensitive

- [ ] [P0] Insights generate for a profile with sufficient memories
- [ ] [P0] **Non-diagnostic language** — insights never diagnose or imply clinical/medical conclusions
- [ ] [P0] Insights use **only the active/accessible profile's** data (no cross-profile context leakage)
- [ ] [P1] Healthcare disclaimer present where insights are shown
- [ ] [P1] Graceful handling for profiles with too few memories (clear message, no crash)
- [ ] [P1] OpenAI failure/timeout handled gracefully (no broken UI)
- [ ] [P2] Insights refresh after new memories; no stale data

---

## 7. Memory Chat (AI) — healthcare-sensitive

- [ ] [P0] Chat answers using the **correct profile's** context only
- [ ] [P0] Chat does not fabricate memories; absent info is acknowledged, not invented
- [ ] [P0] **Non-diagnostic tone** maintained in all responses
- [ ] [P1] OpenAI failure/timeout handled gracefully with a retry path
- [ ] [P1] Unauthenticated/unauthorized chat requests rejected at the API
- [ ] [P2] Long conversation / long input handled without breaking
- [ ] [P2] Healthcare disclaimer present in the chat surface

---

## 8. Notifications (OneSignal)

- [ ] [P1] Device registers for push; subscription is saved
- [ ] [P1] Permission denial handled gracefully (no broken state)
- [ ] [P1] Public/cron notification endpoints reject unauthorized callers
- [ ] [P2] Notification deep-links to the correct memory/reminder
- [ ] [P2] No duplicate notifications for a single event

---

## 9. Reminders

- [ ] [P0] Create a reminder; it persists with the correct date/time
- [ ] [P0] A due reminder triggers a notification via the cron job
- [ ] [P1] Reminder fires at the correct time across **timezones**; no double-send
- [ ] [P1] Edit/delete updates or cancels the scheduled notification
- [ ] [P2] Natural-language reminder parsing produces the correct date/time
- [ ] [P2] Past/invalid reminder times handled with clear validation

---

## 10. Caregiver workflows

- [ ] [P0] Owner can invite a caregiver; acceptance grants access
- [ ] [P0] Caregiver sees **only** profiles explicitly shared with them
- [ ] [P0] Caregiver **cannot** access non-shared profiles via direct URL or API ID guessing (IDOR)
- [ ] [P1] Access levels respected (e.g., read vs contribute) for memories/reminders
- [ ] [P1] Revoking access immediately removes visibility and the active-profile option
- [ ] [P1] Relationship building produces correct links
- [ ] [P2] Caregiver actions attributed correctly (author/audit)
- [ ] [P2] Pending/expired/declined invite states handled

---

## 11. Profile switching (data isolation — highest scrutiny)

- [ ] [P0] Switching the active profile updates server-side state
- [ ] [P0] After switching, **all** surfaces (timeline, search, insights, chat, memories, reminders) reflect ONLY the new profile
- [ ] [P0] No data bleed-through from a previously active profile after rapid switching
- [ ] [P0] A user can switch only to owned or shared profiles; invalid profile ID rejected (403/404, not a silent switch)
- [ ] [P1] Active profile persists across navigation, refresh, and re-login
- [ ] [P1] Creating a memory/reminder writes to the **currently active** profile, not a default
- [ ] [P2] Profile switcher UI shows the correct list and current selection

---

## 12. GDPR readiness (gap verification — confirmed not yet in codebase)

> No GDPR export/deletion or legal pages were found in the codebase. These items verify launch-blocking gaps; most are expected to FAIL until implemented.

- [ ] [P0] Data **export** exists and returns the user's complete data
- [ ] [P0] Data **deletion** exists and fully removes account + memories + media (including storage)
- [ ] [P1] Privacy Policy reachable in-app
- [ ] [P1] Terms & Conditions reachable in-app
- [ ] [P1] Cookie Policy reachable in-app
- [ ] [P1] Consent management present where required
- [ ] [P1] Healthcare / non-diagnostic disclaimers present across AI surfaces
- [ ] [P2] Data retention and sensitive-data handling documented

---

## Defect logging convention

For each failure, record:

- **ID / title**
- **Severity** (P0 / P1 / P2)
- **Role + environment/device**
- **Steps to reproduce**
- **Expected vs actual**
- **Evidence** (screenshot / response / log)
- **Status** (open / in progress / fixed / retest)

P0 defects block launch. P1 defects block launch unless explicitly accepted by the launch owner.

---

## Sign-off

| Area | Owner-Free | Owner-Premium | Caregiver | Notes |
|---|---|---|---|---|
| Authentication | | | | |
| Billing | | | | |
| Memories | | | | |
| Timeline | | | | |
| Search | | | | |
| Insights | | | | |
| Memory Chat | | | | |
| Notifications | | | | |
| Reminders | | | | |
| Caregiver workflows | | | | |
| Profile switching | | | | |
| GDPR readiness | | | | |

QA Lead sign-off: ____________________  Date: __________
Launch owner sign-off: ____________________  Date: __________
