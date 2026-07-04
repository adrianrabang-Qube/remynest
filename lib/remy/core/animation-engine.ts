/**
 * Remy Platform (v2) — ANIMATION ENGINE.
 *
 * The dedicated engine that turns abstract animation CUES (from the presentation) into motion.
 * It consumes `RemyAnimationCue` — never a concrete backend detail — and delegates to a
 * swappable backend behind the existing `AnimationController` seam. Backends (CSS / Framer /
 * Lottie / Rive / sprite-sheets / native) implement the controller and are selected in
 * `createRemyAnimationController()`; no consumer of the engine changes when the backend does.
 *
 * Today the backend is the dependency-free placeholder — so there is no motion yet, only the
 * plumbing that a real backend drops into.
 */
import {
  createRemyAnimationController,
  type AnimationController,
  type RemyAnimationName,
} from "@/lib/remy/companion/animation-controller";
import type { RemyAnimationCue } from "./presentation";

export interface RemyAnimationEngine {
  /** Play an abstract cue (idempotent if already current). */
  play(cue: RemyAnimationCue): void;
  stop(): void;
  current(): RemyAnimationCue | null;
  /** Honor reduced-motion / low-power (suppress motion at the backend). */
  setReducedMotion(reduced: boolean): void;
}

/** Abstract cue → the backend's concrete animation name. Backend-agnostic. */
const CUE_TO_ANIMATION: Record<RemyAnimationCue, RemyAnimationName> = {
  idle: "idle",
  appear: "appear",
  return: "return",
  listen: "listen",
  thinking: "thinking",
  celebrate: "celebrate",
  react: "appear",
};

/** The seam: returns the engine wired to the selected backend. Swap the backend, not this. */
export function createRemyAnimationEngine(): RemyAnimationEngine {
  const backend: AnimationController = createRemyAnimationController();
  let currentCue: RemyAnimationCue | null = null;

  return {
    play(cue) {
      if (cue === currentCue) return;
      currentCue = cue;
      backend.play(CUE_TO_ANIMATION[cue]);
    },
    stop() {
      currentCue = null;
      backend.stop();
    },
    current() {
      return currentCue;
    },
    setReducedMotion(reduced) {
      backend.setReducedMotion(reduced);
    },
  };
}
