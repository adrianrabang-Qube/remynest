import { createClient } from "@/utils/supabase/server";

import {
  BillingPlan,
} from "@/lib/billing/plans";
import { resolveSubscription } from "@/lib/billing/resolve-subscription";

export interface PremiumStatus {
  user: unknown | null;
  isPremium: boolean;
  plan: BillingPlan;
}

export async function checkPremium(): Promise<PremiumStatus> {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isPremium: false,
      plan: "FREE",
    };
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "is_premium, subscription_plan, subscription_status"
      )
      .eq("id", user.id)
      .single();

  // Single authoritative resolver (no inline plan logic).
  const { isPremium, plan } = resolveSubscription(profile);

  return { user, isPremium, plan };
}