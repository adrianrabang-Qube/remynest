import { redirect } from "next/navigation";

import ProfileHeader from "@/components/navigation/ProfileHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import AccountInformationSection from "@/components/profile/sections/AccountInformationSection";
import ExportDataSection from "@/components/profile/sections/ExportDataSection";
import PrivacyLinksSection from "@/components/profile/sections/PrivacyLinksSection";
import DeleteAccountSection from "@/components/profile/sections/DeleteAccountSection";
import StorageUsageCard from "@/components/storage/StorageUsageCard";
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-charcoal md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Manage your account, storage, privacy, and data.
        </p>
      </header>

      <ProfileHeader profile={summary} />

      <div className="mt-6 space-y-6">
        <ProfileSection id="account-information" title="Account Information">
          <AccountInformationSection
            email={summary.email}
            firstName={firstName}
            preferredName={preferredName}
          />
        </ProfileSection>

        <ProfileSection id="storage" title="Storage">
          <div className="rounded-3xl border border-sand-deep/70 bg-white p-5 shadow-soft">
            <StorageUsageCard variant="full" />
          </div>
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
    </div>
  );
}
