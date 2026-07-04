"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Remy } from "@/components/remy/Remy";
import { useRemyState, useRemyActions } from "./RemyProvider";

/**
 * Remy Platform — FLOATING PRESENCE (Remy's autonomous, platform-owned home).
 *
 * One of the platform's two render surfaces (the other is opt-in <RemyStage> slots). It shows
 * whenever the platform's resolved presentation is visible (a scene/signal that "takes the
 * stage", or a manual open) and renders the platform-chosen EXPRESSION via the single <Remy>
 * renderer — it makes NO presentation decisions of its own.
 *
 * Portaled to <body> so it escapes any `backdrop-filter`/`transform` ancestor (the WebKit
 * containing-block trap in CLAUDE.md) and resolves against the viewport. Sits ABOVE app
 * content + nav (z-45) and BELOW modals (z-50+); `pointer-events-none` layer so it never
 * blocks the app, only the companion node is tappable. Safe-area aware.
 */
export default function FloatingCompanionLayer() {
  const { isVisible, presentation, activeScene } = useRemyState();
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
      data-remy-scene={activeScene}
      data-remy-expression={presentation.expression}
      className="pointer-events-none fixed inset-0 z-[45]"
    >
      {/* The companion node — tappable (pointer-events-auto). Tap / Enter / Space / Escape
          returns Remy home. Positioned clear of the bottom nav + iOS safe areas. Renders the
          platform-chosen expression (clipped to a circular badge); motion plugs in later via
          the AnimationController seam. */}
      <button
        type="button"
        onClick={closeRemy}
        aria-label="Dismiss Remy companion"
        className="pointer-events-auto absolute bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sage/10 shadow-lg ring-1 ring-sage/30 backdrop-blur-sm transition active:scale-95"
      >
        <Remy state={presentation.expression} size={64} fit="cover" decorative />
      </button>
    </div>,
    document.body,
  );
}
