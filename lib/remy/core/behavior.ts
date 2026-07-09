/**
 * Remy Platform (v2) — BEHAVIOUR VOCABULARY (extends the platform; one layer above expression).
 *
 * A BEHAVIOUR is what Remy is DOING (resting, waking, greeting, celebrating, returning home) —
 * distinct from EMOTION (how Remy feels, `emotion.ts`) and EXPRESSION (how Remy looks,
 * `presentation.ts`). It is the layer the living-companion surfaces (the Nest) speak in, so an
 * interaction is described as Remy BEHAVIOUR rather than UI/menu state. Every behaviour maps to an
 * EXISTING expression / emotion / animation cue via `BEHAVIOR_LOOK` — so a behaviour needs NO new
 * artwork, and adding one is a single row here (plus, optionally, a choreography beat in `./nest`).
 *
 * This is part of the ONE Remy platform — not a parallel system. Reserved future behaviours
 * (listening / recording / searching / thinking / processing / memoryFound / reminder / …) are
 * already defined + mapped so voice, AI, celebrations, and reminder reactions wire in later by
 * TRIGGERING them — no rewrite, no new renderer/provider/registry.
 */
import type { RemyExpression, RemyAnimationCue } from "./presentation";
import type { RemyEmotion } from "./emotion";

export type RemyBehavior =
  | "resting" // asleep / at rest inside the Nest — the persistent default
  | "sleeping" // deep rest (explicit)
  | "idle" // awake but calm
  | "waking" // stirring at the user's touch
  | "peeking" // peeking out of the Nest
  | "emerging" // climbing out to greet
  | "greeting" // greeting the user + presenting actions
  | "listening" // attending to the user (future: voice)
  | "thinking" // considering (future: AI)
  | "searching" // looking through memories (future)
  | "recording" // capturing a voice memory (future)
  | "celebrating" // a joyful reaction
  | "reminder" // surfacing a reminder
  | "memoryFound" // a memory surfaced
  | "processing" // working on something (future)
  | "success" // an action succeeded
  | "returningHome"; // heading back into the Nest

export interface RemyBehaviorLook {
  /** An EXISTING expression the single `<Remy>` renderer draws (never a new/unmapped state). */
  expression: RemyExpression;
  /** Optional feeling (platform emotion vocabulary) driving the one-shot reaction. */
  emotion?: RemyEmotion;
  /** Optional abstract animation intent (platform animation cue). */
  animationCue?: RemyAnimationCue;
  /**
   * True when Remy is PRESENTING actions to the user in this behaviour. A surface's menu is a
   * CONSEQUENCE of this flag (it appears while Remy greets/listens) — never a standalone "menu
   * state". Keeping this on the behaviour is what stops the Nest from being a dressed-up FAB.
   */
  presentsActions?: boolean;
}

/** The single behaviour→look map. Every value reuses the existing expression/emotion/cue vocab. */
export const BEHAVIOR_LOOK: Record<RemyBehavior, RemyBehaviorLook> = {
  resting: { expression: "sleeping", animationCue: "idle" },
  sleeping: { expression: "sleeping", animationCue: "idle" },
  idle: { expression: "idle", animationCue: "idle" },
  waking: { expression: "idle", emotion: "neutral", animationCue: "appear" },
  peeking: { expression: "wink", emotion: "welcoming", animationCue: "appear" },
  emerging: { expression: "welcome", emotion: "welcoming", animationCue: "appear" },
  greeting: {
    expression: "welcome",
    emotion: "welcoming",
    animationCue: "appear",
    presentsActions: true,
  },
  listening: {
    expression: "listening",
    emotion: "attentive",
    animationCue: "listen",
    presentsActions: true,
  },
  thinking: { expression: "thinking", emotion: "thinking", animationCue: "thinking" },
  searching: { expression: "searching", emotion: "thinking", animationCue: "thinking" },
  recording: { expression: "listening", emotion: "attentive", animationCue: "listen" },
  celebrating: { expression: "celebrating", emotion: "celebrating", animationCue: "celebrate" },
  reminder: { expression: "reminding", emotion: "encouraging", animationCue: "react" },
  memoryFound: { expression: "memoryFound", emotion: "happy", animationCue: "react" },
  processing: { expression: "thinking", emotion: "thinking", animationCue: "thinking" },
  success: { expression: "success", emotion: "celebrating", animationCue: "celebrate" },
  returningHome: { expression: "goodbye", emotion: "calm", animationCue: "return" },
};

/** All behaviours (tooling / future pickers). */
export const REMY_BEHAVIORS = Object.keys(BEHAVIOR_LOOK) as RemyBehavior[];

/** Resolve a behaviour to its look (expression / emotion / animation + presents-actions). */
export function resolveBehaviorLook(behavior: RemyBehavior): RemyBehaviorLook {
  return BEHAVIOR_LOOK[behavior];
}
