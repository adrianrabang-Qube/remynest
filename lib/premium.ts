import { createClient } from "@/utils/supabase/server";

import {
  BillingPlan,
} from "@/lib/billing/plans";

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
        "is_premium, subscription_plan"
      )
      .eq("id", user.id)
      .single();

  const plan =
    (profile
      ?.subscription_plan as BillingPlan | null) ??
    (profile?.is_premium
      ? "PREMIUM"
      : "FREE");

  return {
    user,
    isPremium:
      plan !== "FREE",
    plan,
  };
}