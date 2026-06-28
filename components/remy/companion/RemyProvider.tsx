"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { INITIAL_REMY_STATE, type RemyState } from "@/lib/remy/companion/state";
import {
  createRemyAnimationController,
  type AnimationController,
  type RemyAnimationName,
} from "@/lib/remy/companion/animation-controller";

/**
 * Remy companion — GLOBAL PROVIDER (foundation only).
 *
 * Split into TWO contexts on purpose:
 *  - RemyStateContext  → { currentState, isVisible } — CHANGES on open/close.
 *  - RemyActionsContext → { openRemy, closeRemy, toggleRemy, play } — STABLE identity.
 *
 * Performance contract: the actions object never changes, so action-only consumers (the
 * future Nest button) never re-render. State consumers (the Floating layer) re-render on
 * state change. And because `children` is a referentially-stable prop, opening/closing
 * Remy re-renders ONLY this provider + the state consumers — never the app tree.
 *
 * No artwork, no AI, no animation engine here — the controller is an injected interface.
 */

interface RemyStateValue {
  currentState: RemyState;
  isVisible: boolean;
}

interface RemyActionsValue {
  openRemy: () => void;
  closeRemy: () => void;
  toggleRemy: () => void;
  play: (name: RemyAnimationName) => void;
}

const RemyStateContext = createContext<RemyStateValue | null>(null);
const RemyActionsContext = createContext<RemyActionsValue | null>(null);

export function RemyProvider({ children }: { children: ReactNode }) {
  const [currentState, setCurrentState] = useState<RemyState>(INITIAL_REMY_STATE);
  const [isVisible, setIsVisible] = useState(false);

  // Animation backend — created once (lazy state init, never changes), behind the
  // AnimationController interface (Rive/Lottie/CSS later swap here, zero consumer changes).
  const [controller] = useState<AnimationController>(() =>
    createRemyAnimationController(),
  );

  // Mirror isVisible into a ref (synced in an effect, never during render) so toggleRemy
  // can read the latest value at click time WITHOUT becoming a dependency — keeping the
  // actions object stable.
  const isVisibleRef = useRef(isVisible);
  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  // Honor reduced-motion at the controller level — no React state, so no re-render.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => controller.setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [controller]);

  // Stable actions (created once — controller is stable, setters/refs are stable).
  const actions = useMemo<RemyActionsValue>(() => {
    const play = (name: RemyAnimationName) => {
      controller.play(name);
      // Map an animation onto its logical state where unambiguous (Phase 2 extends).
      const map: Partial<Record<RemyAnimationName, RemyState>> = {
        idle: "idle",
        listen: "listening",
        thinking: "thinking",
        celebrate: "celebrating",
      };
      const next = map[name];
      if (next) setCurrentState(next);
    };

    const openRemy = () => {
      setIsVisible(true);
      setCurrentState("idle"); // Phase 1 visible resting state
      controller.play("appear");
    };

    const closeRemy = () => {
      setIsVisible(false);
      setCurrentState("hidden");
      controller.play("return");
    };

    const toggleRemy = () => {
      if (isVisibleRef.current) closeRemy();
      else openRemy();
    };

    return { openRemy, closeRemy, toggleRemy, play };
  }, [controller]);

  const stateValue = useMemo<RemyStateValue>(
    () => ({ currentState, isVisible }),
    [currentState, isVisible],
  );

  return (
    <RemyActionsContext.Provider value={actions}>
      <RemyStateContext.Provider value={stateValue}>
        {children}
      </RemyStateContext.Provider>
    </RemyActionsContext.Provider>
  );
}

/** State (re-renders on change). */
export function useRemyState(): RemyStateValue {
  const ctx = useContext(RemyStateContext);
  if (!ctx) throw new Error("useRemyState must be used within <RemyProvider>");
  return ctx;
}

/** Actions (stable — never triggers a re-render). */
export function useRemyActions(): RemyActionsValue {
  const ctx = useContext(RemyActionsContext);
  if (!ctx) throw new Error("useRemyActions must be used within <RemyProvider>");
  return ctx;
}

/** Convenience: state + actions together. */
export function useRemy(): RemyStateValue & RemyActionsValue {
  return { ...useRemyState(), ...useRemyActions() };
}
