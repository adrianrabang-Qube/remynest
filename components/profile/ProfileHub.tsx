import Link from "next/link";

import ProfileHeader from "@/components/navigation/ProfileHeader";
import ProfileSection from "./ProfileSection";
import { PROFILE_SECTIONS } from "./config/profile-sections.config";
import { useProfileAccess } from "./hooks/useProfileAccess";

import type { ProfileSummary } from "./types";

interface ProfileHubProps {
  profile: ProfileSummary;
}

export default function ProfileHub({
  profile,
}: ProfileHubProps) {
  const {
    canAccessVault,
    canManageCaregiving,
  } = useProfileAccess(profile);

  return (
    <div className="space-y-5">
      <ProfileHeader profile={profile} />

      {/* The identity layer — Profile V2. Settings sections remain below. */}
      <Link
        href="/profile"
        className="flex items-center justify-between rounded-2xl border border-sand-deep/70 bg-white px-4 py-2.5 text-sm font-semibold text-sage-deep transition hover:bg-sand/40"
      >
        View profile
        <span aria-hidden>→</span>
      </Link>

      {PROFILE_SECTIONS.map((section) => {
        const SectionComponent = section.component;

        const sectionId =
          section.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/&/g, "and");

        const hidden =
          (section.access === "vault" && !canAccessVault) ||
          (section.access === "caregiving" && !canManageCaregiving);

        return (
          <ProfileSection
            key={section.title}
            id={sectionId}
            title={section.title}
            hidden={hidden}
          >
            <SectionComponent />
          </ProfileSection>
        );
      })}
    </div>
  );
}