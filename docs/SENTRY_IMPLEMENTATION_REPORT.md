# Sentry Implementation Report

**Date:** 2026-06-05
**Scope:** Integrate Sentry error tracking (client/server/edge) with source maps,
release tracking, and `instrumentation.ts`. No schema or production-data changes.
`.env.local`, Supabase, Stripe, OneSignal, and cron auth were not touched.

---

## 1. What was integrated

- **`@sentry/nextjs` v10.56.0** (devDependency tree added).
- **Client init** — [sentry.client.config.ts](../sentry.client.config.ts)
  (injected into the client bundle by `withSentryConfig`).
- **Server init** — [sentry.server.config.ts](../sentry.server.config.ts).
- **Edge init** — [sentry.edge.config.ts](../sentry.edge.config.ts) (covers middleware).
- **Instrumentation hook** — [instrumentation.ts](../instrumentation.ts): `register()`
  imports the server/edge config based on `NEXT_RUNTIME`.
- **Build config** — [next.config.js](../next.config.js): `experimental.instrumentationHook: true`
  (required on Next 14 to load `instrumentation.ts`) and `withSentryConfig(...)`.

## 2. Source maps & release tracking

- `withSentryConfig` is configured with `org`/`project` from env, `silent`,
  `widenClientFileUpload`, `disableLogger`.
- **Source-map upload happens only when `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG` /
  `SENTRY_PROJECT`) are present** at build time (e.g. in Vercel/CI). Without them,
  the build proceeds without upload — verified locally.
- **Release** is auto-detected by the SDK from `VERCEL_GIT_COMMIT_SHA` on Vercel.

## 3. Privacy / healthcare consideration

- **Session Replay is explicitly disabled** (`replaysSessionSampleRate: 0`,
  `replaysOnErrorSampleRate: 0`) because RemyNest handles sensitive health-related
  content that must not be captured.
- `tracesSampleRate` set to a conservative `0.1`.

## 4. Inert-until-configured

All three `Sentry.init` calls set `enabled: Boolean(dsn)` and read the DSN from the
environment. With no DSN set, Sentry is a **no-op** — nothing is sent and the app
behaves exactly as before. **`.env.local` was not modified.**

### Required environment variables (set in Vercel, not committed)
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Client (and fallback server/edge) DSN |
| `SENTRY_DSN` | Server/edge DSN (optional; falls back to the public DSN) |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Source-map upload target |
| `SENTRY_AUTH_TOKEN` | Build-time source-map upload (secret) |

## 5. Verification

- `npm run lint` ✅ clean (incl. new root config files).
- `npm run build` ✅ compiled successfully; `instrumentation.ts` active.
- Smoke E2E (`auth-gate` + `cron-auth`) ✅ **11 passed** — app functions normally
  with instrumentation enabled (Sentry no-op without DSN).

## 6. Files created / modified

**Created:** `sentry.client.config.ts`, `sentry.server.config.ts`,
`sentry.edge.config.ts`, `instrumentation.ts`, `docs/SENTRY_IMPLEMENTATION_REPORT.md`.
**Modified:** `next.config.js`, `package.json`, `package-lock.json`.

## 7. Notes / remaining risks

- **Bundle size increased** (shared First Load JS ~88 kB → ~153 kB; middleware
  ~84 kB → ~144 kB) — inherent to Sentry. Acceptable for error visibility; can be
  tuned (e.g. trimming integrations) if needed.
- **`npm audit`** reports 2 vulnerabilities (1 moderate, 1 critical) from the
  dependency tree; review before launch (do not auto-`--force`).
- **`onRequestError`** server hook is not wired (it requires Next 15; this project
  is on 14.2.5). Automatic instrumentation still captures unhandled errors.
- **Activation is a deploy step:** set the env vars above in Vercel. Until then
  Sentry collects nothing.
- A `/sentry-example` test route was intentionally not added; verify capture in a
  staging deploy once the DSN is configured.
