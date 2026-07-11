/**
 * Memory Intelligence V2 — DECAY ENGINE (pure, deterministic).
 *
 * Older memories slowly lose ranking, but protected classes never decay aggressively:
 *  - PINNED memories never decay (factor 1).
 *  - MEDICAL / EMERGENCY / HEALTH memories never decay (factor 1).
 *  - MILESTONE / CHILDHOOD / FAMILY memories decay very slowly (long half-life).
 *  - FREQUENTLY RECALLED memories regain importance (reinforcement rewinds their effective age).
 * Deterministic: a pure function of age + class + reinforcement (the caller supplies `now`). No IO.
 */
import { DECAY_CONFIG } from "./config";
import { clamp01, ageDaysOf, halfLifeDecay } from "./math";
import type { MemoryClassification } from "./types";

export interface DecayInput {
  dateIso: string | null;
  classification: MemoryClassification;
  pinned: boolean;
  /** Net successful reinforcement events (recalls) — each rewinds effective age. */
  reinforcementEvents: number;
}

/** Compute a 0..1 decay factor (1 = no decay; lower = older/less prominent). */
export function computeDecayFactor(input: DecayInput, now: number): number {
  // Never-decay classes and pinned memories are pinned at full prominence.
  if (input.pinned || input.classification.protectedFromDecay) return 1;

  const ageDays = ageDaysOf(input.dateIso, now);

  // Frequent recall rewinds effective age (capped) → recalled memories regain importance.
  const rewind = Math.min(
    DECAY_CONFIG.maxReinforcementRewindDays,
    Math.max(0, input.reinforcementEvents) * DECAY_CONFIG.reinforcementRewindDaysPerEvent,
  );
  const effectiveAge = Math.max(0, ageDays - rewind);

  const halfLife = input.classification.slowDecay
    ? DECAY_CONFIG.milestoneHalfLifeDays
    : DECAY_CONFIG.baseHalfLifeDays;

  const factor = halfLifeDecay(effectiveAge, halfLife);
  // Ordinary memories never fully vanish — floor the factor.
  return clamp01(Math.max(DECAY_CONFIG.minDecayFactor, factor));
}
