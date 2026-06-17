"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import ProfileHeader from "@/components/navigation/ProfileHeader";
import ProfileSection from "./ProfileSection";
import { PROFILE_SECTIONS } from "./config/profile-sections.config";
import { useProfileAccess } from "./hooks/useProfileAccess";
import { setPersonalWorkspace } from "@/app/(app)/dashboard/profile-actions";

import type { ProfileSummary } from "./types";

interface ProfileHubProps {
  profile: ProfileSummary;
  /**
   * Called when an internal navigation link inside the hub is tapped, so the
   * host dropdown/drawer can close itself immediately — otherwise the
   * destination page renders behind a still-open menu (TestFlight defect).
   */
  onNavigate?: () => void;
}

export default function ProfileHub({
  profile,
  onNavigate,
}: ProfileHubProps) {
  const router = useRouter();
  const {
    canAccessVault,
    canManageCaregiving,
  } = useProfileAccess(profile);

  // "My Nest" — the personal-workspace entry, retired from the mobile workspace
  // drawer and relocated here (the workspace drawer keeps care-profile switching
  // + management). Mirrors the Settings entry's close-then-navigate behaviour:
  // closes the menu immediately, then switches to the personal context
  // (setPersonalWorkspace cookie) and opens /home. The switch + push run
  // independent of this (now-unmounting) component, so there is no context race
  // and the menu can't strand open. (There is intentionally no dedicated
  // "My Nest" page — it is the personal workspace, whose home is /home.)
  function goToMyNest() {
    onNavigate?.();
    void setPersonalWorkspace()
      .then(() => router.push("/home"))
      .catch(() => router.push("/home"));
  }

  return (
    <div
      className="space-y-5"
      onClick={(event) => {
        // Delegation: close the host menu only when a real navigation link is
        // tapped (covers "View profile" + every nested section link). Section
        // expand/collapse controls are <button>s, so they never trigger a close.
        if (
          onNavigate &&
          (event.target as HTMLElement).closest("a[href]")
        ) {
          onNavigate();
        }
      }}
    >
      <ProfileHeader profile={profile} />

      {/* My Nest — return to the personal workspace + open its home. */}
      <button
        type="button"
        onClick={goToMyNest}
        className="flex w-full items-center justify-between rounded-2xl border border-sand-deep/70 bg-white px-4 py-2.5 text-sm font-semibold text-sage-deep transition hover:bg-sand/40"
      >
        🏡 My Nest
        <span aria-hidden>→</span>
      </button>

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