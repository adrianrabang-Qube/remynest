/**
 * Remy Platform (v2) — THE NEST: interaction choreography + evolution (platform-owned DATA).
 *
 * The Nest is Remy's persistent HOME on every screen. This module owns, as pure platform data:
 *   · the interaction CHOREOGRAPHY — ordered BEHAVIOUR steps for Remy waking + returning home, and
 *   · the Nest EVOLUTION — ordered stages + a pure milestone→stage resolver.
 *
 * The Nest surface (`components/navigation/nest/*`) merely PLAYS this choreography and reflects the
 * current behaviour through the single `<Remy>` renderer — it defines NO vocabulary or transitions
 * of its own (no second state machine). Retiming a beat = edit a sequence here; adding an
 * evolution stage = one row below. Everything stays inside the ONE Remy platform.
 */
import type { RemyBehavior } from "./behavior";

/** One beat of a Nest interaction: hold `behavior` for `durationMs` (0 = sticky until next input). */
export interface NestStep {
  behavior: RemyBehavior;
  durationMs: number;
}

/**
 * Remy waking and climbing out of the Nest to greet the user. Ends STICKY at `greeting` — the
 * behaviour whose `presentsActions` is true, so the menu appears only once Remy has greeted (never
 * on tap). The interaction — waking → peeking → emerging → greeting — is the feature; the menu is
 * its consequence.
 */
export const NEST_WAKE_SEQUENCE: readonly NestStep[] = [
  { behavior: "waking", durationMs: 220 },
  { behavior: "peeking", durationMs: 240 },
  { behavior: "emerging", durationMs: 260 },
  { behavior: "greeting", durationMs: 0 },
];

/** Remy heading back into the Nest after an action. Ends STICKY at `resting`. */
export const NEST_RETURN_SEQUENCE: readonly NestStep[] = [
  { behavior: "returningHome", durationMs: 260 },
  { behavior: "resting", durationMs: 0 },
];

/** The Nest's persistent resting behaviour — Remy asleep / at rest inside the Nest. */
export const NEST_RESTING_BEHAVIOR: RemyBehavior = "resting";

/** The behaviour during which Remy presents actions (the menu appears here). */
export const NEST_GREETING_BEHAVIOR: RemyBehavior = "greeting";

/**
 * Nest EVOLUTION — the Nest grows as the user builds their story. Stages are ordered; the Home
 * Nest resolves its stage from a memory-milestone count. Progression need not be wired to live
 * data yet — passing a count is enough to swap stages — and dedicated per-stage artwork plugs in
 * later (map a stage → a nest asset KEY in the registry) with no consumer change.
 */
export type NestStage = "small" | "growing" | "blooming" | "family" | "legendary";

export interface NestStageInfo {
  stage: NestStage;
  label: string;
  /** Inclusive lower bound of memories that unlocks this stage. */
  minMemories: number;
}

export const NEST_STAGES: readonly NestStageInfo[] = [
  { stage: "small", label: "Small Nest", minMemories: 0 },
  { stage: "growing", label: "Growing Nest", minMemories: 10 },
  { stage: "blooming", label: "Blooming Nest", minMemories: 50 },
  { stage: "family", label: "Family Nest", minMemories: 150 },
  { stage: "legendary", label: "Legendary Nest", minMemories: 500 },
];

/** Pure: the highest stage whose threshold the memory count has reached. */
export function resolveNestStage(memoryCount: number): NestStage {
  let resolved: NestStage = "small";
  for (const info of NEST_STAGES) {
    if (memoryCount >= info.minMemories) resolved = info.stage;
  }
  return resolved;
}
