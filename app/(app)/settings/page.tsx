import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ProfileHeader from "@/components/navigation/ProfileHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import AccountInformationSection from "@/components/profile/sections/AccountInformationSection";
import ExportDataSection from "@/components/profile/sections/ExportDataSection";
import PrivacyLinksSection from "@/components/profile/sections/PrivacyLinksSection";
import type { ProfilePlan, ProfileSummary } from "@/components/profile/types";

export const dynamic = "force-dynamic";

/**
 * Settings (Phase 1 — Foundation).
 *
 * Authenticated server component. Builds a real ProfileSummary from the signed-in
 * Supabase user and the `profiles` row, then renders the in-scope sections:
 * Account Information, Export Your Data, and Privacy. Other sections (Security,
 * Notifications, Caregiving, Vault, Delete Account) are intentionally out of scope
 * for this phase.
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive — middleware already protects /settings, but never render without a user.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, preferred_name, profile_name, email, is_premium, subscription_plan",
    )
    .eq("id", user.id)
    .maybeSingle();

  const isPremium =
    Boolean(profile?.is_premium) ||
    (typeof profile?.subscription_plan === "string" &&
      profile.subscription_plan !== "FREE");

  const plan: ProfilePlan = isPremium ? "premium" : "free";

  const fullName =
    profile?.preferred_name ||
    profile?.first_name ||
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <ProfileHeader profile={summary} />

      <div className="mt-6 space-y-6">
        <ProfileSection id="account-information" title="Account Information">
          <AccountInformationSection
            email={summary.email}
            firstName={profile?.first_name ?? ""}
            preferredName={profile?.preferred_name ?? ""}
          />
        </ProfileSection>

        <ProfileSection id="export-data" title="Export Your Data">
          <ExportDataSection />
        </ProfileSection>

        <ProfileSection id="privacy" title="Privacy">
          <PrivacyLinksSection />
        </ProfileSection>
      </div>
    </main>
  );
}
