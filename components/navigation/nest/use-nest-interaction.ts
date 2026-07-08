"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { NEST_TIMING } from "./nest-animations";
import {
  NEST_VISUALS,
  nestTransition,
  type NestEvent,
  type NestPhase,
  type NestPhaseVisual,
} from "./nest-state-machine";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface NestInteraction {
  phase: NestPhase;
  visual: NestPhaseVisual;
  isMenuOpen: boolean;
  /** Mid-wake (peek / popout) — drives the one-shot wake animation on the pedestal. */
  isWaking: boolean;
  /** Begin the wake sequence (or open instantly under reduced motion). */
  open: () => void;
  /** Close via backdrop / Escape / breakpoint — Remy settles back into the nest. */
  dismiss: () => void;
  /** A menu item was chosen — same settle, but navigation follows. */
  select: () => void;
}

/**
 * React binding for the pure Nest interaction FSM (`nest-state-machine.ts`). Owns the phase state
 * and schedules the timed wake/return advances, respecting `prefers-reduced-motion`. Presentation
 * stays declarative in the components; timing lives in `nest-animations.ts`; the transition rules
 * live in the pure FSM — this hook only wires them together.
 *
 * `onPhaseChange` is a leak-proof seam for FUTURE platform integration (e.g. `Remy.emit(...)` so
 * the wider companion reacts when the Nest opens). It is deliberately NOT wired to the platform
 * today — no deferred AI/conversation is built here — only reported.
 */
export function useNestInteraction(options?: {
  onPhaseChange?: (phase: NestPhase) => void;
}): NestInteraction {
  const [phase, setPhase] = useState<NestPhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onPhaseChangeRef = useRef(options?.onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = options?.onPhaseChange;
  });

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const fire = useCallback(
    (event: NestEvent) => setPhase((p) => nestTransition(p, event)),
    [],
  );

  const open = useCallback(() => {
    clearTimers();
    if (prefersReducedMotion()) {
      fire("REDUCED_TAP"); // → menuOpen, no animation
      return;
    }
    fire("TAP"); // idle → peek
    timers.current.push(
      setTimeout(() => fire("PEEK_DONE"), NEST_TIMING.peekMs), // peek → popout
    );
    timers.current.push(
      setTimeout(
        () => fire("POP_DONE"), // popout → menuOpen
        NEST_TIMING.peekMs + NEST_TIMING.popMs,
      ),
    );
  }, [clearTimers, fire]);

  const settle = useCallback(
    (event: Extract<NestEvent, "DISMISS" | "SELECT">) => {
      clearTimers();
      if (prefersReducedMotion()) {
        fire("RESET"); // → idle instantly
        return;
      }
      fire(event); // menuOpen → returnHome
      timers.current.push(
        setTimeout(() => fire("RETURN_DONE"), NEST_TIMING.returnMs), // returnHome → idle
      );
    },
    [clearTimers, fire],
  );

  const dismiss = useCallback(() => settle("DISMISS"), [settle]);
  const select = useCallback(() => settle("SELECT"), [settle]);

  // Report phase changes (future platform seam) after each render that changed it.
  useEffect(() => {
    onPhaseChangeRef.current?.(phase);
  }, [phase]);

  // Never leave a timer running past unmount.
  useEffect(() => () => clearTimers(), [clearTimers]);

  const visual = NEST_VISUALS[phase];
  return {
    phase,
    visual,
    isMenuOpen: visual.menuOpen,
    isWaking: phase === "peek" || phase === "popout",
    open,
    dismiss,
    select,
  };
}
