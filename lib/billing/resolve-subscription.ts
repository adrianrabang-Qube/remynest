import type { BillingPlan } from "@/lib/billing/plans";

export interface SubscriptionFields {
  is_premium?: boolean | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
}

export interface ResolvedSubscription {
  isPremium: boolean;
  plan: BillingPlan;
}

/**
 * SINGLE AUTHORITATIVE subscription resolver. Use this everywhere — do not
 * re-implement plan logic inline.
 *
 * Premium is TRUE if ANY of:
 *   - is_premium === true
 *   - subscription_status === "active"
 *   - subscription_status === "trialing"
 *   - subscription_plan === "PREMIUM"
 *   - subscription_plan === "FAMILY"
 *
 * Logs a warning when the stored fields contradict each other (e.g. premium by
 * flag/status while subscription_plan says FREE) so data drift is observable.
 */
export function resolveSubscription(
  profile: SubscriptionFields | null | undefined,
): ResolvedSubscription {
  const planRaw = (profile?.subscription_plan ?? "").toUpperCase();
  const status = (profile?.subscription_status ?? "").toLowerCase();

  const isPremium =
    profile?.is_premium === true ||
    status === "active" ||
    status === "trialing" ||
    planRaw === "PREMIUM" ||
    planRaw === "FAMILY";

  // Defensive: resolved premium but the plan column disagrees.
  if (isPremium && planRaw !== "PREMIUM" && planRaw !== "FAMILY") {
    console.warn("[subscription] contradictory state", {
      is_premium: profile?.is_premium ?? null,
      subscription_status: profile?.subscription_status ?? null,
      subscription_plan: profile?.subscription_plan ?? null,
    });
  }

  const plan: BillingPlan =
    planRaw === "FAMILY" ? "FAMILY" : isPremium ? "PREMIUM" : "FREE";

  return { isPremium, plan };
}
