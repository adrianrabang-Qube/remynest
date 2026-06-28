"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useRemyState, useRemyActions } from "./RemyProvider";

/**
 * Remy companion — FLOATING LAYER (foundation only): Remy's home.
 *
 * Portaled to <body> so it escapes any `backdrop-filter`/`transform` ancestor (the WebKit
 * containing-block trap documented in CLAUDE.md) and resolves against the viewport. Sits
 * ABOVE app content + the nav (z-45) and BELOW modals (z-50+). The layer is
 * `pointer-events-none` so it never blocks the app; only the companion node is
 * `pointer-events-auto`. Safe-area aware (clears the bottom nav + home indicator + a
 * landscape right-notch). Phase 1 renders a NEUTRAL placeholder (no artwork) that the
 * asset registry + animation controller replace in Phase 2.
 */
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

  return createPortal(
    <div
      data-remy-state={currentState}
      className="pointer-events-none fixed inset-0 z-[45]"
    >
      {/* The companion node — tappable (pointer-events-auto). Tap / Enter / Space / Escape
          returns Remy home. Positioned clear of the bottom nav + iOS safe areas. The inner
          content is the PLACEHOLDER; Phase 2 swaps in the registry asset + animation. */}
      <button
        type="button"
        onClick={closeRemy}
        aria-label="Dismiss Remy companion"
        className="pointer-events-auto absolute bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex h-16 w-16 items-center justify-center rounded-full bg-sage/15 text-xs font-medium text-sage-deep ring-1 ring-sage/30 backdrop-blur-sm transition active:scale-95"
      >
        Remy
      </button>
    </div>,
    document.body,
  );
}
