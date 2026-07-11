/**
 * AI usage overview (Phase 27) — the reusable read model behind the usage dashboard, the settings page, and
 * the usage API. Provider-INDEPENDENT: the current provider/model are read from the production provider's
 * configuration (whatever is registered), never hard-coded to OpenAI. Never throws — every field degrades to a
 * safe default so a missing migration / degraded read can't crash the dashboard/API.
 */
import type { BillingPlan } from "@/lib/billing/plans";
import type { AiEntitlement } from "@/lib/ai/usage/entitlements";
import {
  getUsageToday,
  getUsageThisMonth,
  evaluateConversationGate,
  type UsageWindow,
  type ConversationGateResult,
} from "@/lib/ai/usage/quota";
import { getProductionProvider } from "@/lib/remy/providers/provider-registry";

export interface AiUsageOverview {
  tier: BillingPlan;
  isPremium: boolean;
  /** The current production provider + model (provider-independent — read from the registry). */
  provider: string;
  model: string;
  today: UsageWindow;
  month: UsageWindow;
  estimatedDailyCostUsd: number;
  estimatedMonthlyCostUsd: number;
  gate: ConversationGateResult;
}

/** Read the current production provider/model without executing anything (provider-agnostic; degrades). */
function resolveProviderModel(): { provider: string; model: string } {
  try {
    const config = getProductionProvider().configuration();
    return { provider: config.name, model: config.model };
  } catch {
    return { provider: "unknown", model: "unknown" };
  }
}

/**
 * Build the full usage overview for a user. Reads today + month once and derives the quota gate from those
 * counts (no double read). Never throws.
 */
export async function getAiUsageOverview(
  userId: string,
  entitlement: AiEntitlement,
  workspaceId: string | null = null,
): Promise<AiUsageOverview> {
  const [today, month] = await Promise.all([
    getUsageToday(userId, workspaceId),
    getUsageThisMonth(userId, workspaceId),
  ]);
  const gate = evaluateConversationGate(entitlement, today.successCount, month.successCount);
  const { provider, model } = resolveProviderModel();

  return {
    tier: entitlement.plan,
    isPremium: entitlement.isPremium,
    provider,
    model,
    today,
    month,
    estimatedDailyCostUsd: today.estimatedCostUsd,
    estimatedMonthlyCostUsd: month.estimatedCostUsd,
    gate,
  };
}
