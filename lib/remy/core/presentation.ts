/**
 * Remy Platform (v2) — PRESENTATION TYPES (shared vocabulary at the bottom of the pipeline).
 *
 * `RemyExpression` is the canonical set of visual states (the renderer maps each to an asset
 * KEY). `RemyPresentation` is the ONLY thing the renderer + engines consume — a fully resolved
 * "how Remy should look/behave right now". It is produced exclusively by the Policy Engine.
 *
 * Forward-compatible: every optional field is additive. New engines (voice, gesture, position)
 * read the fields they understand and ignore the rest, so richer behavior lands without
 * touching any consumer.
 */

/** The canonical expression set. Single source; the renderer owns expression→asset mapping. */
export type RemyExpression =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "happy"
  | "surprised"
  | "sleeping"
  | "searching"
  | "memoryFound"
  | "reminding"
  | "encouraging"
  | "welcome"
  | "goodbye"
  | "confused"
  | "wink"
  | "celebrating"
  | "success";

/** Abstract animation intent (NOT a backend). The Animation Engine maps it to CSS/Rive/etc. */
export type RemyAnimationCue =
  | "idle"
  | "appear"
  | "return"
  | "listen"
  | "thinking"
  | "celebrate"
  | "react";

/** Abstract voice intent (architecture only — no TTS yet). The Voice Engine resolves it. */
export interface RemyVoiceCue {
  /** A stable id for a scripted line, resolved by the voice engine's line table. */
  lineId?: string;
  /** Or literal text for future dynamic TTS. */
  text?: string;
}

/** The fully-resolved output of the Policy Engine — the ONLY input to render/animation/voice. */
export interface RemyPresentation {
  /** Which expression the renderer draws. */
  expression: RemyExpression;
  /** Whether the platform's floating presence shows itself. */
  visible: boolean;
  /** Arbitration weight when several sources compete (higher wins). */
  priority: number;
  /** Animation intent for the Animation Engine (optional). */
  animationCue?: RemyAnimationCue;
  /** Voice intent for the Voice Engine (optional, future). */
  voiceCue?: RemyVoiceCue;
  /** For transient presentations: auto-expire after this many ms. */
  durationMs?: number;
  // FUTURE (additive): position, gesture, emotionMeta, accessibilityVariant, theme.
}

export const IDLE_PRESENTATION: RemyPresentation = {
  expression: "idle",
  visible: false,
  priority: 0,
  animationCue: "idle",
};
