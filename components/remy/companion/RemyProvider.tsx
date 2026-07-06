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
import { pickTopContext, type RemyContextKey } from "@/lib/remy/core/events";
import { resolvePresentation } from "@/lib/remy/core/policy-engine";
import type { RemyPresentation } from "@/lib/remy/core/presentation";
import type { RemyEmotion } from "@/lib/remy/core/emotion";
import { createRemyAnimationEngine } from "@/lib/remy/core/animation-engine";
import { createRemyVoiceEngine } from "@/lib/remy/core/voice-engine";
import {
  greetingLine,
  milestoneLine,
  speechForContext,
  speechForMoment,
} from "@/lib/remy/core/speech";

/**
 * Remy Platform (v2) — REACT ADAPTER + LIVING-COMPANION ORCHESTRATION.
 *
 * A thin binding between the framework-agnostic platform (bus → brain → engines) and React. It
 * owns NO policy and NO business logic. Beyond mirroring brain state and resolving a presentation
 * via the Policy Engine, it adds the platform-internal "living" layer: a session greeting, a
 * rate-limited speech line per reaction (with session-adaptive personality), and a rest→sleep
 * transition after inactivity. All of this is PRESENTATION — features never see it.
 *
 * Split state/actions contexts + a stable `children` prop keep the perf contract: Remy activity
 * re-renders only this provider + the floating presence, never the app tree, never a <RemyStage>.
 */

// Timing constants (ms). Tuned to feel alive without being distracting (§ Safety).
const GREETING_DELAY_MS = 1400;
const GREETING_VISIBLE_MS = 5200;
const SPEECH_COOLDOWN_MS = 6000; // rate-limit: Remy speaks at most this often
const SPEECH_VISIBLE_MS = 4200;
const INACTIVITY_MS = 90_000; // rest → sleep after this long idle
const IDLE_CHECK_MS = 15_000;

interface RemyRuntimeState {
  presentation: RemyPresentation;
  /** Floating-presence visibility (policy visibility minus a manual dismiss of the current one). */
  isVisible: boolean;
  /** The current speech-bubble line, or null. */
  speech: string | null;
  /** The current feeling (drives the renderer's one-shot reaction motion). */
  emotion: RemyEmotion;
  /** Changes per reaction so the renderer re-triggers its animation. */
  reactionKey: string | number;
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

