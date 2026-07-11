/**
 * AI usage quotas (Phase 26) — ARCHITECTURE ONLY, NOT ENFORCED.
 *
 * Reusable, provider-independent reads over `ai_usage` (via the service-role `ai_usage_summary` aggregate,
 * scoped by an explicit user_id) plus a `canExecuteConversation` gate. By default there are NO limits, so
 * `canExecuteConversation` ALWAYS allows — and it short-circuits WITHOUT a DB read when limits are off, so
 * wiring it into the hot path costs nothing today. When the operator later sets a limit, this becomes the
 * single enforcement point. Every read degrades to zeros (never throws) so a missing migration / degraded
 * read can never block AI execution.
 */
import { supabaseAdmin } from "@/utils/supabase/admin";

export interface UsageSummary {
  requestCount: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ConversationGateResult {
  allowed: boolean;
  /** Non-null only when denied (never happens while limits are off). */
  reason: string | null;
}

/**
 * Quota limits. `null` = unlimited (the launch default → nothing is enforced). Flip these on (or wire to a
 * plan) to enforce, with no other code change. Keep the default OFF.
 */
export const AI_USAGE_LIMITS: Readonly<{
  dailyRequests: number | null;
  monthlyCostUsd: number | null;
}> = {
  dailyRequests: null,
  monthlyCostUsd: null,
};

function startOfUtcDay(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
function startOfUtcMonth(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

const ZERO: UsageSummary = { requestCount: 0, totalTokens: 0, estimatedCostUsd: 0 };

/** Aggregate usage since `sinceIso`, scoped by user (+ optional workspace). Degrades to zeros, never throws. */
async function summarize(
  userId: string,
  workspaceId: string | null,
  sinceIso: string,
): Promise<UsageSummary> {
  try {
    const { data, error } = await supabaseAdmin.rpc("ai_usage_summary", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_since: sinceIso,
    });
    if (error || !data) return ZERO;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return ZERO;
    return {
      requestCount: Number(row.request_count ?? 0),
      totalTokens: Number(row.total_tokens ?? 0),
      estimatedCostUsd: Number(row.total_cost ?? 0),
    };
  } catch {
    return ZERO;
  }
}

/** Usage since the start of the current UTC day. */
export async function getUsageToday(
  userId: string,
  workspaceId: string | null = null,
): Promise<UsageSummary> {
  return summarize(userId, workspaceId, startOfUtcDay(new Date()));
}

/** Usage since the start of the current UTC month. */
export async function getUsageThisMonth(
  userId: string,
  workspaceId: string | null = null,
): Promise<UsageSummary> {
  return summarize(userId, workspaceId, startOfUtcMonth(new Date()));
}

/** Estimated spend (USD) so far this UTC month. */
export async function getEstimatedMonthlyCost(
  userId: string,
  workspaceId: string | null = null,
): Promise<number> {
  return (await getUsageThisMonth(userId, workspaceId)).estimatedCostUsd;
}

/**
 * The single conversation-execution gate. ALWAYS allows while limits are off (short-circuits with no DB
 * read). When a limit is configured, it reads real usage and denies past the threshold. Never throws.
 */
export async function canExecuteConversation(
  userId: string,
  workspaceId: string | null = null,
): Promise<ConversationGateResult> {
  const { dailyRequests, monthlyCostUsd } = AI_USAGE_LIMITS;
  if (dailyRequests == null && monthlyCostUsd == null) {
    return { allowed: true, reason: null };
  }

  if (dailyRequests != null) {
    const today = await getUsageToday(userId, workspaceId);
    if (today.requestCount >= dailyRequests) {
      return { allowed: false, reason: "daily_request_limit" };
    }
  }
  if (monthlyCostUsd != null) {
    const monthCost = await getEstimatedMonthlyCost(userId, workspaceId);
    if (monthCost >= monthlyCostUsd) {
      return { allowed: false, reason: "monthly_cost_limit" };
    }
  }
  return { allowed: true, reason: null };
}
