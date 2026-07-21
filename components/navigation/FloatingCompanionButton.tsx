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
 *  - "solid"    → the brand primary pill (violet since purple-primary, 2026-07-21).
 *  - "nest"     → a clean white pedestal so the purple Companion/Remy avatar reads cleanly
 *                 (the WOKEN Nest state).
 *  - "nest-art" → FULL-BLEED artwork vessel (the RESTING Nest, 2026-07-21 operator fix):
 *                 no resting ring and no visible pedestal — the nest art itself IS the
 *                 button face, so evolution art reads edge-to-edge. The keyboard focus
 *                 ring still appears on :focus-visible.
 * Geometry and lift are identical across variants (ring is box-shadow — no layout shift).
 * The background is set here (not via an appended class) because Tailwind can't reliably
 * override `bg-primary` from the caller's `className`.
 */
// Geometry + a clearly-visible, on-brand keyboard focus ring. Ring WIDTH lives per-tone so
// the art vessel can rest ringless; `focus-visible:ring-4` guarantees the indicator on every
// variant, and it turns brand violet (purple-primary rule: focus rings are violet, never
// gold).
const GEOMETRY =
  "flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full shadow-lg transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary";

const TONE: Record<"solid" | "nest" | "nest-art", string> = {
  solid: "ring-4 bg-primary text-white ring-sand hover:bg-primary-deep",
  // Companion pedestal (woken): a clean white vessel (the purple avatar must read cleanly),
  // with a soft lavender ring per the design-bible ambience.
  nest: "ring-4 bg-white text-primary ring-remy-lavender/25 hover:bg-remy-mist",
  // Resting art vessel: the artwork covers the whole face; white stays only as the
  // image-load fallback beneath the cover-cropped art.
  "nest-art": "bg-white text-primary",
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
  variant?: "solid" | "nest" | "nest-art";
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
