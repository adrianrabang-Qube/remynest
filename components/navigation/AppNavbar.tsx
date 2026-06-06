"use client";

import { useState } from "react";

import NavLinks from "./NavLinks";
import UserProfileDropdown from "./UserProfileDropdown";
import WorkspaceIndicator from "./WorkspaceIndicator";
import type { WorkspaceNavState } from "./workspace-nav";
import type { ProfileSummary } from "@/components/profile/types";

interface AppNavbarProps {
  profile: ProfileSummary | null;
  workspace: WorkspaceNavState;
}

export default function AppNavbar({ profile, workspace }: AppNavbarProps) {
  const [open, setOpen] = useState(false);

  const displayName = profile?.fullName ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-6 py-3.5 border-b border-sand-deep/60 bg-sand/80 backdrop-blur-md">
      <NavLinks />

      <div className="flex items-center gap-4">
        <WorkspaceIndicator
          isMyNest={workspace.isMyNest}
          activeProfileName={workspace.activeProfileName}
        />

        <div className="relative">
          <button
          onClick={() => setOpen(!open)}
          className="
            flex
            items-center
            gap-3
            rounded-full
            border
            border-sand-deep/70
            bg-white/70
            px-3
            py-1.5
            transition
            hover:bg-white
          "
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white">
            {initial}
          </div>

          <span className="text-sm font-medium text-charcoal">{displayName}</span>

          <span className="text-xs text-charcoal-muted">▾</span>
        </button>

          {open && profile && (
            <UserProfileDropdown
              profile={profile}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
