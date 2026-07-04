"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Remy } from "@/components/remy/Remy";
import { useRemyPresentation, useRemyController } from "./RemyProvider";

/**
 * Remy Platform (v2) — FLOATING PRESENCE (Remy's autonomous, platform-owned home).
 *
 * One of the platform's two render surfaces (the other is opt-in <RemyStage> slots). It shows
 * whenever the resolved presentation is visible (a floating context like a conversation, or a
 * transient moment) and draws the platform-chosen EXPRESSION via the single <Remy> renderer. It
 * makes NO presentation decisions and receives NO business events — only presentation state.
 *
 * Portaled to <body> to escape any `backdrop-filter`/`transform` ancestor (the WebKit
 * containing-block trap in CLAUDE.md). Above content + nav (z-45), below modals (z-50+);
 * `pointer-events-none` layer, only the companion node is tappable. Safe-area aware.
 */
export default function FloatingCompanionLayer() {
  const { presentation, isVisible } = useRemyPresentation();
  const { dismiss } = useRemyController();

  // Keyboard: Escape dismisses the current floating presence (only while visible).
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isVisible, dismiss]);

  if (!isVisible || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-remy-expression={presentation.expression}
      className="pointer-events-none fixed inset-0 z-[45]"
    >
      {/* The companion node — tappable (pointer-events-auto). Tap / Enter / Space / Escape
          dismisses the current presence. Positioned clear of the bottom nav + iOS safe areas.
          Renders the platform-chosen expression (clipped to a circular badge); motion plugs in
          later via the Animation Engine. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss Remy companion"
        className="pointer-events-auto absolute bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sage/10 shadow-lg ring-1 ring-sage/30 backdrop-blur-sm transition active:scale-95"
      >
        <Remy state={presentation.expression} size={64} fit="cover" decorative />
      </button>
    </div>,
    document.body,
  );
}
