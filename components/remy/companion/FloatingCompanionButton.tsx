"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { haptic } from "@/lib/haptics";

/**
 * Generic Floating Companion Button — the abstraction the future "Nest Button" plugs into.
 *
 * Dual-mode so the slot can be handed over with NO structural change:
 *  - `href`        → renders a Link (TODAY: the "+" → /memories/new — preserves navigation,
 *                    prefetch, and memory creation exactly).
 *  - `onActivate`  → renders a button (LATER: the Nest tap → `toggleRemy()`).
 * Same prominent circular styling either way; the icon/children are replaced by the asset
 * registry when artwork lands. Deliberately has NO Remy dependency in Phase 1.
 */
const BASE =
  "flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-sage text-white shadow-lg ring-4 ring-sand transition hover:bg-sage-deep active:scale-95";

export default function FloatingCompanionButton({
  href,
  onActivate,
  label,
  children,
  isActive,
  className = "",
}: {
  href?: string;
  onActivate?: () => void;
  label: string;
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}) {
  const cls = `${BASE} ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => haptic("medium")}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={cls}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void haptic("medium");
        onActivate?.();
      }}
      aria-label={label}
      aria-pressed={isActive}
      className={cls}
    >
      {children}
    </button>
  );
}
