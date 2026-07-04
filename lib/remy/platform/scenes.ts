/**
 * Remy Platform — SEMANTIC VOCABULARY.
 *
 * The application speaks to Remy in SCENES and SIGNALS — never in expressions, artwork, or
 * pixels. This module is the ONLY place that enumerates the semantic moments Remy responds
 * to. Adding a moment = add it here + a mapping in `policy.ts`; no page, provider, or
 * renderer changes. This is the stable contract that survives UI/rendering-tech rewrites.
 *
 *  UI  ──emit(scene | signal)──▶  Platform  ──policy──▶  Presentation  ──▶  <Remy> renderer
 *
 * SCENES are sticky, declarative contexts — active WHILE a piece of UI is present
 * (mount-scoped, stackable; e.g. "the memories list is empty", "a search is open").
 * SIGNALS are transient, imperative moments — fire-and-forget, auto-expiring (e.g. "a
 * memory was just saved", "a reminder is due").
 */

/** Sticky, declarative contexts. Contributed while a UI surface is mounted; stackable. */
export type RemyScene =
  | "idle" // default resting context — nothing has been emitted
  | "welcome" // first-run / onboarding greeting
  | "empty" // a generic "nothing here yet" surface
  | "empty.memories" // the memories feed has no entries
  | "empty.people" // no care profiles / people yet
  | "searching" // a search / retrieval surface is active or in flight
  | "search.empty" // a search returned no results
  | "loading" // a route / data load is in progress
  | "conversation" // a Remy conversation surface is open (started → ended = mount → unmount)
  | "error"; // an error surface is showing

/** Transient, imperative moments. Fire-and-forget; the platform auto-expires them. */
export type RemySignal =
  | "thinking" // Remy is processing
  | "memoryFound" // a memory / result was surfaced
  | "reminderDue" // a reminder is due (presentational cue only — NOT the reminder engine)
  | "success" // an action succeeded
  | "failure" // an action failed
  | "celebrate"; // a milestone / positive reinforcement

/**
 * Scene arbitration. When several scenes are active at once (nested surfaces), the highest
 * priority wins the shared floating presence. Higher = more attention-worthy. Pure data — no
 * behavior — so it is safe to read anywhere.
 */
export const SCENE_PRIORITY: Record<RemyScene, number> = {
  idle: 0,
  loading: 10,
  welcome: 20,
  empty: 20,
  "empty.memories": 25,
  "empty.people": 25,
  searching: 30,
  "search.empty": 35,
  conversation: 60,
  error: 80,
};

export function scenePriority(scene: RemyScene): number {
  return SCENE_PRIORITY[scene] ?? 0;
}

/** All known scenes (tooling / exhaustiveness checks). */
export const ALL_REMY_SCENES = Object.keys(SCENE_PRIORITY) as RemyScene[];
