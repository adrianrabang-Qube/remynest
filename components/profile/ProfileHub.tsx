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