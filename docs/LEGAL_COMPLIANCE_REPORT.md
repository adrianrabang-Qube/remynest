# Legal & Compliance Report (Launch Blocker)

**Date:** 2026-06-05
**Scope:** Legal pages + compliance language for launch. No schema changes. No
production data changes.

---

## 1. Audit of existing state

| Item | Before | Status |
|---|---|---|
| Privacy Policy | absent | **Added** |
| Terms of Service | absent | **Added** |
| Cookie Policy | absent | **Added** |
| AI Disclaimer | implemented (`lib/constants/disclaimers.ts`, `components/ai/AIDisclaimer.tsx`, wired across AI surfaces) | Pre-existing ✅ |
| GDPR language | export live (`/api/gdpr/export`); deletion dry-run scaffolded; `GDPRSection` copy | Pre-existing ✅ (export referenced from Privacy Policy) |

**Gap identified:** the three legal pages did not exist. Everything else
(AI disclaimers, GDPR export) was already in place from prior workstreams.

---

## 2. Implemented

### Pages (static routes)
- `/privacy` — [app/privacy/page.tsx](../app/privacy/page.tsx)
- `/terms` — [app/terms/page.tsx](../app/terms/page.tsx)
- `/cookies` — [app/cookies/page.tsx](../app/cookies/page.tsx)

Content covers, for RemyNest specifically: data controller + contact
(admin@remynest.com); data collected (incl. health-related memory content);
processors (Supabase, OpenAI, Stripe, OneSignal, Vercel); legal bases; GDPR
rights incl. **portability via the in-app export** and deletion-by-request;
retention; international transfers; non-diagnostic AI notice; subscription/billing
terms; cookie usage (essential-only).

### Shared components
- [components/legal/LegalPage.tsx](../components/legal/LegalPage.tsx) — layout + counsel-review notice.
- [components/legal/LegalLinks.tsx](../components/legal/LegalLinks.tsx) — cross-links.

### Reachability
- `middleware.ts` — `/privacy`, `/terms`, `/cookies` added to `PUBLIC_ROUTES`
  (accessible unauthenticated).
- Links added to **login** and **signup** pages; signup shows an
  agreement notice. Each legal page cross-links to the others and home.

---

## 3. Validation

- `npm run lint` ✅ clean.
- `npm run build` ✅ — `/privacy`, `/terms`, `/cookies` built as static routes.

---

## 4. Files created / modified

**Created:** `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/cookies/page.tsx`,
`components/legal/LegalPage.tsx`, `components/legal/LegalLinks.tsx`,
`docs/LEGAL_COMPLIANCE_REPORT.md`.
**Modified:** `middleware.ts`, `app/(auth)/login/page.tsx`,
`app/(auth)/signup/page.tsx`.

No schema, billing, or production-data changes.

---

## 5. Remaining risks / required follow-up

- **Counsel review (blocking for public launch):** all three documents are
  launch **templates** carrying a visible review notice. They must be reviewed and
  approved by qualified legal counsel before public launch — especially the
  health-data, AI, and liability sections.
- **Governing law jurisdiction** in Terms is a placeholder (`[Jurisdiction]`).
- **GDPR deletion** is by-request until the self-service deletion workstream
  (currently a dry-run scaffold) is approved and implemented.
- **Cookie consent banner** is intentionally omitted because only strictly
  necessary cookies are used; revisit if analytics/advertising cookies are added.
- Consider linking the policies from an authenticated footer as well (currently
  reachable from home, login, signup, and cross-links).
