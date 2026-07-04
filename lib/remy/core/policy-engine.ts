/**
 * Remy Platform (v2) — POLICY ENGINE.
 *
 * Converts a feeling (+ its source) into a fully-resolved `RemyPresentation`. This is the ONE
 * place that decides how Remy LOOKS/behaves — expression, visibility, animation/voice cues,
 * priority, timing. Pages and features never make presentation decisions; swapping this file
 * (seasonal theme, A/B, accessibility variant, a future emotion→look model) re-skins the whole
 * app with zero other changes.
 *
 * `emotion → look` (expression + cues) is separate from `source → framing` (visibility,
 * priority, timing), because the SAME feeling floats differently as a transient moment vs a
 * sticky in-place context (e.g. "confused" is an in-place empty-search state, but also a
 * floating failure reaction).
 */
import type { RemyEmotion } from "./emotion";
import { contextPriority, pickTopContext, type RemyContextKey } from "./events";
import { emotionForContext } from "./emotion-engine";
import {
  IDLE_PRESENTATION,
  type RemyAnimationCue,
  type RemyExpression,
  type RemyPresentation,
} from "./presentation";

interface RemyLook {
  expression: RemyExpression;
  animationCue: RemyAnimationCue;
}

/** How each feeling LOOKS. (Emotions without dedicated art borrow the closest expression.) */
const LOOK_BY_EMOTION: Record<RemyEmotion, RemyLook> = {
  neutral: { expression: "idle", animationCue: "idle" },
  welcoming: { expression: "welcome", animationCue: "appear" },
  happy: { expression: "happy", animationCue: "react" },
  attentive: { expression: "listening", animationCue: "listen" },
  thinking: { expression: "thinking", animationCue: "thinking" },
  concerned: { expression: "confused", animationCue: "react" },
  celebrating: { expression: "celebrating", animationCue: "celebrate" },
  confused: { expression: "confused", animationCue: "react" },
  calm: { expression: "idle", animationCue: "idle" },
  encouraging: { expression: "encouraging", animationCue: "appear" },
};

/**
 * Per-context FRAMING: does the context "take the stage" (show the floating presence)? Contexts
 * that a page renders in-place via <RemyStage> stay `floats: false`; genuinely "Remy steps
 * forward" contexts (conversation, offline, …) float. Arbitration weight is NOT here — it is the
 * shared semantic `CONTEXT_PRIORITY` (events.ts), so the Brain and Policy never disagree.
 */
const CONTEXT_FRAMING: Record<RemyContextKey, { floats: boolean }> = {
  welcome: { floats: false },
  "memories.empty": { floats: false },
  "people.empty": { floats: false },
  "timeline.empty": { floats: false },
  "search.empty": { floats: false },
  searching: { floats: true },
  conversation: { floats: true },
  syncing: { floats: true },
  offline: { floats: true },
  error: { floats: false },
};

/** Transient moments float briefly and win arbitration while alive. */
const MOMENT_DURATION_MS: Partial<Record<RemyEmotion, number>> = {
  celebrating: 3200,
  happy: 2400,
  confused: 3000,
  attentive: 2000,
  calm: 1500,
};
const DEFAULT_MOMENT_MS = 2500;
const MOMENT_PRIORITY = 90;

/** A sticky context → presentation (expression from feeling; framing from the context). */
export function presentationForContext(key: RemyContextKey): RemyPresentation {
  const look = LOOK_BY_EMOTION[emotionForContext(key)];
  const framing = CONTEXT_FRAMING[key] ?? { floats: false };
  return { ...look, visible: framing.floats, priority: contextPriority(key) };
}

/** A transient moment's feeling → a brief, floating presentation. */
export function presentationForMoment(emotion: RemyEmotion): RemyPresentation {
  const look = LOOK_BY_EMOTION[emotion] ?? LOOK_BY_EMOTION.neutral;
  return {
    ...look,
    visible: true,
    priority: MOMENT_PRIORITY,
    durationMs: MOMENT_DURATION_MS[emotion] ?? DEFAULT_MOMENT_MS,
  };
}

/**
 * Resolve the WHOLE platform presentation from the Brain's semantic state: a live transient
 * moment wins; otherwise the highest-priority active context; otherwise idle. This is what the
 * floating presence renders.
 */
export function resolvePresentation(state: {
  contexts: readonly RemyContextKey[];
  transientEmotion: RemyEmotion | null;
}): RemyPresentation {
  if (state.transientEmotion) return presentationForMoment(state.transientEmotion);
  const top = pickTopContext(state.contexts);
  return top ? presentationForContext(top) : IDLE_PRESENTATION;
}

export { LOOK_BY_EMOTION, CONTEXT_FRAMING, IDLE_PRESENTATION };
