/**
 * Remy companion — STATE MACHINE (foundation only).
 *
 * The canonical lifecycle states. Phase 1 wires a subset (hidden ⇄ idle); the full
 * machine (opening/returning transients + listening/thinking/talking/celebrating) is the
 * contract Phase 2's animation sequencing + AI layer drive. No artwork or animation is
 * implied here — these are LOGICAL states only.
 */
export const REMY_STATES = [
  "closed", // present but collapsed (the "Nest" closed) — Phase 2
  "opening", // transient: nest opening / Remy appearing — Phase 2
  "idle", // visible, at rest (the Phase-1 visible state)
  "listening", // AI capturing input — Phase 2
  "thinking", // AI processing — Phase 2
  "talking", // AI speaking — Phase 2
  "celebrating", // positive reinforcement (e.g. memory created) — Phase 2
  "returning", // transient: Remy returning home / nest closing — Phase 2
  "hidden", // not shown
] as const;

export type RemyState = (typeof REMY_STATES)[number];

export const INITIAL_REMY_STATE: RemyState = "hidden";

/**
 * FUTURE emotion + speech state — declared so the provider's value shape is forward
 * compatible with the AI layer. NOT used in Phase 1 (no emotion/speech rendering).
 */
export type RemyEmotion =
  | "neutral"
  | "happy"
  | "thoughtful"
  | "encouraging"
  | "calm";

export type RemySpeech = {
  isSpeaking: boolean;
  /** Current utterance (Phase 2 — drives the speech bubble + aria-live). */
  text?: string;
};

export const INITIAL_REMY_EMOTION: RemyEmotion = "neutral";
export const INITIAL_REMY_SPEECH: RemySpeech = { isSpeaking: false };
