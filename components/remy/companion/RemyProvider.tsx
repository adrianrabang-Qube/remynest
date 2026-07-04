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
import { scenePriority, type RemyScene, type RemySignal } from "@/lib/remy/platform/scenes";
import {
  presentationForScene,
  presentationForSignal,
  IDLE_PRESENTATION,
  type RemyPresentation,
} from "@/lib/remy/platform/policy";

/**
 * Remy Platform — RUNTIME PROVIDER.
 *
 * This is the platform "brain": application-wide, mounted once (in the (app) layout), it owns
 * ALL of Remy's state and turns semantic input into a resolved presentation. The UI never
 * touches artwork — it emits SCENES (sticky, via `useRemyScene`) and SIGNALS (transient, via
 * `useRemySignal`); this provider arbitrates them through the presentation POLICY and exposes
 * the resolved look. Rendering happens elsewhere (the floating layer + <RemyStage> slots),
 * always through the single <Remy> renderer.
 *
 * Split into TWO contexts on purpose (performance contract, preserved from the foundation):
 *  - RemyStateContext   → { presentation, activeScene, isVisible, currentState } — CHANGES.
 *  - RemyActionsContext → scene/signal/manual controls — STABLE identity.
 * `children` is a referentially-stable prop, so a scene registering or a signal firing
 * re-renders ONLY this provider + its state consumers (the floating layer) — never the app
 * tree, never a <RemyStage> (which lives in `children`).
 *
 * The animation backend stays behind the injected `AnimationController` interface (Rive /
 * Lottie / CSS / Framer swap in with no consumer change). No AI, no artwork here.
 */

export interface RemyPlatformState {
  /** The resolved active presentation (expression + visibility) per the policy. */
  presentation: RemyPresentation;
  /** The winning scene context (highest priority active scene, or "idle"). */
  activeScene: RemyScene;
  /** Whether the floating presence should render (manual open OR the policy asks for it). */
  isVisible: boolean;
  /** Legacy lifecycle state — kept for the AnimationController + data attributes. */
  currentState: RemyState;
}

export interface RemyPlatformActions {
  /** Register a sticky scene; returns an id to unregister with. (Used by `useRemyScene`.) */
  registerScene: (scene: RemyScene) => number;
  /** Remove a previously-registered scene. */
  unregisterScene: (id: number) => void;
  /** Fire a transient signal; the platform auto-expires it. */
  signal: (signal: RemySignal) => void;
  /** Manually show the floating presence. */
  openRemy: () => void;
  /** Manually hide the floating presence. */
  closeRemy: () => void;
  /** Toggle the floating presence. */
  toggleRemy: () => void;
  /** Drive the animation backend directly (advanced / future use). */
  play: (name: RemyAnimationName) => void;
}

const RemyStateContext = createContext<RemyPlatformState | null>(null);
const RemyActionsContext = createContext<RemyPlatformActions | null>(null);

