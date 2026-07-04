import type { RemyVariant } from "@/components/remy/Remy";
import type { RemyScene, RemySignal } from "@/lib/remy/platform/scenes";

/**
 * Remy Platform — PRESENTATION POLICY.
 *
 * The SINGLE place that decides how a semantic moment LOOKS and BEHAVES. Pages never choose
 * an expression; they name a scene/signal (see `scenes.ts`) and this module maps it to a
 * presentation. Because every Remy in the app resolves its look here, swapping this file
 * (e.g. for a future emotion engine, seasonal theme, or A/B test) re-skins the entire app
 * with ZERO changes to pages, the provider, or the renderer.
 *
 * `RemyPresentation` is intentionally forward-compatible: new fields (animation cue, voice
 * line, gesture, position, emotion) are ADDITIVE — consumers read what they understand and
 * ignore the rest, so richer behavior lands without breaking callers.
 */
export interface RemyPresentation {
  /** Which `<Remy>` expression variant renders (mapped to a registry key by the renderer). */
  expression: RemyVariant;
  /** Whether the platform's floating presence should show itself for this moment. */
  visible: boolean;
  /** Signals only: auto-expire after this many ms (the platform clears the signal). */
  durationMs?: number;
  // FUTURE (additive — no consumer change required):
  //   animationCue?: RemyAnimationName;   // drive the AnimationController
  //   voiceLineId?: string;               // future voice / TTS
  //   gesture?: RemyGesture;              // future rigged gestures
  //   emotion?: RemyEmotion;              // future emotion engine
  //   position?: RemyPosition;            // platform-owned placement hints
}

/**
 * Scene → presentation. Scenes are sticky contexts; most keep the floating presence hidden
 * because a page usually renders them in-place via <RemyStage>. Scenes that are genuinely
 * "Remy takes the stage" (e.g. an open conversation) request visibility.
 */
const SCENE_POLICY: Record<RemyScene, RemyPresentation> = {
  idle: { expression: "idle", visible: false },
  loading: { expression: "searching", visible: false },
  welcome: { expression: "welcome", visible: false },
  empty: { expression: "welcome", visible: false },
  "empty.memories": { expression: "welcome", visible: false },
  "empty.people": { expression: "welcome", visible: false },
  searching: { expression: "searching", visible: false },
  "search.empty": { expression: "confused", visible: false },
  conversation: { expression: "talking", visible: true },
  error: { expression: "confused", visible: false },
};

/**
 * Signal → presentation. Signals are transient; they briefly take over the floating presence
 * and auto-expire. (Note: `failure` has no dedicated art — it maps to `confused`, which is
 * exactly the kind of semantics→art decision that belongs HERE, not in a page.)
 */
const SIGNAL_POLICY: Record<RemySignal, RemyPresentation> = {
  thinking: { expression: "thinking", visible: true, durationMs: 1800 },
  memoryFound: { expression: "memoryFound", visible: true, durationMs: 2600 },
  reminderDue: { expression: "reminding", visible: true, durationMs: 4000 },
  success: { expression: "success", visible: true, durationMs: 2400 },
  failure: { expression: "confused", visible: true, durationMs: 3000 },
  celebrate: { expression: "celebrating", visible: true, durationMs: 3200 },
};

export const IDLE_PRESENTATION: RemyPresentation = SCENE_POLICY.idle;

export function presentationForScene(scene: RemyScene): RemyPresentation {
  return SCENE_POLICY[scene] ?? IDLE_PRESENTATION;
}

export function presentationForSignal(signal: RemySignal): RemyPresentation {
  return SIGNAL_POLICY[signal] ?? IDLE_PRESENTATION;
}
