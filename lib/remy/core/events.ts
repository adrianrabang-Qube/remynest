/**
 * Remy Platform (v2) — EVENT VOCABULARY (the single entry into the platform).
 *
 * Features NEVER touch presentation. They publish SEMANTIC EVENTS to the Event Bus; the Brain
 * interprets them. This module is the only enumeration of what the application can tell Remy.
 * Adding a capability = add an event here + interpret it in the Brain / Emotion Engine. No
 * renderer, provider, page, or asset change.
 *
 * Two shapes feed the Brain, both as events:
 *  - MOMENT / lifecycle events (imperative): `memory.saved`, `search.started`, `offline`, …
 *  - CONTEXT enter/exit (declarative, mount-scoped via <RemyStage>/useRemyContext): a sticky
 *    "we are in state X" that cannot leak because it is retracted on unmount.
 */

/** Sticky semantic contexts the Brain can hold (entered/exited; the app can be in several). */
export type RemyContextKey =
  | "welcome"
  | "memories.empty"
  | "people.empty"
  | "timeline.empty"
  | "search.empty"
  | "searching"
  | "conversation"
  | "syncing"
  | "offline"
  | "error";

/** Every event name the platform understands. */
export type RemyEventName =
  // memory lifecycle
  | "memory.created"
  | "memory.saved"
  | "memory.deleted"
  // search
  | "search.started"
  | "search.finished"
  // conversation
  | "conversation.started"
  | "conversation.ended"
  // timeline
  | "timeline.opened"
  | "timeline.empty"
  // system
  | "notification.received"
  | "sync.started"
  | "sync.completed"
  | "offline"
  | "online"
  // generic outcomes
  | "success"
  | "failure"
  // declarative context lifecycle (emitted by <RemyStage>/useRemyContext)
  | "context.enter"
  | "context.exit";

/** The event envelope carried on the bus. */
export interface RemyEvent {
  name: RemyEventName;
  /** Present for `context.enter` / `context.exit`. */
  context?: RemyContextKey;
  /** Optional structured payload (future: memoryId, query, error code, …). Never rendered. */
  payload?: Record<string, unknown>;
}

/** Convenience constructors keep call sites terse and type-safe. */
export function contextEnter(context: RemyContextKey): RemyEvent {
  return { name: "context.enter", context };
}
export function contextExit(context: RemyContextKey): RemyEvent {
  return { name: "context.exit", context };
}

/**
 * Semantic arbitration weight when several contexts are active at once (higher wins). This is a
 * SEMANTIC fact about the contexts (offline matters more than an empty list), shared by the
 * Brain (which feeling to hold) and the Policy Engine (which presentation to show) so they can
 * never disagree.
 */
export const CONTEXT_PRIORITY: Record<RemyContextKey, number> = {
  welcome: 20,
  "memories.empty": 25,
  "people.empty": 25,
  "timeline.empty": 25,
  "search.empty": 30,
  searching: 35,
  conversation: 60,
  syncing: 20,
  offline: 70,
  error: 80,
};

export function contextPriority(context: RemyContextKey): number {
  return CONTEXT_PRIORITY[context] ?? 0;
}

/** The winning (highest-priority) context among the active set, or null. */
export function pickTopContext(contexts: readonly RemyContextKey[]): RemyContextKey | null {
  let top: RemyContextKey | null = null;
  let topP = -Infinity;
  for (const c of contexts) {
    const p = contextPriority(c);
    if (p > topP) {
      topP = p;
      top = c;
    }
  }
  return top;
}
