/**
 * AI entitlements (Phase 27) — the SINGLE source of AI plan limits.
 *
 * Integrates with the existing subscription resolver (`resolveSubscription`) — Premium/Family = unlimited AI;
 * Free = a daily + monthly conversation cap. The limits live in ONE config here (never hard-coded elsewhere);
 * add a plan or change a cap in `AI_PLAN_LIMITS` and every consumer (quota gate, dashboard, API) follows. This
 * module is provider-INDEPENDENT — it knows nothing about OpenAI/Claude/Gemini/etc.
 */
import { resolveSubscription, type SubscriptionFields } from "@/lib/billing/resolve-subscription";
import type { BillingPlan } from "@/lib/billing/plans";

export interface AiPlanLimits {
  /** Max conversations per UTC day (null = unlimited). */
  dailyConversations: number | null;
  /** Max conversations per UTC month (null = unlimited). */
  monthlyConversations: number | null;
}

/** SINGLE AI-limits config, keyed by billing plan. Expand here — do NOT scatter limits through the codebase. */
export const AI_PLAN_LIMITS: Readonly<Record<BillingPlan, AiPlanLimits>> = {
  FREE: { dailyConversations: 5, monthlyConversations: 50 },
  PREMIUM: { dailyConversations: null, monthlyConversations: null },
  FAMILY: { dailyConversations: null, monthlyConversations: null },
  ENTERPRISE: { dailyConversations: null, monthlyConversations: null },
};

/** Neutral, non-steering upgrade copy (the UI decides whether/how to show it per platform — Apple 3.1.1/3.1.3). */
export const AI_UPGRADE_MESSAGE =
  "You've reached your free AI limit. Premium members enjoy unlimited conversations with Remy.";

export interface AiEntitlement {
  plan: BillingPlan;
  isPremium: boolean;
  /** Effective limits for this plan (null = unlimited). */
  dailyConversations: number | null;
  monthlyConversations: number | null;
  /** True when AI is uncapped (premium, or a plan with both limits null). */
  unlimited: boolean;
}

/** Resolve a user's AI entitlement from their profile subscription fields. */
export function resolveAiEntitlement(profile: SubscriptionFields | null | undefined): AiEntitlement {
  const { isPremium, plan } = resolveSubscription(profile);
  const limits = AI_PLAN_LIMITS[plan] ?? AI_PLAN_LIMITS.FREE;
  const unlimited =
    isPremium || (limits.dailyConversations == null && limits.monthlyConversations == null);
  return {
    plan,
    isPremium,
    dailyConversations: unlimited ? null : limits.dailyConversations,
    monthlyConversations: unlimited ? null : limits.monthlyConversations,
    unlimited,
  };
}
