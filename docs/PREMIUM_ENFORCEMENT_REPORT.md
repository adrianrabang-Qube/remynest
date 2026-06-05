# Premium Enforcement Report (Launch Blocker #8)

**Date:** 2026-06-05
**Scope:** Audit + implement API-layer enforcement of existing premium
entitlements. **No** changes to plans, pricing, Stripe products, the webhook,
subscription tiers, or database schema. No production data changed.

---

## 1. Feature audit matrix

| Feature | Intended plan (per `plans.ts`) | Actual enforcement location | Missing enforcement |
|---|---|---|---|
| Care-profile count | FREE 1 · PREMIUM 3 · FAMILY 5 · ENT ∞ | `app/(app)/dashboard/actions.ts` `createProfile` → `canCreateCareProfile()` (server action) | **None** — already enforced server-side |
| Semantic search | Premium+ (FREE `false`) | **(was) UI only** → **now** `app/api/search/route.ts` + `app/api/memories/search/route.ts` (402) | **Fixed** this pass |
| Caregiver collaboration | FAMILY / ENTERPRISE only (FREE & PREMIUM `false`) | **None** — `inviteCaregiver` is ungated | **Found, NOT fixed** — flagged decision (see §4) |
| Voice memories | Premium+ (FREE `false`) | No endpoint exists (V2 roadmap) | **N/A** — feature not built |
| Storage quota | FREE 1GB · PREMIUM 10GB · FAMILY 50GB · ENT ∞ | **None** — no usage measurement exists | **Found, NOT fixed** — needs design (see §6) |
| Memory Chat (semantic recall) | Ambiguous: `aiEnabled` (free) vs `semanticSearch` (premium) | None | **Found, NOT fixed** — entitlement-definition decision (see §4) |

`checkPremium()` (`lib/premium.ts`) resolves the caller's plan from
`profiles.is_premium` / `profiles.subscription_plan`. Entitlement predicates live
in `lib/billing/usage-limits.ts` and `lib/billing/subscription-guards.ts`.

---

## 2. UI-only restrictions found (not previously enforced server-side)

- **Semantic search:** the search UI is gated visually, but `app/api/search` and
  `app/api/memories/search` performed embedding search with **no plan check** —
  bypassable by calling the API directly. **Now enforced.**
- **Care-profile creation:** `CreateProfileForm.tsx` shows `UpgradeModal`, but the
  real enforcement is the server action guard — already safe.
- **Dashboard `isPremium` props** (`DashboardStats`, `DashboardAccountStatus`,
  `WorkspaceMetrics`): display-only; not security boundaries (correctly so).

---

## 3. Files modified / created

**Modified (enforcement):**
- `app/api/search/route.ts` — added `checkPremium()` + `canUseSemanticSearch()` gate → `402 { code: "UPGRADE_REQUIRED" }`.
- `app/api/memories/search/route.ts` — same gate, with telemetry log.

**Created (tests):**
- `e2e/premium-guards.spec.ts` — pure entitlement-logic matrix.
- `e2e/premium-enforcement.spec.ts` — API-layer enforcement (free blocked; premium-allow path env-gated).

**Modified (test config):**
- `playwright.config.ts` — registered `premium-guards` and `premium-enforcement` projects.

No changes to `plans.ts`, `subscription-guards.ts`, `usage-limits.ts`,
`premium.ts`, the Stripe webhook, or any schema. Existing guards were **reused**,
not redefined.

---

## 4. Enforcement gaps found

1. **Semantic search not enforced at API** (both endpoints). — **FIXED.**
2. **Caregiver collaboration not enforced.** `inviteCaregiver` lets any tier
   create invites, though `caregiverCollaboration` is `false` for FREE **and**
   PREMIUM. **Not fixed** — enforcing it would disable a Critical System
   ("Caregiver workflows", AGENTS.md) for FREE *and paying Premium* users. Since
   the UI currently allows all tiers, intent is ambiguous → **billing/product
   decision required** before enforcing. One-line fix is ready (see §7).
3. **Storage quota not enforced** anywhere. **Not fixed** — no usage-measurement
   mechanism exists; see §6.
4. **Memory Chat** uses semantic retrieval but is also "AI" (`aiEnabled`, free).
   Whether conversational recall is premium-gated is an **entitlement-definition
   decision** → left ungated, flagged.

---

## 5. Enforcement gaps fixed

- **Semantic search** is now rejected for free tier at the API on both
  `/api/search` and `/api/memories/search`, returning HTTP **402** with
  `{ code: "UPGRADE_REQUIRED" }`, verified via real login as a free account.

---

## 6. Remaining risks

- **Storage quota unenforced.** Implementing requires a usage-measurement source
  (sum of media bytes per account/profile) and a decision on enforcement point
  (upload time). This is a design task, not a guard wire-up — out of scope here.
- **Caregiver collaboration & Memory Chat** remain unenforced pending the
  decisions in §4. Until decided, FREE/PREMIUM users retain caregiver-invite and
  chat access.
- **Free-tier search UX:** the gated endpoints are *purely semantic*; there is no
  keyword-only fallback, so enforcing semantic search means free users have no
  search via these endpoints. If product wants basic search for free, that is a
  separate feature.
- **No deploy performed.** All changes are working-tree only; the behavior change
  (free users blocked from semantic search) reaches users only on deploy — review
  the UX implication first.

---

## 7. Ready-to-apply fix for caregiver collaboration (pending decision)

In `app/(app)/dashboard/actions.ts` `inviteCaregiver`, after `requireDashboardUser()`:

```ts
const { plan } = await checkPremium();
if (!getUsageLimits(plan).caregiverCollaborationEnabled) {
  return { error: "Caregiver collaboration requires the Family or Enterprise plan." };
}
```

(Reuses existing `checkPremium` + `getUsageLimits`; no entitlement redefinition.)

---

## 8. Tests executed

| Test | Result |
|---|---|
| Logic: semantic search free=blocked / paid=allowed | ✅ |
| Logic: voice memories free=blocked / paid=allowed | ✅ |
| Logic: caregiver collaboration only FAMILY/ENT | ✅ |
| Logic: care-profile limits per plan (boundaries) | ✅ |
| API: free user blocked from `/api/search` (402) | ✅ |
| API: free user blocked from `/api/memories/search` (402) | ✅ |
| API: premium user allowed | ⏭️ skipped (needs premium account; no-prod-data rule) |

**Result: 8 passed, 1 skipped.** `npm run lint` ✅ · `npm run build` ✅.

---

## 9. Final conclusion

The primary, unambiguous gap — **semantic search enforced only in the UI** — is
now closed at the API layer and verified end-to-end with a real free-tier login.
The entitlement logic is unit-verified across all tiers. Two further gaps
(caregiver collaboration, memory chat) are **defined-but-unenforced** and were
deliberately **not** changed because enforcing them alters access to Critical
Systems for paying tiers and depends on product intent — they are documented with
ready-to-apply fixes. Storage-quota enforcement requires a usage-measurement
design and is tracked as follow-up. No pricing, tiers, Stripe behavior, schema,
or production data were modified.