  // Living-companion presentation state (platform-internal). Speech is keyed to the reaction it
  // belongs to, so a stale line never shows over a different reaction.
  const [speech, setSpeech] = useState<{ line: string; key: string | number } | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);
  const lastLineRef = useRef<string | null>(null);
  const lastSpeechAtRef = useRef(0);
  const lastActivityRef = useRef(0);

  // Event Bus → Brain.
  useEffect(() => remyEventBus.subscribe((event) => brain.dispatch(event)), [brain]);
  // Brain → React.
  useEffect(() => brain.subscribe(setBrainState), [brain]);

  // Brain state → base presentation (Policy Engine).
  const basePresentation = useMemo(() => resolvePresentation(brainState), [brainState]);
  const signature = signatureOf(basePresentation, brainState);

  // "Adjust state during render" (React-endorsed): once the dismissed presentation is no longer
  // on screen, forget the dismissal so a later re-entry shows Remy again.
  if (dismissedSig !== null && dismissedSig !== signature) {
    setDismissedSig(null);
  }
  const baseVisible = basePresentation.visible && signature !== dismissedSig;

  // Identity of the current reaction (a moment token, else the winning context) — used to
  // re-trigger the renderer animation and to bind a speech line to its reaction.
  const reactionId = brainState.transientToken ?? pickTopContext(brainState.contexts) ?? "idle";

  // Transient moments auto-expire after their policy duration (token-guarded in the brain).
  useEffect(() => {
    const token = brainState.transientToken;
    if (token == null) return;
    const timer = setTimeout(() => brain.clearTransient(token), basePresentation.durationMs ?? 2500);
    return () => clearTimeout(timer);
  }, [brainState.transientToken, basePresentation.durationMs, brain]);

  // Reduced-motion → Animation Engine (also honored in CSS).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => animation.setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [animation]);

  // Drive the (currently placeholder) engines from the reaction cue. CSS is the live backend.
  useEffect(() => {
    if (basePresentation.animationCue) animation.play(basePresentation.animationCue);
    if (basePresentation.voiceCue) voice.speak(basePresentation.voiceCue);
  }, [basePresentation, animation, voice]);

  // Activity timestamp — a ref write in an effect (never during render); resets the idle clock.
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [brainState]);

  // Rest → sleep after inactivity. setState happens only inside the timer callback (not the
  // effect body), so it never triggers cascading-render lint.
  useEffect(() => {
    const id = setInterval(() => {
      setAsleep(Date.now() - lastActivityRef.current > INACTIVITY_MS);
    }, IDLE_CHECK_MS);
    return () => clearInterval(id);
  }, []);

  // Session greeting — appears once, shortly after load.
  useEffect(() => {
    const show = setTimeout(() => {
      const line = greetingLine(lastLineRef.current);
      lastLineRef.current = line;
      setGreeting(line);
    }, GREETING_DELAY_MS);
    return () => clearTimeout(show);
  }, []);
  useEffect(() => {
    if (!greeting) return;
    const hide = setTimeout(() => setGreeting(null), GREETING_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [greeting]);

  // Reaction speech — rate-limited, non-repeating, session-adaptive. Suppressed during greeting.
  // setState is deferred to a timer (never synchronous in the effect body).
  useEffect(() => {
    if (greeting || !baseVisible) return;
    const now = Date.now();
    if (now - lastSpeechAtRef.current < SPEECH_COOLDOWN_MS) return;

    let line: string | null = null;
    const isFirstMemory =
      brainState.transientEvent === "memory.created" && brainState.session.created === 1;
    if (isFirstMemory) {
      line =
        milestoneLine("firstMemoryThisSession", lastLineRef.current) ??
        speechForMoment("memory.created", brainState.session, lastLineRef.current);
    } else if (brainState.transientEvent) {
      line = speechForMoment(brainState.transientEvent, brainState.session, lastLineRef.current);
    } else {
      const ctx = pickTopContext(brainState.contexts);
      if (ctx) line = speechForContext(ctx, lastLineRef.current);
    }
    if (!line) return;

    lastLineRef.current = line;
    lastSpeechAtRef.current = now;
    const chosen = line;
    const show = setTimeout(() => setSpeech({ line: chosen, key: reactionId }), 0);
    return () => clearTimeout(show);
  }, [brainState, baseVisible, greeting, reactionId]);

  // Auto-hide the bubble on ITS OWN lifecycle — decoupled from the cooldown-gated show effect,
  // so a cooldown-blocked re-run of that effect can never orphan a still-visible bubble.
  useEffect(() => {
    if (!speech) return;
    const hide = setTimeout(() => setSpeech(null), SPEECH_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [speech]);

  // Compose the DISPLAYED presentation: greeting overlay > rest/sleep > base reaction.
  const display = useMemo<RemyRuntimeState>(() => {
    if (greeting) {
      return {
        presentation: {
          expression: "welcome",
          visible: true,
          priority: 999,
          animationCue: "appear",
        },
        isVisible: true,
        speech: greeting,
        emotion: "welcoming",
        reactionKey: "greeting",
      };
    }
    if (asleep && baseVisible && brainState.transientToken == null) {
      return {
        presentation: { ...basePresentation, expression: "sleeping", animationCue: "idle" },
        isVisible: true,
        speech: null,
        emotion: "calm",
        reactionKey: "sleep",
      };
    }
    return {
      presentation: basePresentation,
      isVisible: baseVisible,
      speech: speech && speech.key === reactionId ? speech.line : null,
      emotion: brainState.emotion,
      reactionKey: reactionId,
    };
  }, [greeting, asleep, baseVisible, basePresentation, brainState, speech, reactionId]);

  // Latest signature in a ref (synced in an effect) so the stable `dismiss` action can capture
  // the on-screen presentation at click time.
  const signatureRef = useRef(signature);
  useEffect(() => {
    signatureRef.current = signature;
  }, [signature]);

  const actions = useMemo<RemyRuntimeActions>(
    () => ({
      dismiss: () => {
        // Dismiss the on-screen presence: clear a live greeting AND suppress the base presentation.
        setGreeting(null);
        setDismissedSig(signatureRef.current);
      },
    }),
    [],
  );

  return (
    <RemyActionsContext.Provider value={actions}>
      <RemyStateContext.Provider value={display}>
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
 * `context.enter` on mount and `context.exit` on unmount, through the bus. Leak-proof and
 * provider-independent, so <RemyStage> works anywhere.
 */
export function useRemyContext(context: RemyContextKey): void {
  useEffect(() => {
    enterRemyContext(context);
    return () => exitRemyContext(context);
  }, [context]);
}
