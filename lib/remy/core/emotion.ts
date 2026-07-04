/**
 * Remy Platform (v2) — EMOTION VOCABULARY.
 *
 * The Brain decides WHAT happened; the Emotion Engine (`emotion-engine.ts`) decides HOW Remy
 * FEELS about it, expressed as one of these emotions. The Policy Engine then decides how a
 * feeling LOOKS. Keeping emotion separate from both events and expressions is what lets the
 * app add feelings and re-skin looks independently.
 *
 * Emotions are ADDITIVE: adding one requires an entry in the emotion→look map (policy engine)
 * and, usually, one or more event/context mappings (emotion engine). No feature changes.
 */
export type RemyEmotion =
  | "neutral"
  | "welcoming"
  | "happy"
  | "attentive"
  | "thinking"
  | "concerned"
  | "celebrating"
  | "confused"
  | "calm"
  | "encouraging";

export const REMY_EMOTIONS: RemyEmotion[] = [
  "neutral",
  "welcoming",
  "happy",
  "attentive",
  "thinking",
  "concerned",
  "celebrating",
  "confused",
  "calm",
  "encouraging",
];

export const INITIAL_REMY_EMOTION: RemyEmotion = "neutral";
