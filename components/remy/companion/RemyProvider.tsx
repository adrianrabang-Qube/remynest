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

import { RemyBrain, type RemyBrainState } from "@/lib/remy/core/brain";
import { remyEventBus } from "@/lib/remy/core/event-bus";
import { enterRemyContext, exitRemyContext, emitRemyEvent } from "@/lib/remy/core/dispatch";
import type { RemyContextKey } from "@/lib/remy/core/events";
import { resolvePresentation } from "@/lib/remy/core/policy-engine";
import type { RemyPresentation } from "@/lib/remy/core/presentation";
import { createRemyAnimationEngine } from "@/lib/remy/core/animation-engine";
import { createRemyVoiceEngine } from "@/lib/remy/core/voice-engine";

/**
 * Remy Platform (v2) — REACT ADAPTER (the runtime host).
 *
 * This is a THIN binding between the framework-agnostic platform (bus → brain → engines) and
 * React. It owns no policy and no presentation logic — it just:
 *   1. instantiates the Brain + Animation/Voice engines once,
 *   2. pipes the Event Bus into the Brain,
 *   3. mirrors the Brain's semantic state into React state,
 *   4. resolves it to a presentation via the Policy Engine, and
 *   5. drives the engines from that presentation.
 * Swap React for another host (SwiftUI bridge, etc.) by writing a different adapter over the
 * SAME core — no core, feature, or page change.
 *
 * Split state/actions contexts + a stable `children` prop keep the perf contract: Remy activity
 * re-renders only this provider + its presentation consumers (the floating layer), never the
 * app tree, never a <RemyStage> (which subscribes to nothing that changes here).
 */

interface RemyRuntimeState {
  presentation: RemyPresentation;
  /** Floating-presence visibility (policy visibility minus a manual dismiss of the current one). */
  isVisible: boolean;
}
interface RemyRuntimeActions {
  /** Dismiss the CURRENTLY-shown floating presence; it returns on the next distinct presentation. */
  dismiss: () => void;
}

const RemyStateContext = createContext<RemyRuntimeState | null>(null);
const RemyActionsContext = createContext<RemyRuntimeActions | null>(null);

/** A stable identity for "the presentation currently on screen" (for dismiss bookkeeping). */
function signatureOf(presentation: RemyPresentation, brain: RemyBrainState): string {
  return `${presentation.expression}|${presentation.priority}|${brain.transientToken ?? "ctx"}`;
}

export function RemyProvider({ children }: { children: ReactNode }) {
  const [brain] = useState(() => new RemyBrain());
  const [animation] = useState(() => createRemyAnimationEngine());
  const [voice] = useState(() => createRemyVoiceEngine());
  // Seed from the brain (empty on first mount → idle/hidden, SSR-safe); the effect keeps it live.
  const [brainState, setBrainState] = useState<RemyBrainState>(() => brain.getState());
  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  // Event Bus → Brain.
  useEffect(() => remyEventBus.subscribe((event) => brain.dispatch(event)), [brain]);

  // Brain → React.
  useEffect(() => brain.subscribe(setBrainState), [brain]);

  // Brain state → resolved presentation (Policy Engine).
  const presentation = useMemo(() => resolvePresentation(brainState), [brainState]);
  const signature = signatureOf(presentation, brainState);

  // "Adjust state during render" (React-endorsed): once the dismissed presentation is no longer
  // the one on screen, forget the dismissal — so a later re-entry of the same sticky context
  // shows Remy again instead of staying suppressed forever.
  if (dismissedSig !== null && dismissedSig !== signature) {
    setDismissedSig(null);
  }

  const isVisible = presentation.visible && signature !== dismissedSig;

  // Drive the engines from the presentation (platform-owned; features never do this).
  useEffect(() => {
    if (presentation.animationCue) animation.play(presentation.animationCue);
    if (presentation.voiceCue) voice.speak(presentation.voiceCue);
  }, [presentation, animation, voice]);

  // Transient moments auto-expire after their policy duration (token-guarded in the brain).
  useEffect(() => {
    const token = brainState.transientToken;
    if (token == null) return;
    const timer = setTimeout(() => brain.clearTransient(token), presentation.durationMs ?? 2500);
    return () => clearTimeout(timer);
  }, [brainState.transientToken, presentation.durationMs, brain]);

  // Reduced-motion → Animation Engine (no React state, no re-render).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => animation.setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [animation]);

  // Latest signature in a ref (synced in an effect, never read/written during render) so the
  // stable `dismiss` action can capture the on-screen presentation at click time.
  const signatureRef = useRef(signature);
  useEffect(() => {
    signatureRef.current = signature;
  }, [signature]);

  const actions = useMemo<RemyRuntimeActions>(
    () => ({ dismiss: () => setDismissedSig(signatureRef.current) }),
    [],
  );

  const stateValue = useMemo<RemyRuntimeState>(
    () => ({ presentation, isVisible }),
    [presentation, isVisible],
  );

  return (
    <RemyActionsContext.Provider value={actions}>
      <RemyStateContext.Provider value={stateValue}>
        {children}
      </RemyStateContext.Provider>
    </RemyActionsContext.Provider>
  );
}

/** Resolved presentation + visibility (re-renders on change). For render surfaces only. */
export function useRemyPresentation(): RemyRuntimeState {
  const ctx = useContext(RemyStateContext);
  if (!ctx) throw new Error("useRemyPresentation must be used within <RemyProvider>");
  return ctx;
}

/**
 * Manual control of the floating presence. `emit` / `enter` / `exit` post to the Event Bus and
 * work with or without a provider; `dismiss` requires the provider (no-op otherwise).
 */
export function useRemyController() {
  const actions = useContext(RemyActionsContext);
  return useMemo(
    () => ({
      emit: emitRemyEvent,
      enter: enterRemyContext,
      exit: exitRemyContext,
      dismiss: actions?.dismiss ?? (() => {}),
    }),
    [actions],
  );
}

/** Convenience: the stable `emit(name, payload?)` function. */
export function useRemyEmit() {
  return emitRemyEvent;
}

/**
 * Declaratively hold a sticky CONTEXT while the calling component is mounted — emits
 * `context.enter` on mount and `context.exit` on unmount, through the bus. Leak-proof (a page
 * can't forget to exit) and provider-independent, so <RemyStage> works anywhere.
 */
export function useRemyContext(context: RemyContextKey): void {
  useEffect(() => {
    enterRemyContext(context);
    return () => exitRemyContext(context);
  }, [context]);
}
