"use client";

import { useEffect, useRef, useState } from "react";

import NavLinks from "./NavLinks";
import UserProfileDropdown from "./UserProfileDropdown";
import WorkspaceSelector, { type WorkspaceOption } from "./WorkspaceSelector";
import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import MobileNavDrawer from "./MobileNavDrawer";
import type { WorkspaceNavState } from "./workspace-nav";
import type { ProfileSummary } from "@/components/profile/types";

interface AppNavbarProps {
  profile: ProfileSummary | null;
  workspace: WorkspaceNavState;
  workspaceProfiles: WorkspaceOption[];
  activeProfileId: string | null;
  /** REAL memory count for the active workspace — drives the Nest's evolution stage. */
  memoryCount?: number;
}

export default function AppNavbar({
  profile,
  workspace,
  workspaceProfiles,
  activeProfileId,
  memoryCount,
}: AppNavbarProps) {
  const [open, setOpen] = useState(false);
  // Mobile (< md) nav/profile drawer — opened by the top-bar avatar and the
  // bottom-nav "More" entry. Separate from the desktop profile dropdown above.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Wraps the toggle button + dropdown so a pointer event INSIDE (button or
  // drawer) never counts as "outside".
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the drawer when the user clicks/taps anywhere outside it. `pointerdown`
  // covers mouse + touch (desktop, mobile Safari, Android Chrome) in one listener.
  // Only attached while open; cleaned up on close/unmount — no leaks.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const displayName = profile?.fullName ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop top navigation — unchanged, shown at md and up. */}
      <header className="hidden lg:flex sticky top-0 z-40 justify-between items-center pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 border-b border-sand-deep/60 bg-sand/80 backdrop-blur-md">
        <NavLinks />

        <div className="flex items-center gap-4">
          <WorkspaceSelector
            profiles={workspaceProfiles}
            activeProfileId={activeProfileId}
            isMyNest={workspace.isMyNest}
            activeProfileName={workspace.activeProfileName}
          />

          <div className="relative" ref={menuRef}>
            <button
            onClick={() => setOpen(!open)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
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
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-sage
              focus-visible:ring-offset-2
            "
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white">
              {initial}
            </div>

            <span className="text-sm font-medium text-charcoal">{displayName}</span>

            <span aria-hidden className="text-xs text-charcoal-muted">▾</span>
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

      {/* Mobile navigation (< md): slim top bar + bottom nav + "More" drawer. */}
      <MobileTopBar
        profile={profile}
        onOpenMenu={() => setMobileNavOpen(true)}
        workspaceProfiles={workspaceProfiles}
        activeProfileId={activeProfileId}
        isMyNest={workspace.isMyNest}
        activeProfileName={workspace.activeProfileName}
      />
      <MobileBottomNav
        onOpenMore={() => setMobileNavOpen(true)}
        memoryCount={memoryCount}
      />
      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        profile={profile}
      />
    </>
  );
}
