# Sentry Env Setup Guide

**Date:** 2026-06-05
**Purpose:** Exactly how to obtain and set the Sentry variables so the existing
integration activates. **No Vercel variables were created or modified by this guide.**

Current Vercel state (from `vercel env ls`): `CRON_SECRET` ✅ set; **all 5 Sentry
vars MISSING** (see VERCEL_ENV_READINESS_REPORT.md). Until set, Sentry is a no-op
and source maps don't upload.

---

## 1. Values required & where to obtain them

| Variable | Where to get it | Secret? | Used for |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → **Settings → Projects → [project] → Client Keys (DSN)** → copy the DSN | No (public) | Client + (fallback) server/edge init |
| `SENTRY_DSN` | **Same DSN value** as above (set explicitly for server/edge) | No | Server/edge init (our config falls back to the public DSN if unset, so this is optional-but-recommended) |
| `SENTRY_ORG` | Sentry → **Settings → General** → "Organization Slug" (also in the URL: `sentry.io/organizations/<org>/`) | No | Source-map upload target / release assoc. |
| `SENTRY_PROJECT` | Sentry → **Settings → Projects** → the project's **slug** | No | Source-map upload target |
| `SENTRY_AUTH_TOKEN` | Sentry → **Settings → Auth Tokens** (org) → "Create New Token" with scopes **`project:releases`** + **`org:read`** (and `project:write` for source maps) | **YES (secret)** | Build-time source-map upload |

Notes:
- If no Sentry project exists yet, create one (platform: **Next.js**) first; the
  DSN appears under Client Keys.
- `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` will normally be the **same DSN string**.
- The auth token is only needed at **build time** (Vercel build) for source-map
  upload; runtime does not need it.

## 2. Exact Vercel commands (run by an operator — not executed here)

```bash
# from the project root (already linked to prj_T31P1PN4qWDuwpfV0TY9jUbIWHK3)

# Production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_DSN production
vercel env add SENTRY_ORG production
vercel env add SENTRY_PROJECT production
vercel env add SENTRY_AUTH_TOKEN production     # paste the secret token

# Preview (recommended, so PR/preview deploys also report + upload maps)
vercel env add NEXT_PUBLIC_SENTRY_DSN preview
vercel env add SENTRY_DSN preview
vercel env add SENTRY_ORG preview
vercel env add SENTRY_PROJECT preview
vercel env add SENTRY_AUTH_TOKEN preview

# Verify
vercel env ls
```

(Each `vercel env add` prompts for the value via stdin.)

## 3. Verification after setting

1. Redeploy (or let the next deploy run) — Vercel build should upload source maps
   (no "auth token missing" skip).
2. Trigger a deliberate error on a **Preview** deploy; confirm it appears in Sentry
   with a **symbolicated** stack trace.
3. Confirm the **release** is tagged (auto from `VERCEL_GIT_COMMIT_SHA`).
4. Confirm **Session Replay stays disabled** (already configured for PHI).

## 4. Scope note
This guide does not create or change any Vercel variable. Setting them is an
operator action requiring the actual Sentry values.
