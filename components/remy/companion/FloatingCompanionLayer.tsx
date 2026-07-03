"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Remy, type RemyVariant } from "@/components/remy/Remy";
import type { RemyState } from "@/lib/remy/companion/state";
import { useRemyState, useRemyActions } from "./RemyProvider";

/**
 * Remy companion — FLOATING LAYER: Remy's home.
 *
 * Portaled to <body> so it escapes any `backdrop-filter`/`transform` ancestor (the WebKit
 * containing-block trap documented in CLAUDE.md) and resolves against the viewport. Sits
 * ABOVE app content + the nav (z-45) and BELOW modals (z-50+). The layer is
 * `pointer-events-none` so it never blocks the app; only the companion node is
 * `pointer-events-auto`. Safe-area aware (clears the bottom nav + home indicator + a
 * landscape right-notch). Renders the real Remy artwork via the centralized <Remy>
 * component (single source of truth for the art); the animation controller stays the seam
 * for motion (not yet implemented).
 */

/** Map the companion lifecycle state → a <Remy> expression. */
const STATE_TO_VARIANT: Partial<Record<RemyState, RemyVariant>> = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  talking: "talking",
  celebrating: "celebrating",
  opening: "welcome",
  returning: "goodbye",
};

export default function FloatingCompanionLayer() {
  const { isVisible, currentState } = useRemyState();
  const { closeRemy } = useRemyActions();

  // Keyboard: Escape returns Remy home (only while visible).
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRemy();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isVisible, closeRemy]);

  if (!isVisible || typeof document === "undefined") return null;

  const variant = STATE_TO_VARIANT[currentState] ?? "idle";

  return createPortal(
    <div
      data-remy-state={currentState}
      className="pointer-events-none fixed inset-0 z-[45]"
    >
      {/* The companion node — tappable (pointer-events-auto). Tap / Enter / Space / Escape
          returns Remy home. Positioned clear of the bottom nav + iOS safe areas. Renders the
          registry artwork (clipped to a circular badge); motion plugs in later via the
          AnimationController seam. */}
      <button
        type="button"
        onClick={closeRemy}
        aria-label="Dismiss Remy companion"
        className="pointer-events-auto absolute bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sage/10 shadow-lg ring-1 ring-sage/30 backdrop-blur-sm transition active:scale-95"
      >
        <Remy state={variant} size={64} fit="cover" decorative />
      </button>
    </div>,
    document.body,
  );
}
