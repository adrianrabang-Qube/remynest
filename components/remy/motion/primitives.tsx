"use client";

import type { Variants } from "framer-motion";

/**
 * Centralized Remy/Nest MOTION vocabulary (framer-motion).
 *
 * The single home for the companion's interaction motion — every Remy/Nest surface imports these
 * variants so there is NO duplicated animation logic. Ambient loops (idle glow / breathing /
 * particles) live in CSS (perf: cheap infinite loops); framer-motion drives the one-shot
 * INTERACTION transitions (Remy opening the Nest, emerging to greet, offering actions).
 *
 * Reduced motion is honoured at each call site via framer-motion's `useReducedMotion()` — pass
 * `initial={reduce ? false : "hidden"}` so no enter animation plays for users who ask for less.
 */

/** The scrim behind the Nest — a soft fade, never a hard modal flash. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
};

/**
 * The Nest surface itself — Remy OPENING the Nest, not a system bottom-sheet snapping up. Rises
 * and settles with a soft spring.
 */
export const nestSheetVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 28, mass: 0.9 },
  },
};

/** Remy emerging to greet — a gentle pop after the Nest opens. */
export const remyEmergeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 340, damping: 18, delay: 0.06 },
  },
};

/**
 * Remy OFFERING the actions — they arrive one after another (staggered), so it reads as Remy
 * presenting options, not a menu list appearing at once.
 */
export const offerListVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.14 } },
};

export const offerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 30 },
  },
};
