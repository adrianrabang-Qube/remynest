/**
 * AI admin analytics (Phase 27) — SERVER-ONLY, global (all users) rollups over `ai_usage`.
 *
 * NEVER exposed publicly: these read every user's usage via the service role, so they must only ever be
 * called from trusted server/ops contexts (there is intentionally NO public route wired to them). They power
 * ops dashboards / spend monitoring. Never throws — degrades to an empty analytics on any failure. Provider-
 * independent (aggregates the `provider`/`model` columns as recorded).
 */
import { supabaseAdmin } from "@/utils/supabase/admin";

export interface AdminModelUsage {
  model: string;
  requestCount: number;
}

export interface AdminAiAnalytics {
  sinceIso: string;
  conversations: number;
  successCount: number;
  errorCount: number;
  /** 0..1 (0 when there is no data). */
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  avgTotalTokens: number;
  estimatedCostUsd: number;
  mostUsedModel: string | null;
  modelUsage: AdminModelUsage[];
}

function emptyAnalytics(sinceIso: string): AdminAiAnalytics {
  return {
    sinceIso,
    conversations: 0,
    successCount: 0,
    errorCount: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    avgTotalTokens: 0,
    estimatedCostUsd: 0,
    mostUsedModel: null,
    modelUsage: [],
  };
}

function startOfUtcDayIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
function startOfUtcMonthIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Global AI analytics since `sinceIso`. Aggregates: conversations, success/error counts + rates, average
 * latency (successful), average tokens (successful), estimated spend, and per-model usage (most used first).
 * SERVER-ONLY. Never throws.
 */
export async function getAdminAiAnalytics(sinceIso: string): Promise<AdminAiAnalytics> {
  try {
    const [overviewRes, modelRes] = await Promise.all([
      supabaseAdmin.rpc("ai_usage_admin_overview", { p_since: sinceIso }),
      supabaseAdmin.rpc("ai_usage_admin_model_usage", { p_since: sinceIso }),
    ]);

    if (overviewRes.error || !overviewRes.data) return emptyAnalytics(sinceIso);
    const row = Array.isArray(overviewRes.data) ? overviewRes.data[0] : overviewRes.data;
    if (!row) return emptyAnalytics(sinceIso);

    const conversations = Number(row.conversations ?? 0);
    const successCount = Number(row.success_count ?? 0);
    const errorCount = Number(row.error_count ?? 0);

    const modelUsage: AdminModelUsage[] = Array.isArray(modelRes.data)
      ? modelRes.data
          .map((m: { model?: unknown; request_count?: unknown }) => ({
            model: typeof m.model === "string" ? m.model : "unknown",
            requestCount: Number(m.request_count ?? 0),
          }))
          .filter((m) => m.model)
      : [];

    return {
      sinceIso,
      conversations,
      successCount,
      errorCount,
      successRate: conversations > 0 ? successCount / conversations : 0,
      errorRate: conversations > 0 ? errorCount / conversations : 0,
      avgLatencyMs: Number(row.avg_latency_ms ?? 0),
      avgTotalTokens: Number(row.avg_total_tokens ?? 0),
      estimatedCostUsd: Number(row.estimated_cost ?? 0),
      mostUsedModel: modelUsage[0]?.model ?? null,
      modelUsage,
    };
  } catch {
    return emptyAnalytics(sinceIso);
  }
}

/** Global AI analytics for the current UTC day. SERVER-ONLY. */
export async function getAdminAiAnalyticsToday(): Promise<AdminAiAnalytics> {
  return getAdminAiAnalytics(startOfUtcDayIso(new Date()));
}

/** Global AI analytics for the current UTC month. SERVER-ONLY. */
export async function getAdminAiAnalyticsThisMonth(): Promise<AdminAiAnalytics> {
  return getAdminAiAnalytics(startOfUtcMonthIso(new Date()));
}
