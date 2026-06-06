import { redirect } from "next/navigation";

import ProfileHeader from "@/components/navigation/ProfileHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import AccountInformationSection from "@/components/profile/sections/AccountInformationSection";
import ExportDataSection from "@/components/profile/sections/ExportDataSection";
import PrivacyLinksSection from "@/components/profile/sections/PrivacyLinksSection";
import DeleteAccountSection from "@/components/profile/sections/DeleteAccountSection";
import { resolveAccountIdentity } from "@/lib/account-identity";

export const dynamic = "force-dynamic";

/**
 * Settings (Phase 1 — Foundation).
 *
 * Identity + subscription come from the shared resolver (`resolveAccountIdentity`),
 * the single source of truth also used by the app-layout navbar — so Settings and
 * the navbar can never disagree.
 */
export default async function SettingsPage() {
  const identity = await resolveAccountIdentity();

  // Defensive — middleware already protects /settings, but never render without a user.
  if (!identity) {
    redirect("/login");
  }

  const { summary, firstName, preferredName } = identity;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <ProfileHeader profile={summary} />

      <div className="mt-6 space-y-6">
        <ProfileSection id="account-information" title="Account Information">
          <AccountInformationSection
            email={summary.email}
            firstName={firstName}
            preferredName={preferredName}
          />
        </ProfileSection>

        <ProfileSection id="export-data" title="Export Your Data">
          <ExportDataSection />
        </ProfileSection>

        <ProfileSection id="privacy" title="Privacy">
          <PrivacyLinksSection />
        </ProfileSection>

        <ProfileSection id="delete-account" title="Danger Zone">
          <DeleteAccountSection />
        </ProfileSection>
      </div>
    </main>
  );
}
