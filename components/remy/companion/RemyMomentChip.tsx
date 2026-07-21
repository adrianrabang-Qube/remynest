"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import RemyRenderer, { type RemyVariant } from "@/components/remy/Remy";
import type { RemyEmotion } from "@/lib/remy";

/**
 * The shared proactive-moment CHIP — Remy + a short line in a calm, dismissible pill above the nav.
 * ONE implementation shared by every companion surface (RemyMoments, RemyRelationship) so there is
 * no duplicated overlay/animation logic. Portaled to <body> (WebKit containing-block), container is
 * `pointer-events-none` with only the tap-to-dismiss chip interactive, `aria-live` polite, and
 * reduced-motion-safe (fade only). AnimatePresence retains the exiting element so the fade-out keeps
 * its text even after the parent clears the moment.
 */
export default function RemyMomentChip({
  visible,
  expression,
  emotion,
  reactionKey,
  message,
  onDismiss,
}: {
  visible: boolean;
  expression: RemyVariant;
  emotion?: RemyEmotion;
  reactionKey: string | number;
  message: string;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[54] flex justify-center px-4 lg:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={onDismiss}
            aria-label={`${message} — dismiss`}
            className="pointer-events-auto flex max-w-[22rem] items-center gap-3 rounded-full bg-white/95 py-2 pl-2 pr-4 text-left shadow-soft-lg ring-1 ring-remy-lavender/30 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={
              reduce ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 26 }
            }
          >
            <RemyRenderer
              state={expression}
              assetVariant="avatar"
              emotion={emotion}
              reactionKey={reactionKey}
              size={40}
              decorative
            />
            <span className="text-sm font-medium text-charcoal">{message}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
