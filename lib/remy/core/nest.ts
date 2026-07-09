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
 * Nest EVOLUTION — the Nest grows as the user builds their story. Six ordered stages; the Home
 * Nest resolves its stage from a REAL memory-milestone count (threaded from the app shell — never
 * a placeholder). The visual differentiation per stage is a CSS accent today (deepening warmth →
 * a memory-tree green → a sanctuary gold+violet); dedicated per-stage artwork plugs in later (map
 * a stage → a nest asset KEY in the registry) with no consumer change.
 */
export type NestStage =
  | "tiny"
  | "cozy"
  | "family"
  | "golden"
  | "memoryTree"
  | "sanctuary";

export interface NestStageInfo {
  stage: NestStage;
  label: string;
  /** Inclusive lower bound of memories that unlocks this stage. */
  minMemories: number;
}

export const NEST_STAGES: readonly NestStageInfo[] = [
  { stage: "tiny", label: "Tiny Nest", minMemories: 0 },
  { stage: "cozy", label: "Cozy Nest", minMemories: 10 },
  { stage: "family", label: "Family Nest", minMemories: 50 },
  { stage: "golden", label: "Golden Nest", minMemories: 150 },
  { stage: "memoryTree", label: "Memory Tree", minMemories: 500 },
  { stage: "sanctuary", label: "Sanctuary", minMemories: 1000 },
];

/** Pure: the highest stage whose threshold the memory count has reached. */
export function resolveNestStage(memoryCount: number): NestStage {
  let resolved: NestStage = "tiny";
  for (const info of NEST_STAGES) {
    if (memoryCount >= info.minMemories) resolved = info.stage;
  }
  return resolved;
}

/** The stage's human label (for a11y / future UI). */
export function nestStageLabel(stage: NestStage): string {
  return NEST_STAGES.find((s) => s.stage === stage)?.label ?? "Nest";
}
