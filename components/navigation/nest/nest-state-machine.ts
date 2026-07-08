import type { RemyExpression, RemyEmotion } from "@/lib/remy";

/**
 * The Nest interaction state machine — the INTERACTION phases of the bottom-nav Nest hub.
 *
 * This is UI/interaction state (rest → peek → pop → menu → return), NOT Remy's emotional brain.
 * The Remy PLATFORM (lib/remy/core/*) remains the single authority on how Remy *feels*; this FSM
 * only sequences the hub's presentation and maps each phase to an EXISTING Remy expression that
 * is drawn through the single renderer `<Remy state>`. It introduces NO second brain / policy /
 * provider / registry (the platform's exactly-one-of-each rule) — the platform has no
 * menu/position vocabulary, so the hub owns this interaction phase locally (as the prior
 * RemyActionButton did with a bare `open` boolean, only richer).
 *
 * FUTURE-READY: the reserved phases (Listening / Thinking / Processing / Celebrate) are DEFINED
 * here and already mapped to real expressions, so voice / AI / memory-celebration can be wired
 * later simply by triggering them (and, if desired, emitting a platform event) — no rewrite. They
 * are intentionally NOT reachable from the tap flow yet (that live behaviour is POST-LAUNCH
 * deferred per CLAUDE.md). Adding a genuinely new state = add one row to `NEST_VISUALS` (+ its
 * transitions) here; the components and hook need no change.
 */
export type NestPhase =
  | "idle" // Remy resting in the nest
  | "peek" // Remy wakes and peeks out
  | "popout" // Remy pops out to greet
  | "menuOpen" // Remy presents the menu
  | "returnHome" // Remy settles back into the nest
  // Reserved for the roadmap (voice / AI / celebrations) — defined + mapped, not yet triggered:
  | "listening"
  | "thinking"
  | "processing"
  | "celebrate";

export type NestEvent =
  | "TAP" // idle → peek (begin the wake sequence)
  | "REDUCED_TAP" // idle → menuOpen (prefers-reduced-motion: skip the animation)
  | "PEEK_DONE" // peek → popout
  | "POP_DONE" // popout → menuOpen
  | "DISMISS" // menuOpen → returnHome (backdrop / Escape / breakpoint)
  | "SELECT" // menuOpen → returnHome (a menu item was chosen; navigation follows)
  | "RETURN_DONE" // returnHome → idle
  | "RESET"; // any → idle (cleanup / unmount / reduced-motion close)

/** How each phase LOOKS. The single phase→expression map — add a row to add a state. */
export interface NestPhaseVisual {
  /** An EXISTING Remy expression, rendered via the one renderer `<Remy state>`. */
  expression: RemyExpression;
  /** Optional one-shot reaction feeling (platform emotion vocabulary). */
  emotion?: RemyEmotion;
  /** Whether the menu sheet is visible in this phase. */
  menuOpen: boolean;
}

export const NEST_VISUALS: Record<NestPhase, NestPhaseVisual> = {
  idle: { expression: "idle", menuOpen: false },
  peek: { expression: "wink", menuOpen: false },
  popout: { expression: "welcome", emotion: "welcoming", menuOpen: false },
  menuOpen: { expression: "welcome", emotion: "welcoming", menuOpen: true },
  returnHome: { expression: "goodbye", menuOpen: false },
  // Reserved (future) — real expressions, not yet reachable from the tap flow:
  listening: { expression: "listening", emotion: "attentive", menuOpen: true },
  thinking: { expression: "thinking", emotion: "thinking", menuOpen: true },
  processing: { expression: "thinking", emotion: "thinking", menuOpen: true },
  celebrate: { expression: "celebrating", emotion: "celebrating", menuOpen: false },
};

const TRANSITIONS: Record<NestPhase, Partial<Record<NestEvent, NestPhase>>> = {
  idle: { TAP: "peek", REDUCED_TAP: "menuOpen" },
  peek: { PEEK_DONE: "popout", DISMISS: "returnHome", RESET: "idle" },
  popout: { POP_DONE: "menuOpen", DISMISS: "returnHome", RESET: "idle" },
  menuOpen: { DISMISS: "returnHome", SELECT: "returnHome", RESET: "idle" },
  returnHome: { RETURN_DONE: "idle", TAP: "peek", REDUCED_TAP: "menuOpen", RESET: "idle" },
  listening: { DISMISS: "returnHome", RESET: "idle" },
  thinking: { DISMISS: "returnHome", RESET: "idle" },
  processing: { DISMISS: "returnHome", RESET: "idle" },
  celebrate: { RETURN_DONE: "idle", RESET: "idle" },
};

/** Pure transition. An undefined (phase, event) pair is a no-op (returns the current phase). */
export function nestTransition(phase: NestPhase, event: NestEvent): NestPhase {
  return TRANSITIONS[phase]?.[event] ?? phase;
}
