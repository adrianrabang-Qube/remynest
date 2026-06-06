import { createClient } from "@/lib/supabase/server";
import type {
  ProfilePlan,
  ProfileSummary,
} from "@/components/profile/types";

/**
 * Single source of truth for authenticated account identity + subscription
 * status. Server-only (reads cookies via the SSR client). Both the Settings page
 * and the app-layout navbar resolve identity through this, so they can never
 * disagree.
 *
 * Returns null when there is no signed-in user.
 */
export interface AccountIdentity {
  summary: ProfileSummary;
  /** Raw editable fields for the Account Information form. */
  firstName: string;
  preferredName: string;
}

export async function resolveAccountIdentity(): Promise<AccountIdentity | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, preferred_name, profile_name, email, is_premium, subscription_plan"
    )
    .eq("id", user.id)
    .maybeSingle();

  const isPremium =
    Boolean(profile?.is_premium) ||
    (typeof profile?.subscription_plan === "string" &&
      profile.subscription_plan !== "FREE");

  const plan: ProfilePlan = isPremium ? "premium" : "free";

  const firstName = profile?.first_name ?? "";
  const preferredName = profile?.preferred_name ?? "";

  const fullName =
    preferredName ||
    firstName ||
    profile?.profile_name ||
    user.email?.split("@")[0] ||
    "Your Account";

  const summary: ProfileSummary = {
    fullName,
    email: user.email ?? profile?.email ?? "",
    plan,
    role: "user",
    avatarUrl: null,
    isPremium,
  };

  return { summary, firstName, preferredName };
}
