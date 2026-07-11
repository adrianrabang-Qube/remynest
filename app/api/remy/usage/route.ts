import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveAiEntitlement } from "@/lib/ai/usage/entitlements";
import { getAiUsageOverview } from "@/lib/ai/usage/overview";

/**
 * GET /api/remy/usage (Phase 27) — the production AI usage API. Returns the caller's today/month usage,
 * estimated cost, remaining quota, subscription tier, provider, and current model. Auth-gated, per-user, and
 * read-only. Future-ready for mobile apps (stable JSON). Degrades to a safe overview, never 500s on a read
 * failure.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium, subscription_status, subscription_plan")
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = resolveAiEntitlement(profile ?? null);
  const overview = await getAiUsageOverview(user.id, entitlement);

  return NextResponse.json(
    {
      tier: overview.tier,
      isPremium: overview.isPremium,
      provider: overview.provider,
      model: overview.model,
      today: overview.today,
      month: overview.month,
      estimatedDailyCostUsd: overview.estimatedDailyCostUsd,
      estimatedMonthlyCostUsd: overview.estimatedMonthlyCostUsd,
      quota: {
        allowed: overview.gate.allowed,
        reason: overview.gate.reason,
        dailyLimit: overview.gate.dailyLimit,
        monthlyLimit: overview.gate.monthlyLimit,
        dailyRemaining: overview.gate.dailyRemaining,
        monthlyRemaining: overview.gate.monthlyRemaining,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
