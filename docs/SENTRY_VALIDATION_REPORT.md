# Sentry Validation Report

**Date:** 2026-06-05
**Audited against:** `@sentry/nextjs` **10.56.0** + Next.js **14.2.5**
**Type:** Audit only. No code changes. `.env.local`, Supabase, Stripe, OneSignal,
and cron auth untouched.

---

## Verdict

The integration is **valid and functional** on Next 14.2.5 with Sentry 10.56.0:
the SDK's peer range is `^13.2.0 || ^14.0 || ^15 || ^16` (14.2.5 ✓), all
`withSentryConfig` options used are valid, and `npm run build` succeeds with
instrumentation active. It follows the **core** recommendations, with a few
**minor / forward-compat gaps** below (none blocking).

---

## File-by-file verification

| File | Status | Notes |
|---|---|---|
| `instrumentation.ts` | ✅ Correct | `register()` imports server/edge config by `NEXT_RUNTIME` — the documented pattern. Requires `experimental.instrumentationHook` on Next 14 (present). |
| `sentry.client.config.ts` | ✅ Works (legacy path) | The build plugin supports both `instrumentation-client.ts` (preferred in v10) and `sentry.client.config.ts` (fallback). Injected into the client bundle by `withSentryConfig`, so it works on Next 14.2 even though Next 14 has no native `instrumentation-client` loading. |
| `sentry.server.config.ts` | ✅ Correct | `Sentry.init` with env DSN, `enabled` guard, tracesSampleRate. |
| `sentry.edge.config.ts` | ✅ Correct | Mirrors server; covers middleware (edge runtime). |
| `next.config.js` `withSentryConfig` | ✅ Valid | `org`, `project`, `silent`, `widenClientFileUpload`, `disableLogger` are all valid `SentryBuildOptions` keys in 10.56.0. |
| Source-map upload | ✅ Configured (gated) | Uploads only when `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG`/`SENTRY_PROJECT`) are present; otherwise build proceeds without upload. Correct, safe default. |
| Release tracking | ✅ Auto | SDK auto-detects release from `VERCEL_GIT_COMMIT_SHA` on Vercel. No explicit `release` set (acceptable). |

---

## Conformance to current Sentry recommendations

- ✅ `instrumentation.ts` + `experimental.instrumentationHook: true` (correct for Next 14).
- ✅ Separate client/server/edge init.
- ✅ `withSentryConfig` wrapping, source-map upload gated on auth token.
- ✅ Session Replay disabled (appropriate for PHI; a deliberate deviation from the
  wizard default, justified).
- ✅ Inert until DSN configured; `.env.local` untouched.

---

## Gaps identified

### G1 — No Sentry-wired `app/global-error.tsx` (Recommended)
The App Router setup recommends an `app/global-error.tsx` that calls
`Sentry.captureException(error)` so root-level render errors are reported.
Current error boundaries (`app/error.tsx`, `app/(app)/error.tsx`,
`app/(app)/insights/error.tsx`) exist but **do not report to Sentry**.
→ **Impact:** some client render errors may go uncaptured.
→ **Fix:** add `app/global-error.tsx` (and optionally call `Sentry.captureException`
in the existing error boundaries).

### G2 — Client uses legacy `sentry.client.config.ts` (Minor)
v10 prefers `instrumentation-client.ts`. The current file is fully supported
(fallback), so this is cosmetic/future-proofing, not a defect.
→ **Fix (optional):** rename to `instrumentation-client.ts`.

### G3 — `onRequestError` not exported (Forward-compat)
`Sentry.captureRequestError` is exported by the SDK; the recommended
`export const onRequestError = Sentry.captureRequestError` in `instrumentation.ts`
is **a Next 15 hook** and is a no-op on 14.2.5.
→ **Fix (when upgrading to Next 15):** add the export for server request-error capture.

### G4 — Activation env vars not set (Expected)
`NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` /
`SENTRY_AUTH_TOKEN` are not configured (by design — `.env.local` untouched). Until
set in Vercel, Sentry is a **no-op** and source maps are not uploaded.
→ **Fix:** set these in the Vercel project before relying on Sentry.

### G5 — Optional hardening (Low)
- `tunnelRoute` not set (improves resilience to ad-blockers).
- Build `telemetry` left at default (Sentry build telemetry on).
- No verification route/event captured yet (validate in a staging deploy with DSN).

---

## Recommended priority

1. **G1** — add `app/global-error.tsx` (only functional gap in error coverage).
2. **G4** — configure Vercel env to actually activate Sentry + source maps.
3. **G2 / G3 / G5** — optional / forward-compat; safe to defer.

---

## Conclusion

The Sentry integration is correctly structured and valid for Next 14.2.5 +
`@sentry/nextjs` 10.56.0, with source maps and release tracking configured to
activate via environment variables. The only functional gap is the missing
Sentry-wired `app/global-error.tsx` (G1); the remainder are minor or
forward-compatibility items. No changes were made in this audit.
