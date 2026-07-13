# Runbook 4 — Secrets & Credential Rotation

Expired/leaked secrets, routine rotation, and restoring a lost environment. The **Vercel
environment store is the source of truth** for production secrets; keep an **encrypted
offline copy** for disaster recovery. Never commit real secrets (only
[`../../.env.example`](../../.env.example) placeholders are in git).

> **Verify integrity anytime:** `node scripts/check-production-env.mjs` reports which
> **required** vars are present/missing (it **never prints values**). Run it before every
> deploy and after any rotation.

---

## Secrets inventory (what exists, where it's used, blast radius)

| Secret | Used by | If leaked | If missing (degrade) |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server admin paths (GDPR, ledger, AI usage, caregiver reconcile, moderation) — **bypasses RLS** | **CRITICAL** — full data access | GDPR/admin/ledger/moderation paths fail |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Supabase (RLS-scoped) | Low (RLS-limited, public by design) | App can't talk to Supabase |
| `STRIPE_SECRET_KEY` | Server Stripe calls | **CRITICAL** — payment control | Checkout/portal fail |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | High — forged webhooks | Webhooks rejected → entitlements stall |
| `OPENAI_API_KEY` | All AI | High — cost abuse | AI degrades to "unavailable" |
| `ONESIGNAL_API_KEY` | Cron push | Medium — spoofed push | Server push stops (iOS local unaffected) |
| `CRON_SECRET` | Cron auth (`authorizeCronRequest`) | Medium — trigger cron | Cron **fails closed** (401) |
| Sentry `*_DSN` / `SENTRY_AUTH_TOKEN` | Telemetry / source maps | Low | Observability off (no-op) |
| `TOMBSTONE_USER_ID` | GDPR retain-mode deletion | Low | Retain-path deletion fails |

---

## A. A secret leaked (in logs, a screenshot, a repo, a client bundle)

**This is a SEV1 and a possible personal-data breach** (esp. the service-role or Stripe
keys). Run in parallel: this runbook + the [breach policy](../compliance/16-incident-response-policy.md).

1. **Rotate immediately** (§C) — assume the old value is compromised.
2. **Revoke** the old credential at the provider (don't just replace it).
3. **Assess exposure:** what could the key access, and for how long was it live? (Service-
   role = all data → likely breach; Sentry DSN = low.)
4. **Purge** the leak source (rotate, delete the log/screenshot, scrub git history if committed).
5. Record in the breach register; assess Art 33/34 notification.

---

## B. A secret expired (rotated by a provider, or a token TTL lapsed)

**Detect:** a subsystem stops post-expiry (see the per-var degrade table above); 401/403
from a provider; `check-production-env.mjs` still shows it "present" (presence ≠ validity —
a stale value is present but rejected).

**Recovery:** mint a fresh credential at the provider → update Vercel env → redeploy →
verify the subsystem. For OpenAI/Stripe/OneSignal, generate a new key in their dashboard.

---

## C. Rotation procedure (per credential)

1. **[OPERATOR]** Generate the new value in the provider console (Supabase / Stripe / OpenAI
   / OneSignal / Sentry).
2. Update it in **Vercel → Settings → Environment Variables** (Production).
3. Update the **encrypted offline copy** (§E).
4. **Redeploy** (env changes require a new deployment to take effect).
5. **Revoke** the old value at the provider once the new deploy is verified.
6. **Verify:** `check-production-env.mjs` + a targeted smoke test of the subsystem.

**Rotation-order caveats:**
- `STRIPE_WEBHOOK_SECRET`: rotating the endpoint secret means Stripe must be reconfigured to
  the new secret — do it in one window; failed webhooks **retry** so a brief mismatch drains
  itself once corrected.
- `CRON_SECRET`: rotate the Vercel env value; the cron sends the new bearer automatically on
  the next tick. A mismatch = 401s (cron fails closed, no bad delivery) until corrected.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase key rotation is a project-level action — coordinate
  downtime; every server admin path uses it.

---

## D. Credential hygiene (standing)

- **[OPERATOR]** 2FA on every console: Vercel, Supabase, Stripe, OpenAI, OneSignal, the DNS
  registrar, GitHub.
- Least privilege: never expose `SUPABASE_SERVICE_ROLE_KEY` / `STRIPE_SECRET_KEY` to the
  client (they are server-only; `NEXT_PUBLIC_*` are the only client-visible ones by design).
- Rotate on staff change / suspected exposure; schedule a periodic review.

---

## E. Environment restoration ("environment loss")

If the Vercel env is wiped or you must rebuild the project:

1. Recreate all **required** vars from the **encrypted offline copy**, structured per
   [`../../.env.example`](../../.env.example) (which documents every var + its degrade mode).
2. Run **`check-production-env.mjs`** until it reports all required present.
3. Redeploy from `main` (git holds all code + config; only secrets come from the vault).
4. Smoke test each subsystem (auth, upload, AI, push, cron, checkout).

**Keep the offline copy current:** update it in the same step as every rotation (§C.3). An
out-of-date secrets backup is the quiet failure mode of "environment loss" recovery.
