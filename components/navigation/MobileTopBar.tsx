"use client";

import type { ProfileSummary } from "@/components/profile/types";
import WorkspaceSelector, { type WorkspaceOption } from "./WorkspaceSelector";

interface MobileTopBarProps {
  profile: ProfileSummary | null;
  /** Opens the mobile nav/profile drawer. */
  onOpenMenu: () => void;
  workspaceProfiles: WorkspaceOption[];
  activeProfileId: string | null;
  isMyNest: boolean;
  activeProfileName: string | null;
}

/**
 * Slim mobile header (< md): the global Workspace Selector (the primary
 * identity/context control, like Slack/Notion) on the left, avatar/profile
 * access on the right. The avatar opens the drawer (settings, billing, support,
 * sign out). Desktop keeps its own bar in AppNavbar.
 */
export default function MobileTopBar({
  profile,
  onOpenMenu,
  workspaceProfiles,
  activeProfileId,
  isMyNest,
  activeProfileName,
}: MobileTopBarProps) {
  const displayName = profile?.fullName ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-sand-deep/60 bg-sand/80 px-4 py-3 backdrop-blur-md">
      <WorkspaceSelector
        profiles={workspaceProfiles}
        activeProfileId={activeProfileId}
        isMyNest={isMyNest}
        activeProfileName={activeProfileName}
      />

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu and profile"
        aria-haspopup="dialog"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white transition hover:bg-sage-deep"
      >
        {initial}
      </button>
    </header>
  );
}
