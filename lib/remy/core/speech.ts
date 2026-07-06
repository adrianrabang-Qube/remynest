/**
 * Remy Platform (v2) — SPEECH (living companion voice lines).
 *
 * The short, warm lines Remy "says" in a speech bubble when it reacts. Presentation-only and
 * platform-internal: features never write these. Lines are chosen per semantic MOMENT/CONTEXT,
 * blended with light SESSION awareness (adaptive personality), and picked non-repetitively.
 *
 * Non-clinical, gentle, brief (CLAUDE.md voice). Data-derived lines (birthdays, weekly counts)
 * are intentionally NOT here — they would require app data the platform doesn't own; a feature
 * would supply those via an event payload later.
 */
import type { RemyContextKey, RemyEventName } from "./events";

/** Session snapshot the Brain exposes; drives adaptive lines. */
export interface RemySessionSnapshot {
  created: number;
  saved: number;
  deleted: number;
  searches: number;
}

/** Reaction lines for transient moments. */
const MOMENT_LINES: Partial<Record<RemyEventName, string[]>> = {
  "memory.created": [
    "Memory safely preserved.",
    "That's tucked away safely.",
    "Beautifully kept.",
    "Saved with care.",
  ],
  "memory.saved": [
    "I've updated that.",
    "Kept it accurate.",
    "Updated — all good.",
    "Noted the change.",
  ],
  "memory.deleted": ["Removed.", "That's cleared.", "Done — it's gone.", "Tidied up."],
  "sync.completed": ["All synced up.", "Everything's up to date."],
  online: ["Back online.", "We're reconnected."],
  success: ["Wonderful.", "All set.", "Lovely."],
  failure: [
    "Hmm, that didn't work — shall we try again?",
    "Something went wrong. Let's try once more.",
    "Sorry, that didn't go through.",
  ],
};

/** Lines for sticky contexts that take the floating stage. */
const CONTEXT_LINES: Partial<Record<RemyContextKey, string[]>> = {
  offline: ["We're offline — I'll keep watch.", "No connection right now. I'm still here."],
  searching: ["Let me look…", "Searching through your memories…"],
  conversation: ["I'm listening.", "Go ahead — I'm here.", "What's on your mind?"],
  syncing: ["Syncing things up…", "Just a moment — catching up."],
};

/** Session-start greetings. */
const GREETINGS = [
  "Welcome back.",
  "Good to see you.",
  "I'm here whenever you're ready.",
  "Ready when you are.",
  "You're building something wonderful.",
];

/** Adaptive lines driven by what the user has been doing this session (§ personality). */
function adaptiveLine(session: RemySessionSnapshot): string[] | null {
  if (session.created >= 3)
    return [
      "We're preserving lots today.",
      "So many memories today — wonderful.",
      "What a lovely day of remembering.",
    ];
  if (session.searches >= 3)
    return ["Looking for something specific?", "Still searching — I'm here to help."];
  if (session.saved >= 2)
    return ["Keeping everything accurate.", "Tidying things up nicely."];
  return null;
}

/** Milestone celebration lines (session-detectable milestones only). */
const MILESTONE_LINES: Record<string, string[]> = {
  firstMemoryThisSession: [
    "Your first of the day — beautifully done.",
    "A lovely start. That's safely kept.",
  ],
};

function pick(pool: string[] | null | undefined, avoid?: string | null): string | null {
  if (!pool || pool.length === 0) return null;
  if (pool.length === 1 || !avoid) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const filtered = pool.filter((line) => line !== avoid);
  return filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
}

/** A line for a transient moment — adaptive personality first, else the moment's own line. */
export function speechForMoment(
  event: RemyEventName,
  session: RemySessionSnapshot,
  avoid?: string | null,
): string | null {
  // A strong session pattern colours the reaction (but not on every single event).
  if (Math.random() < 0.5) {
    const adaptive = pick(adaptiveLine(session), avoid);
    if (adaptive) return adaptive;
  }
  return pick(MOMENT_LINES[event], avoid);
}

/** A line for a sticky floating context. */
export function speechForContext(context: RemyContextKey, avoid?: string | null): string | null {
  return pick(CONTEXT_LINES[context], avoid);
}

export function greetingLine(avoid?: string | null): string | null {
  return pick(GREETINGS, avoid);
}

export function milestoneLine(kind: keyof typeof MILESTONE_LINES, avoid?: string | null): string | null {
  return pick(MILESTONE_LINES[kind], avoid);
}
