# Sentry Error Boundary Report (G1)

**Date:** 2026-06-05
**Scope:** Implement gap G1 from `SENTRY_VALIDATION_REPORT.md` — add a
Sentry-wired `app/global-error.tsx` and report render exceptions from existing
error boundaries via `Sentry.captureException`.
**Constraints honored:** No changes to `.env.local`, Supabase, Stripe, OneSignal,
cron auth, billing logic, or schema.

---

## 1. What changed

### New
- **`app/global-error.tsx`** — root-level error boundary that replaces the root
  layout when it throws. Renders its own `<html>/<body>` with **inline styles**
  (the app's CSS is not available at this level) and calls
  `Sentry.captureException(error)` in a `useEffect`. This closes the main gap:
  root-layout / top-level render errors are now reported.

### Updated (now report to Sentry)
- **`app/error.tsx`** — added `Sentry.captureException(error)` alongside the
  existing `console.error`; typed `error` with optional `digest`; renamed the
  component to `RootSegmentError` for clarity.
- **`app/(app)/error.tsx`** — added the `error` prop + a `useEffect` calling
  `Sentry.captureException(error)` (previously it only exposed `reset`, so render
  errors in the app group were never reported).
- **`app/(app)/insights/error.tsx`** — moved logging into a `useEffect` and added
  `Sentry.captureException(error)` (kept the existing diagnostic UI).

All boundaries remain `"use client"` and keep their existing UI/`reset` behavior.

---

## 2. Coverage after this change

| Boundary | Scope | Reports to Sentry |
|---|---|---|
| `app/global-error.tsx` | Root layout / top-level | ✅ (new) |
| `app/error.tsx` | Root segment children | ✅ |
| `app/(app)/error.tsx` | Authenticated app group | ✅ (new) |
| `app/(app)/insights/error.tsx` | Insights route | ✅ |

Server/edge exceptions continue to be captured by the SDK via
`instrumentation.ts` + the server/edge configs.

---

## 3. Verification

- `npm run lint` ✅ clean.
- `npm run build` ✅ — `global-error` and all `error` boundaries compile; route
  table builds successfully.
- Smoke E2E (`auth-gate`) ✅ **7 passed** — app renders/navigates normally with
  the new boundaries in place.

> Note: actual error *delivery* to Sentry requires a DSN in the environment (not
> set here by design). `Sentry.captureException` is a no-op until the DSN is
> configured in Vercel; end-to-end capture should be verified in a staging deploy.

---

## 4. Files created / modified

**Created:** `app/global-error.tsx`, `docs/SENTRY_ERROR_BOUNDARY_REPORT.md`.
**Modified:** `app/error.tsx`, `app/(app)/error.tsx`, `app/(app)/insights/error.tsx`.

No env, schema, billing, or third-party-config changes.

---

## 5. Status of validation-report gaps

- **G1 — global-error + boundary reporting:** ✅ done (this change).
- G2 (legacy client config), G3 (`onRequestError` for Next 15), G4 (set Vercel
  env), G5 (optional hardening): unchanged — deferred as previously noted.
