"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { haptic } from "@/lib/haptics";

/**
 * Generic Floating Companion Button — the abstraction the future "Nest Button" plugs into.
 *
 * Dual-mode so the slot can be handed over with NO structural change:
 *  - `href`        → renders a Link (preserves navigation, prefetch, memory creation exactly).
 *  - `onActivate`  → renders a button (the Remy tap → opens the help sheet / `toggleRemy()`).
 *
 * `variant` controls the tone WITHOUT touching geometry, so the slot can be handed over with no
 * layout shift:
 *  - "solid" → the brand primary pill (violet since purple-primary, 2026-07-21).
 *  - "nest"  → a clean white pedestal so the purple Companion/Remy avatar reads cleanly.
 *              Geometry, lift, and ring width are identical.
 * The background is set here (not via an appended class) because Tailwind can't reliably
 * override `bg-primary` from the caller's `className`.
 */
// Geometry + a clearly-visible, on-brand keyboard focus ring. The resting ring is set
// per-tone; on `:focus-visible` it turns brand violet so the indicator is obvious against
// the sand nav (purple-primary rule: focus rings are violet, never gold). Both variants
// inherit this.
const GEOMETRY =
  "flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full ring-4 shadow-lg transition active:scale-95 focus-visible:outline-none focus-visible:ring-primary";

const TONE: Record<"solid" | "nest", string> = {
  solid: "bg-primary text-white ring-sand hover:bg-primary-deep",
  // Companion pedestal: still a clean white vessel (the purple avatar must read cleanly),
  // with a soft lavender resting ring per the design-bible ambience.
  nest: "bg-white text-primary ring-remy-lavender/25 hover:bg-remy-mist",
};

export default function FloatingCompanionButton({
  href,
  onActivate,
  label,
  children,
  isActive,
  variant = "solid",
  className = "",
}: {
  href?: string;
  onActivate?: () => void;
  label: string;
  children: ReactNode;
  isActive?: boolean;
  variant?: "solid" | "nest";
  className?: string;
}) {
  const cls = `${GEOMETRY} ${TONE[variant]} ${className}`.trim();

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
