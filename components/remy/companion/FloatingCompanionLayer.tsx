"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { Remy } from "@/components/remy/Remy";
import styles from "@/components/remy/motion.module.css";
import { useRemyPresentation, useRemyController } from "./RemyProvider";

/**
 * Remy Platform (v2) — FLOATING PRESENCE (Remy's autonomous, platform-owned home).
 *
 * One of the platform's two render surfaces (the other is opt-in <RemyStage> slots). It shows
 * whenever the resolved presentation is visible and draws the platform-chosen expression + motion
 * + speech via the single <Remy> renderer. It makes NO presentation decisions and receives NO
 * business events — only presentation state.
 *
 * Safety (§): the layer is `pointer-events-none` so it NEVER blocks scrolling, forms, or buttons
 * — only the small companion badge is tappable. The speech bubble is non-interactive. Everything
 * is anchored in the bottom-right, clear of the nav + iOS safe areas, below modals (z-45).
 *
 * Portaled to <body> to escape any `backdrop-filter`/`transform` ancestor (the WebKit
 * containing-block trap in CLAUDE.md).
 */
export default function FloatingCompanionLayer() {
  const { presentation, isVisible, speech, emotion, reactionKey } = useRemyPresentation();
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
      <div className="absolute bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex flex-row-reverse items-end gap-2">
        {/* The companion badge — the only tappable node. Tap / Enter / Space / Escape dismisses. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Remy companion"
          className="pointer-events-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 shadow-lg ring-1 ring-primary/30 backdrop-blur-sm transition active:scale-95"
        >
          <Remy
            state={presentation.expression}
            assetVariant="avatar"
            emotion={emotion}
            reactionKey={reactionKey}
            float
            size={64}
            fit="cover"
            decorative
          />
        </button>

        {/* Speech bubble — non-interactive, announced politely. */}
        {speech && (
          <div
            aria-live="polite"
            className={`pointer-events-none mb-1 max-w-[13rem] rounded-2xl rounded-br-sm bg-white/95 px-3 py-2 text-sm font-medium text-charcoal shadow-lg ring-1 ring-sand-deep/40 backdrop-blur-sm ${styles.bubble}`}
          >
            {speech}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
