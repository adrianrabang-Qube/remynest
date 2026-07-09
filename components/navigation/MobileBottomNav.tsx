"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { haptic } from "@/lib/haptics";
import Nest from "@/components/navigation/nest/Nest";

import {
  MOBILE_PRIMARY_NAV,
  MOBILE_NEW_ACTION,
  MOBILE_DRAWER_NAV,
  isNavItemActive,
} from "./nav-config";

interface MobileBottomNavProps {
  /** Opens the "More" drawer. */
  onOpenMore: () => void;
  /** REAL memory-milestone count for the Nest's evolution stage (from the app shell). */
  memoryCount?: number;
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={() => haptic("light")}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
        active ? "text-sage" : "text-charcoal-muted hover:text-sage"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

function BottomNavContent({ onOpenMore, memoryCount }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = searchParams.get("context");
  const withContext = (path: string) =>
    context ? `${path}?context=${context}` : path;

  const [home, dashboard, memories] = MOBILE_PRIMARY_NAV;

  // "More" reflects the active state of any drawer-hosted route.
  const moreActive = MOBILE_DRAWER_NAV.some((i) =>
    isNavItemActive(pathname, i.href),
  );

  return (
    <ul className="flex items-stretch">
      <li className="flex flex-1">
        <Tab
          href={withContext(home.href)}
          label={home.label}
          Icon={home.icon}
          active={isNavItemActive(pathname, home.href)}
        />
      </li>
      <li className="flex flex-1">
        <Tab
          href={withContext(dashboard.href)}
          label={dashboard.label}
          Icon={dashboard.icon}
          active={isNavItemActive(pathname, dashboard.href)}
        />
      </li>

      {/* Center action — the Nest: Remy's interaction hub (replaces the "+" FAB / static speed
          dial). Remy rests inside the nest and, on tap, wakes → peeks → pops out → presents a
          calm menu of EXISTING destinations (Ask Remy / Add a memory / Add a reminder / Search /
          Insights). Every destination is preserved (memory creation route unchanged) and the
          context query-param is threaded through so care-workspace routing is identical. */}
      <li className="flex flex-1 items-center justify-center">
        <Nest
          remyHref={withContext("/remy")}
          memoryHref={withContext(MOBILE_NEW_ACTION.href)}
          reminderHref={withContext("/reminders")}
          searchHref={withContext("/search")}
          insightsHref={withContext("/insights")}
          memoryCount={memoryCount}
        />
      </li>

      <li className="flex flex-1">
        <Tab
          href={withContext(memories.href)}
          label={memories.label}
          Icon={memories.icon}
          // Don't light up Memories while on the dedicated "New" screen.
          active={
            isNavItemActive(pathname, memories.href) &&
            !isNavItemActive(pathname, MOBILE_NEW_ACTION.href)
          }
        />
      </li>

      {/* "More" → drawer */}
      <li className="flex flex-1">
        <button
          type="button"
          onClick={() => {
            void haptic("light");
            onOpenMore();
          }}
          aria-haspopup="dialog"
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
            moreActive ? "text-sage" : "text-charcoal-muted hover:text-sage"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          <span>More</span>
        </button>
      </li>
    </ul>
  );
}

/**
 * Fixed bottom navigation for mobile (< md). Hosts the primary destinations
 * (Home, Dashboard, Memories) + the center "New" action + a "More" entry that
 * opens the drawer. iOS safe-area inset keeps it clear of the home indicator.
 */
export default function MobileBottomNav({
  onOpenMore,
  memoryCount,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-sand-deep/60 bg-sand/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <Suspense fallback={<div className="h-14" />}>
        <BottomNavContent onOpenMore={onOpenMore} memoryCount={memoryCount} />
      </Suspense>
    </nav>
  );
}
