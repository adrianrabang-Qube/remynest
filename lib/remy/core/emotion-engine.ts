/**
 * Remy Platform (v2) — EMOTION ENGINE.
 *
 * Pure mapping from semantics → feeling. It answers exactly one question: "given this context
 * or this moment, how does Remy feel?" It has NO state, NO timers, NO rendering. The Brain owns
 * *when* an emotion applies; this engine owns *which* emotion.
 *
 * Future: this is where a richer affective model plugs in (memory context, relationship, trust,
 * personality, decay) — replace the lookups with a model; consumers are unaffected.
 */
import type { RemyEmotion } from "./emotion";
import type { RemyContextKey, RemyEventName } from "./events";

/** How Remy feels WHILE a sticky context is active. */
const CONTEXT_EMOTION: Record<RemyContextKey, RemyEmotion> = {
  welcome: "welcoming",
  "memories.empty": "welcoming",
  "people.empty": "welcoming",
  "timeline.empty": "encouraging",
  "search.empty": "confused",
  searching: "thinking",
  conversation: "attentive",
  syncing: "thinking",
  offline: "concerned",
  error: "confused",
};

/** How Remy feels for a brief MOMENT after an event. `null` = this event carries no feeling. */
const MOMENT_EMOTION: Partial<Record<RemyEventName, RemyEmotion>> = {
  "memory.created": "happy",
  "memory.saved": "happy",
  "memory.deleted": "calm",
  "search.finished": "happy",
  "timeline.opened": "attentive",
  "timeline.empty": "encouraging",
  "notification.received": "attentive",
  "sync.completed": "happy",
  online: "calm",
  success: "celebrating",
  failure: "confused",
  // Screen-arrival reactions — Remy briefly reflects the screen you just opened.
  "screen.dashboard": "welcoming",
  "screen.timeline": "attentive",
  "screen.people": "happy",
  "screen.library": "calm",
  "screen.reminders": "attentive",
  "screen.settings": "calm",
  "screen.dates": "thinking",
  // A crossed memory milestone — a celebration.
  "milestone.reached": "celebrating",
  // A memory puzzle came back together — a gentle celebration.
  "puzzle.completed": "celebrating",
  // Every pair found in a Memory Match game — a gentle celebration.
  "match.completed": "celebrating",
};

export function emotionForContext(key: RemyContextKey): RemyEmotion {
  return CONTEXT_EMOTION[key] ?? "neutral";
}

export function emotionForMoment(name: RemyEventName): RemyEmotion | null {
  return MOMENT_EMOTION[name] ?? null;
}
