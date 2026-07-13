"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import ProfileHub from "@/components/profile/ProfileHub";
import { useFocusTrap } from "@/lib/a11y/use-focus-trap";
import { MOBILE_DRAWER_NAV, isNavItemActive } from "./nav-config";
import type { ProfileSummary } from "@/components/profile/types";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileSummary | null;
}

function DrawerLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = searchParams.get("context");
  const withContext = (path: string) =>
    context ? `${path}?context=${context}` : path;

  return (
    <nav aria-label="More navigation" className="space-y-1">
      {MOBILE_DRAWER_NAV.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={withContext(href)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-sage/10 text-sage"
                : "text-charcoal-soft hover:bg-sand"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Mobile "More" drawer (< md). Hosts the secondary nav routes plus the full
 * ProfileHub (settings, billing, support, workspace switching, profile, sign
 * out) — reused verbatim from the desktop dropdown so account access and
 * permissions are identical. Closes on backdrop tap, Escape, or navigation.
 */
export default function MobileNavDrawer({
  open,
  onClose,
  profile,
}: MobileNavDrawerProps) {
  // Focus trap + Escape-to-close + focus restore (shared a11y hook).
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, onClose, panelRef);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div
        className="animate-scrimIn absolute inset-0 bg-charcoal/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-drawerIn absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl"
      >
        {/* Full-height drawer (top-0): pad the header for the status bar / notch
            so "Menu" + close never sit under it (env() is 0 on web → no-op there). */}
        <div className="flex items-center justify-between border-b border-sand-deep/60 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="font-serif text-lg font-semibold text-charcoal">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-full text-charcoal-muted transition hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4">
            <Suspense fallback={null}>
              <DrawerLinks onNavigate={onClose} />
            </Suspense>
          </div>

          {profile && (
            <div className="border-t border-sand-deep/60 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ProfileHub profile={profile} onNavigate={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
