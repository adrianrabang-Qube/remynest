/**
 * AI usage quotas (Phase 27) — REAL, plan-aware enforcement (reusable, provider-independent).
 *
 * Reusable reads over `ai_usage` (via the service-role `ai_usage_overview` aggregate, scoped by an explicit
 * user_id) plus `canExecuteConversation` — the single gate. Premium/unlimited entitlements bypass with NO DB
 * read; Free entitlements are enforced against a daily + monthly conversation cap. Every read degrades to
 * zeros and NEVER throws, so a missing migration / degraded read can never crash the caller — it just returns
 * a permissive/empty result the caller renders. Conversation counts use SUCCESSFUL calls (a failed provider
 * call never consumes the user's quota).
 */
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { BillingPlan } from "@/lib/billing/plans";
import { AI_UPGRADE_MESSAGE, type AiEntitlement } from "@/lib/ai/usage/entitlements";

export interface UsageWindow {
  conversations: number;
  successCount: number;
  errorCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  avgLatencyMs: number;
}

export interface ConversationGateResult {
  allowed: boolean;
  tier: BillingPlan;
  isPremium: boolean;
  /** Which cap was hit (null when allowed). */
  reason: "daily_limit" | "monthly_limit" | null;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  /** null = unlimited. */
  dailyRemaining: number | null;
  monthlyRemaining: number | null;
  /** Non-null only when denied (the UI decides how/whether to present it per platform). */
  upgradeMessage: string | null;
}

const ZERO_WINDOW: UsageWindow = {
  conversations: 0,
  successCount: 0,
  errorCount: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  avgLatencyMs: 0,
};

function startOfUtcDay(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
function startOfUtcMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Aggregate usage since `sinceIso`, scoped by user (+ optional workspace). Degrades to zeros, never throws. */
async function readWindow(
  userId: string,
  workspaceId: string | null,
  sinceIso: string,
): Promise<UsageWindow> {
  try {
    const { data, error } = await supabaseAdmin.rpc("ai_usage_overview", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_since: sinceIso,
    });
    if (error || !data) return ZERO_WINDOW;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return ZERO_WINDOW;
    return {
      conversations: Number(row.conversations ?? 0),
      successCount: Number(row.success_count ?? 0),
      errorCount: Number(row.error_count ?? 0),
      promptTokens: Number(row.prompt_tokens ?? 0),
      completionTokens: Number(row.completion_tokens ?? 0),
      totalTokens: Number(row.total_tokens ?? 0),
      estimatedCostUsd: Number(row.estimated_cost ?? 0),
      avgLatencyMs: Number(row.avg_latency_ms ?? 0),
    };
  } catch {
    return ZERO_WINDOW;
  }
}

/** Usage since the start of the current UTC day (per-user; optional workspace scope). */
export async function getUsageToday(
  userId: string,
  workspaceId: string | null = null,
): Promise<UsageWindow> {
  return readWindow(userId, workspaceId, startOfUtcDay(new Date()));
}

/** Usage since the start of the current UTC month. */
export async function getUsageThisMonth(
  userId: string,
  workspaceId: string | null = null,
): Promise<UsageWindow> {
  return readWindow(userId, workspaceId, startOfUtcMonth(new Date()));
}

/** Estimated spend (USD) so far this UTC month. */
export async function getEstimatedMonthlyCost(
  userId: string,
  workspaceId: string | null = null,
): Promise<number> {
  return (await getUsageThisMonth(userId, workspaceId)).estimatedCostUsd;
}

/** An always-allowed gate result for an unlimited/premium entitlement (no DB read needed). */
function unlimitedGate(entitlement: AiEntitlement): ConversationGateResult {
  return {
    allowed: true,
    tier: entitlement.plan,
    isPremium: entitlement.isPremium,
    reason: null,
    dailyLimit: null,
    monthlyLimit: null,
    dailyRemaining: null,
    monthlyRemaining: null,
    upgradeMessage: null,
  };
}

/**
 * PURE gate evaluation from already-read SUCCESSFUL conversation counts. Premium/unlimited → always allowed;
 * Free → enforced against the daily + monthly caps. No IO — so a caller that already read the windows (e.g. the
 * dashboard) can reuse them without a second query. Deterministic, never throws.
 */
export function evaluateConversationGate(
  entitlement: AiEntitlement,
  todaySuccessCount: number,
  monthSuccessCount: number,
): ConversationGateResult {
  if (entitlement.unlimited) return unlimitedGate(entitlement);

  const daily = entitlement.dailyConversations;
  const monthly = entitlement.monthlyConversations;
  const dailyRemaining = daily == null ? null : Math.max(0, daily - todaySuccessCount);
  const monthlyRemaining = monthly == null ? null : Math.max(0, monthly - monthSuccessCount);

  let allowed = true;
  let reason: ConversationGateResult["reason"] = null;
  if (monthly != null && monthSuccessCount >= monthly) {
    allowed = false;
    reason = "monthly_limit";
  } else if (daily != null && todaySuccessCount >= daily) {
    allowed = false;
    reason = "daily_limit";
  }

  return {
    allowed,
    tier: entitlement.plan,
    isPremium: entitlement.isPremium,
    reason,
    dailyLimit: daily,
    monthlyLimit: monthly,
    dailyRemaining,
    monthlyRemaining,
    upgradeMessage: allowed ? null : AI_UPGRADE_MESSAGE,
  };
}

/**
 * The single conversation-execution gate. Premium/unlimited → always allowed (no DB read). Free → enforced
 * against the daily + monthly conversation caps using SUCCESSFUL prior conversations. Returns a STRUCTURED
 * result (never throws). Callers scope PER-USER (cost control must not be bypassable by switching workspaces).
 */
export async function canExecuteConversation(
  userId: string,
  entitlement: AiEntitlement,
): Promise<ConversationGateResult> {
  if (entitlement.unlimited) return unlimitedGate(entitlement);

  // Per-user (workspaceId = null → across all the user's workspaces).
  const [today, month] = await Promise.all([getUsageToday(userId), getUsageThisMonth(userId)]);
  return evaluateConversationGate(entitlement, today.successCount, month.successCount);
}
