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
    <header className="relative flex justify-between items-center px-6 py-4 border-b">
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
            px-4
            py-2
            hover:bg-neutral-100
            transition
          "
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300 text-sm font-semibold text-neutral-700">
            {initial}
          </div>

          <span className="text-sm font-medium">{displayName}</span>

          <span>▼</span>
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
