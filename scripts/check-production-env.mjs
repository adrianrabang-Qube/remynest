#!/usr/bin/env node
/**
 * Production environment integrity check (LA6, read-only).
 *
 * Reports which production environment variables are PRESENT vs MISSING so an
 * operator can confirm environment integrity before a deploy and after a rotation
 * or an "environment loss" recovery (see docs/runbooks/secrets-and-credential-rotation.md
 * and docs/runbooks/deployment-and-migration-rollback.md §C).
 *
 * SAFETY: it NEVER prints a value — only the var name + present/missing. Presence is
 * NOT validity (a stale/rotated value is "present" but may be rejected by the provider).
 * It exits NON-ZERO if any REQUIRED var is missing (usable as a pre-deploy gate); a
 * missing RECOMMENDED var is reported but does not fail (those degrade to a no-op).
 *
 * Run against the current environment:  node scripts/check-production-env.mjs
 * (In Vercel/CI the vars are injected; locally, load your .env first if desired.)
 *
 * The grouping + degrade notes mirror .env.example — keep them in sync when a new
 * production var ships.
 */

// REQUIRED: a missing value breaks or majorly degrades a production subsystem.
const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL (all data/auth/storage)"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase client key (RLS-scoped reads/writes)"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Server admin paths (GDPR, ledger, AI usage, moderation)"],
  ["STRIPE_SECRET_KEY", "Stripe server calls (checkout/portal)"],
  ["STRIPE_WEBHOOK_SECRET", "Webhook signature verification (entitlements)"],
  ["OPENAI_API_KEY", "AI features (Ask Remy, embeddings, summaries, story)"],
  ["NEXT_PUBLIC_ONESIGNAL_APP_ID", "OneSignal app id (push init)"],
  ["ONESIGNAL_API_KEY", "OneSignal REST key (cron push)"],
  ["CRON_SECRET", "Reminder cron auth — cron fails CLOSED (401) if unset"],
  // Launch-tier price ids (lib/billing/plans.ts reads these EXACT names). Without them
  // the premium-upgrade flow can't resolve a price → checkout is broken for that plan.
  ["STRIPE_PREMIUM_MONTHLY_PRICE_ID", "Premium monthly checkout price"],
  ["STRIPE_PREMIUM_YEARLY_PRICE_ID", "Premium yearly checkout price"],
  ["STRIPE_FAMILY_MONTHLY_PRICE_ID", "Family monthly checkout price"],
  ["STRIPE_FAMILY_YEARLY_PRICE_ID", "Family yearly checkout price"],
];

// RECOMMENDED: degrades to a no-op / optional feature if missing (does not fail the check).
const RECOMMENDED = [
  ["SENTRY_DSN", "Server error telemetry (no-op if unset)"],
  ["NEXT_PUBLIC_SENTRY_DSN", "Browser error telemetry (no-op if unset)"],
  ["SENTRY_ORG", "Source-map upload"],
  ["SENTRY_PROJECT", "Source-map upload"],
  ["SENTRY_AUTH_TOKEN", "Source-map upload auth"],
  ["TOMBSTONE_USER_ID", "GDPR retain-mode deletion path only"],
  ["MEMORY_IMAGE_TRANSFORMS_ENABLED", "Thumbnail transforms gate (default OFF)"],
  ["STRIPE_ENTERPRISE_MONTHLY_PRICE_ID", "Enterprise monthly (post-launch tier)"],
  ["STRIPE_ENTERPRISE_YEARLY_PRICE_ID", "Enterprise yearly (post-launch tier)"],
  ["NEXT_PUBLIC_APP_STORE_URL", "/download iOS button (empty if unset)"],
  ["NEXT_PUBLIC_PLAY_STORE_URL", "/download Android button (empty if unset)"],
];

function present(key) {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0;
}

process.stdout.write("RemyNest — production environment integrity check\n");
process.stdout.write("(values are never printed; presence is not validity)\n\n");

let missingRequired = 0;
process.stdout.write("REQUIRED\n");
for (const [key, note] of REQUIRED) {
  const ok = present(key);
  if (!ok) missingRequired += 1;
  process.stdout.write(`  ${ok ? "PASS    " : "MISSING "} ${key}  — ${note}\n`);
}

let missingRecommended = 0;
process.stdout.write("\nRECOMMENDED\n");
for (const [key, note] of RECOMMENDED) {
  const ok = present(key);
  if (!ok) missingRecommended += 1;
  process.stdout.write(`  ${ok ? "PASS    " : "absent  "} ${key}  — ${note}\n`);
}

process.stdout.write("\n");

if (missingRequired > 0) {
  process.stderr.write(
    `FAIL: ${missingRequired}/${REQUIRED.length} REQUIRED env var(s) missing — a production subsystem will break or degrade. See .env.example + docs/runbooks/secrets-and-credential-rotation.md.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `OK: all ${REQUIRED.length} required env vars present${
    missingRecommended > 0 ? ` (${missingRecommended} recommended absent — observability/optional).` : "."
  }\n`,
);
