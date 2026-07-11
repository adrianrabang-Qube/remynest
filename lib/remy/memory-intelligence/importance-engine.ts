/**
 * Memory Intelligence V2 — IMPORTANCE ENGINE (pure).
 *
 * Produces a production 0..1 adaptive importance score for a memory from configurable weighted signals. Every
 * raw signal is normalised to 0..1, multiplied by its `MEMORY_IMPORTANCE_WEIGHTS` weight, and the weighted sum
 * is normalised by the total weight → a stable 0..1 score. Deterministic (the caller supplies `now`).
 */
import { MEMORY_IMPORTANCE_WEIGHTS, DECAY_CONFIG, REINFORCEMENT_CONFIG } from "./config";
import { clamp01, saturate, ageDaysOf, halfLifeDecay } from "./math";
import type {
  ImportanceSignals,
  MemoryClassification,
  MemoryIntelligenceInput,
  MemoryIntelligenceState,
  RelationshipWeighting,
} from "./types";

/** Map the categorical `ai_importance` label to 0..1 (revives the previously-dead string signal). */
export function aiImportanceValue(label: string | null | undefined): number {
  switch ((label ?? "").trim().toLowerCase()) {
    case "high":
      return 1;
    case "medium":
      return 0.6;
    case "low":
      return 0.3;
    default:
      return 0.5; // unknown/absent → neutral
  }
}

/** Map textual emotional weight / sentiment to a 0..1 emotional-importance signal. */
export function emotionalValue(weight: string | null | undefined, sentiment: string | null | undefined): number {
  const w = (weight ?? "").trim().toLowerCase();
  let base = 0.4;
  if (w.includes("intense") || w.includes("heavy") || w.includes("high") || w.includes("strong")) base = 1;
  else if (w.includes("moderate") || w.includes("medium")) base = 0.6;
  else if (w.includes("light") || w.includes("low")) base = 0.3;
  // A strongly positive OR negative sentiment both signal emotional salience.
  const s = (sentiment ?? "").trim().toLowerCase();
  const charged = s.includes("positive") || s.includes("negative") || s.includes("mixed");
  return clamp01(charged ? base + 0.1 : base);
}

/**
 * Derive the normalised 0..1 importance signals from a memory's raw input + persisted state + the already-
 * computed classification + relationship weighting. Pure.
 */
export function deriveImportanceSignals(
  input: MemoryIntelligenceInput,
  state: MemoryIntelligenceState,
  classification: MemoryClassification,
  relationship: RelationshipWeighting,
  now: number,
): ImportanceSignals {
  const ageDays = ageDaysOf(input.dateIso, now);
  const netReinforcement = Math.max(0, state.reinforcementEvents - state.downRankEvents);

  return {
    semanticRelevance: clamp01(input.semanticSimilarity ?? 0),
    recency: halfLifeDecay(ageDays, DECAY_CONFIG.baseHalfLifeDays),
    retrievalFrequency: saturate(state.retrievalCount, REINFORCEMENT_CONFIG.retrievalSaturationK),
    conversationFrequency: saturate(state.conversationCount, REINFORCEMENT_CONFIG.retrievalSaturationK),
    relationshipStrength: clamp01(relationship.weight),
    emotionalImportance: emotionalValue(input.aiEmotionalWeight, input.aiSentiment),
    aiSignificance: aiImportanceValue(input.aiImportance),
    reminderAssociation: clamp01((input.reminderCount ?? 0) / 2),
    milestoneAssociation:
      classification.category === "milestones" ? 1 : classification.slowDecay ? 0.5 : 0,
    manualPin: state.pinned ? 1 : 0,
    favourite: state.favourite ? 1 : 0,
    userReinforcement: saturate(netReinforcement, 3),
    confidence: clamp01((input.aiConfidence ?? 50) / 100),
  };
}

const TOTAL_IMPORTANCE_WEIGHT = Object.values(MEMORY_IMPORTANCE_WEIGHTS).reduce((a, b) => a + b, 0);

/** Combine normalised signals into a 0..1 importance score via the central weights. Pure. */
export function computeImportanceScore(signals: ImportanceSignals): number {
  let sum = 0;
  for (const key of Object.keys(MEMORY_IMPORTANCE_WEIGHTS) as (keyof ImportanceSignals)[]) {
    sum += MEMORY_IMPORTANCE_WEIGHTS[key] * clamp01(signals[key]);
  }
  return clamp01(sum / TOTAL_IMPORTANCE_WEIGHT);
}
