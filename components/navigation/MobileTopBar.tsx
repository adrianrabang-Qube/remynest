"use client";

import Link from "next/link";
import type { ProfileSummary } from "@/components/profile/types";

interface MobileTopBarProps {
  profile: ProfileSummary | null;
  /** Opens the mobile nav/profile drawer. */
  onOpenMenu: () => void;
}

/**
 * Slim mobile header (< md): brand on the left, avatar/profile access on the
 * right. Tapping the avatar opens the same drawer as the bottom-nav "More",
 * which hosts the full profile hub (settings, billing, support, workspace
 * switching, sign out). Desktop keeps its own bar in AppNavbar.
 */
export default function MobileTopBar({ profile, onOpenMenu }: MobileTopBarProps) {
  const displayName = profile?.fullName ?? "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-sand-deep/60 bg-sand/80 px-4 py-3 backdrop-blur-md">
      <Link
        href="/dashboard"
        className="font-serif text-lg font-semibold tracking-tight text-charcoal"
      >
        RemyNest
      </Link>

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu and profile"
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white transition hover:bg-sage-deep"
      >
        {initial}
      </button>
    </header>
  );
}
