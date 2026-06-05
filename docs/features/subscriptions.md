# Feature: Subscriptions

## Current implementation
Stripe subscriptions (PREMIUM, FAMILY). Checkout + webhook + status read.
Premium gating enforced on semantic search (free → 402).

## Architecture
- `lib/stripe.ts`, `lib/billing/plans.ts` (plan defs), `subscription-guards.ts`,
  `usage-limits.ts`, `billing-telemetry.ts`, `lib/premium.ts` (`checkPremium`).
- Webhook updates `profiles` subscription columns.

## Database dependencies
`profiles.subscription_plan`, `subscription_status`, `current_period_end`,
`is_premium`, `stripe_customer_id`, `stripe_subscription_id`. Also
`memory_profiles.subscription_status` (profile-level) _(verify usage)_.

## API routes
`/api/stripe/checkout` (POST), `/api/stripe/webhook` (POST, public, sig-verified),
`/api/billing/status` (GET). **Missing:** `/api/stripe/cancel` (referenced by UI).

## UI components
`components/profile/sections/BillingSection.tsx` (checkout/cancel/portal),
`components/profile/hooks/useBillingStatus.ts`.

## Limitations
- ⚠️ `BillingSection` calls **`/api/stripe/cancel` which does not exist** → cancel
  is broken; "Manage Subscription"/portal path depends on
  `customerPortalEnabled`.
- Duplicate upgrade buttons in `BillingSection` (UX debt).
- Pricing strings hardcoded in UI (€9.99 / €19.99) — keep in sync with Stripe.

## Future enhancements
Implement `/api/stripe/cancel` (or Customer Portal); surface billing on
`/settings`; reconcile profile-level vs account-level subscription.
