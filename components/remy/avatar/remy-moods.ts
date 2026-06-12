/**
 * Remy moods — grounded in the official Remy Avatar Blueprint.
 *
 * The blueprint is the source of truth for Remy's personality, expressions, and
 * states. This module does NOT redesign Remy or invent expressions: each mood
 * maps onto a canonical blueprint state, and a context map binds the existing
 * RemyNest intelligence (Timeline, Story Mode, Biography, Family, Notifications,
 * milestones) to those states. Foundation for web / iOS / Android / notifications
 * / voice / future Voice Engine V2.
 */
export type RemyMood =
  | "welcoming"
  | "listening"
  | "thinking"
  | "analyzing"
  | "reflecting"
  | "sharing"
  | "celebrating"
  | "resting"
  | "neutral";

export const REMY_MOODS: RemyMood[] = [
  "welcoming",
  "listening",
  "thinking",
  "analyzing",
  "reflecting",
  "sharing",
  "celebrating",
  "resting",
  "neutral",
];

export interface RemyMoodSpec {
  id: RemyMood;
  label: string;
  /** The canonical blueprint state this mood renders as. */
  blueprintState: string;
  /** Textual description of the blueprint expression (no emoji). */
  cue: string;
  description: string;
}

export const REMY_MOOD_SPECS: Record<RemyMood, RemyMoodSpec> = {
  welcoming: {
    id: "welcoming",
    label: "Welcoming",
    blueprintState: "Chatting (greeting)",
    cue: "Soft smile, open beak, gentle wing wave.",
    description: "A warm hello — the dashboard welcome.",
  },
  listening: {
    id: "listening",
    label: "Listening",
    blueprintState: "Listening",
    cue: "Attentive eyes, head tilted, sound-wave glow.",
    description: "Attentive and present.",
  },
  thinking: {
    id: "thinking",
    label: "Thinking",
    blueprintState: "Thinking",
    cue: "Eyes up, small thought bubble.",
    description: "Quietly working something out.",
  },
  analyzing: {
    id: "analyzing",
    label: "Analyzing",
    blueprintState: "Analyzing",
    cue: "Holding a magnifying glass, focused.",
    description: "Looking closely — Timeline / insights.",
  },
  reflecting: {
    id: "reflecting",
    label: "Reflecting",
    blueprintState: "Thoughtful",
    cue: "Wing to chin, thoughtful gaze.",
    description: "Thoughtful — Story Mode / Biography.",
  },
  sharing: {
    id: "sharing",
    label: "Sharing",
    blueprintState: "Sharing",
    cue: "Warm smile with a speech bubble.",
    description: "Caring and giving — Family / Notifications.",
  },
  celebrating: {
    id: "celebrating",
    label: "Celebrating",
    blueprintState: "Celebrating",
    cue: "Wings up, sparkles, joyful.",
    description: "Joyful — milestones and discoveries.",
  },
  resting: {
    id: "resting",
    label: "Resting",
    blueprintState: "Resting",
    cue: "Eyes closed, calm and content.",
    description: "Calm and at ease — nothing needs attention.",
  },
  neutral: {
    id: "neutral",
    label: "Neutral",
    blueprintState: "Neutral",
    cue: "Calm, attentive resting expression.",
    description: "Remy's resting expression.",
  },
};

/** RemyNest intelligence surfaces that drive Remy's emotional state. */
export type RemyContext =
  | "dashboard"
  | "notifications"
  | "timeline"
  | "story-mode"
  | "biography"
  | "memory-book"
  | "family"
  | "milestone";

/** The state mapping: intelligence surface → Remy mood (blueprint state). */
export const REMY_CONTEXT_MOOD: Record<RemyContext, RemyMood> = {
  dashboard: "welcoming",
  notifications: "sharing",
  timeline: "analyzing",
  "story-mode": "reflecting",
  biography: "reflecting",
  "memory-book": "reflecting",
  family: "sharing",
  milestone: "celebrating",
};

export function remyMoodForContext(context: RemyContext): RemyMood {
  return REMY_CONTEXT_MOOD[context] ?? "neutral";
}
