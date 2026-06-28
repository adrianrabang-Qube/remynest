/**
 * Remy companion — ANIMATION ABSTRACTION (foundation only).
 *
 * The app calls `play("idle")`, `play("appear")`, … and NEVER knows which engine renders
 * it. Phase 1 ships a dependency-free placeholder controller; Rive / Lottie / CSS / Framer
 * Motion backends implement the SAME `AnimationController` interface and swap in with no
 * change to the provider or any consumer ("do not even import Rive" stays true today).
 */
export const REMY_ANIMATIONS = [
  "idle",
  "appear",
  "return",
  "listen",
  "thinking",
  "celebrate",
] as const;

export type RemyAnimationName = (typeof REMY_ANIMATIONS)[number];

export interface AnimationController {
  /** Start an animation (idempotent if already current). */
  play(name: RemyAnimationName): void;
  /** Stop the current animation. */
  stop(): void;
  /** The currently-playing animation, or null. */
  current(): RemyAnimationName | null;
  /** Whether motion should be suppressed (reduced-motion / low-power). */
  setReducedMotion(reduced: boolean): void;
}

/**
 * Placeholder controller — tracks state, honors reduced-motion, and (in dev) logs. No
 * rendering, no Rive/Lottie import. Replace via `createRemyAnimationController()` selection
 * when a real backend lands; consumers are unaffected.
 */
export function createPlaceholderAnimationController(): AnimationController {
  let currentAnim: RemyAnimationName | null = null;
  let reducedMotion = false;

  return {
    play(name) {
      if (currentAnim === name) return;
      currentAnim = name;
      if (process.env.NODE_ENV !== "production") {
        console.debug("[remy:anim] play", name, { reducedMotion });
      }
    },
    stop() {
      currentAnim = null;
    },
    current() {
      return currentAnim;
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
    },
  };
}

/**
 * Backend selector seam. Phase 1 always returns the placeholder. Phase 2 chooses a real
 * backend here (e.g. Rive) WITHOUT touching the provider or any component.
 */
export function createRemyAnimationController(): AnimationController {
  return createPlaceholderAnimationController();
}