export function RemyProvider({ children }: { children: ReactNode }) {
  // Legacy lifecycle state (drives the AnimationController + a data attribute).
  const [currentState, setCurrentState] = useState<RemyState>(INITIAL_REMY_STATE);
  // Manual floating-presence override (openRemy/closeRemy/toggleRemy).
  const [manualOpen, setManualOpen] = useState(false);
  // Active transient signal (auto-expires). Carries a nonce so firing the SAME signal value
  // again is a distinct state (identity changes) — the expiry effect re-runs and refreshes the
  // display window rather than riding the original timer.
  const [activeSignal, setActiveSignal] = useState<{
    signal: RemySignal;
    nonce: number;
  } | null>(null);
  const signalNonceRef = useRef(0);

  // Sticky scene stack — held in state (immutably updated) so the derived presentation reads
  // a real dependency (never a ref during render). The id counter is a ref: it is only
  // written from register (an effect callback), never read during render.
  const [sceneStack, setSceneStack] = useState<Map<number, RemyScene>>(() => new Map());
  const sceneIdRef = useRef(1);

  // Animation backend — created once (never changes), behind the AnimationController seam.
  const [controller] = useState<AnimationController>(() => createRemyAnimationController());

  // Mirror manualOpen into a ref so toggleRemy reads the latest value at call time WITHOUT
  // becoming a dependency (keeps the actions object stable).
  const manualOpenRef = useRef(manualOpen);
  useEffect(() => {
    manualOpenRef.current = manualOpen;
  }, [manualOpen]);

  // Honor reduced-motion at the controller level — no React state, so no re-render.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => controller.setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [controller]);

  // Transient signals auto-expire after their policy duration. The effect keys on the whole
  // object, so each fire (new nonce) resets the timer — even for a repeated identical signal.
  useEffect(() => {
    if (!activeSignal) return;
    const { durationMs } = presentationForSignal(activeSignal.signal);
    const timer = setTimeout(() => setActiveSignal(null), durationMs ?? 2500);
    return () => clearTimeout(timer);
  }, [activeSignal]);

  // Stable actions (created once — controller, setters and refs are all stable).
  const actions = useMemo<RemyPlatformActions>(() => {
    const registerScene = (scene: RemyScene) => {
      const id = sceneIdRef.current++;
      setSceneStack((prev) => {
        const next = new Map(prev);
        next.set(id, scene);
        return next;
      });
      return id;
    };
    const unregisterScene = (id: number) => {
      setSceneStack((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    };
    const signal = (sig: RemySignal) =>
      setActiveSignal({ signal: sig, nonce: ++signalNonceRef.current });

    const play = (name: RemyAnimationName) => {
      controller.play(name);
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
      setManualOpen(true);
      setCurrentState("idle");
      controller.play("appear");
    };
    const closeRemy = () => {
      setManualOpen(false);
      setCurrentState("hidden");
      controller.play("return");
    };
    const toggleRemy = () => {
      if (manualOpenRef.current) closeRemy();
      else openRemy();
    };

    return { registerScene, unregisterScene, signal, openRemy, closeRemy, toggleRemy, play };
  }, [controller]);

  // Resolve the active presentation: a live signal wins; otherwise the highest-priority
  // active scene; otherwise idle.
  const { presentation, activeScene } = useMemo<{
    presentation: RemyPresentation;
    activeScene: RemyScene;
  }>(() => {
    let topScene: RemyScene = "idle";
    let topPriority = -Infinity;
    for (const scene of sceneStack.values()) {
      const p = scenePriority(scene);
      if (p > topPriority) {
        topPriority = p;
        topScene = scene;
      }
    }
    const resolved = activeSignal
      ? presentationForSignal(activeSignal.signal)
      : presentationForScene(topScene);
    return { presentation: resolved ?? IDLE_PRESENTATION, activeScene: topScene };
  }, [sceneStack, activeSignal]);

  const isVisible = manualOpen || presentation.visible;

  const stateValue = useMemo<RemyPlatformState>(
    () => ({ presentation, activeScene, isVisible, currentState }),
    [presentation, activeScene, isVisible, currentState],
  );

  return (
    <RemyActionsContext.Provider value={actions}>
      <RemyStateContext.Provider value={stateValue}>
        {children}
      </RemyStateContext.Provider>
    </RemyActionsContext.Provider>
  );
}

/** Resolved platform state (re-renders on change). */
export function useRemyState(): RemyPlatformState {
  const ctx = useContext(RemyStateContext);
  if (!ctx) throw new Error("useRemyState must be used within <RemyProvider>");
  return ctx;
}

/** Platform actions (stable identity — never triggers a re-render). */
export function useRemyActions(): RemyPlatformActions {
  const ctx = useContext(RemyActionsContext);
  if (!ctx) throw new Error("useRemyActions must be used within <RemyProvider>");
  return ctx;
}

/** Convenience: state + actions together. */
export function useRemy(): RemyPlatformState & RemyPlatformActions {
  return { ...useRemyState(), ...useRemyActions() };
}

/**
 * Declaratively contribute a SCENE while the calling component is mounted. This is how the UI
 * "emits" a sticky context — the page names a semantic scene, never an expression. Tolerant
 * of a missing provider (no-op) so <RemyStage> can render anywhere. Re-registers if the scene
 * changes; always cleans up on unmount.
 */
export function useRemyScene(scene: RemyScene): void {
  const actions = useContext(RemyActionsContext);
  useEffect(() => {
    if (!actions) return;
    const id = actions.registerScene(scene);
    return () => actions.unregisterScene(id);
  }, [actions, scene]);
}

/**
 * Emit transient SIGNALS. Returns a stable `signal(...)` function; a no-op if no provider is
 * mounted, so feature code can call it unconditionally.
 */
export function useRemySignal(): (signal: RemySignal) => void {
  const actions = useContext(RemyActionsContext);
  return actions?.signal ?? NOOP_SIGNAL;
}

const NOOP_SIGNAL: (signal: RemySignal) => void = () => {};
