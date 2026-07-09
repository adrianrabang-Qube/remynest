"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  NEST_GREETING_BEHAVIOR,
  NEST_RESTING_BEHAVIOR,
  NEST_RETURN_SEQUENCE,
  NEST_WAKE_SEQUENCE,
  resolveBehaviorLook,
  type NestStep,
  type RemyBehavior,
  type RemyBehaviorLook,
} from "@/lib/remy";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface NestInteraction {
  /** Remy's current platform BEHAVIOUR (never a menu/UI state). */
  behavior: RemyBehavior;
  /** The resolved look for the current behaviour (expression / emotion / animation). */
  look: RemyBehaviorLook;
  /** True while Remy is presenting actions (greeting) — the menu is a CONSEQUENCE of this. */
  presentsActions: boolean;
  /** True mid-wake (waking / peeking / emerging) — drives the one-shot wake motion. */
  isWaking: boolean;
  /** True while Remy rests in the Nest (asleep / at rest). */
  isResting: boolean;
  /** Wake Remy: play the wake choreography (or jump to greeting under reduced motion). */
  wake: () => void;
  /** Send Remy home: play the return choreography (dismiss — no navigation follows). */
  sendHome: () => void;
  /** An action was chosen — Remy returns home; navigation follows. */
  chooseAction: () => void;
}

/**
 * The Nest interaction — a PLAYER for the platform's Nest choreography (`@/lib/remy`). It advances
 * Remy through the platform BEHAVIOUR sequences (wake / return home), honouring
 * `prefers-reduced-motion`, and exposes Remy's current behaviour + its resolved look. It defines
 * NO Remy vocabulary and NO transitions of its own — those live in the ONE Remy platform
 * (`lib/remy/core/{behavior,nest}.ts`); this hook only schedules the timed beats. `onBehaviorChange`
 * is a leak-proof seam for FUTURE platform integration (e.g. `Remy.emit`) — reported, not wired.
 */
export function useNestInteraction(options?: {
  onBehaviorChange?: (behavior: RemyBehavior) => void;
}): NestInteraction {
  const [behavior, setBehavior] = useState<RemyBehavior>(NEST_RESTING_BEHAVIOR);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onBehaviorChangeRef = useRef(options?.onBehaviorChange);
  useEffect(() => {
    onBehaviorChangeRef.current = options?.onBehaviorChange;
  });

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Play a platform choreography: the first beat is immediate; each later beat fires at the sum of
  // the prior beats' durations; the final (durationMs 0) beat is sticky until the next input.
  const play = useCallback(
    (sequence: readonly NestStep[]) => {
      clearTimers();
      let elapsed = 0;
      sequence.forEach((step, index) => {
        if (index === 0) {
          setBehavior(step.behavior);
        } else {
          timers.current.push(
            setTimeout(() => setBehavior(step.behavior), elapsed),
          );
        }
        elapsed += step.durationMs;
      });
    },
    [clearTimers],
  );

  const wake = useCallback(() => {
    if (prefersReducedMotion()) {
      clearTimers();
      setBehavior(NEST_GREETING_BEHAVIOR); // straight to greeting, no animation
      return;
    }
    play(NEST_WAKE_SEQUENCE);
  }, [clearTimers, play]);

  const sendHome = useCallback(() => {
    if (prefersReducedMotion()) {
      clearTimers();
      setBehavior(NEST_RESTING_BEHAVIOR); // straight home, no animation
      return;
    }
    play(NEST_RETURN_SEQUENCE);
  }, [clearTimers, play]);

  const chooseAction = useCallback(() => sendHome(), [sendHome]);

  // Report behaviour changes (future platform seam) + never leave a timer running past unmount.
  useEffect(() => {
    onBehaviorChangeRef.current?.(behavior);
  }, [behavior]);
  useEffect(() => () => clearTimers(), [clearTimers]);

  const look = resolveBehaviorLook(behavior);
  return {
    behavior,
    look,
    presentsActions: Boolean(look.presentsActions),
    isWaking:
      behavior === "waking" || behavior === "peeking" || behavior === "emerging",
    isResting: behavior === "resting" || behavior === "sleeping",
    wake,
    sendHome,
    chooseAction,
  };
}
