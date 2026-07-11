/**
 * Memory Intelligence V2 — RANKING ENGINE (pure, deterministic, CONFIGURABLE).
 *
 * The improved retrieval ranking: one final 0..1 score = a weighted blend of the six signals
 * (Semantic + Importance + Relationship + Recency + Reinforcement + Confidence), via the central
 * `RANKING_WEIGHTS`. Semantic stays primary (recall leads). This is an ADDITIVE ranker — it does NOT modify the
 * live Ask Remy blended ranker (`lib/remy/retrieval.ts`); it is the V2 capability a future phase can activate.
 */
import { RANKING_WEIGHTS, type RankingSignalKey } from "./config";
import { clamp01 } from "./math";
import type { RankedMemory } from "./types";

/** The six normalised 0..1 ranking signals for one memory. */
export type RankingSignals = Record<RankingSignalKey, number>;

const TOTAL_RANKING_WEIGHT = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);

/** Combine the six signals into a 0..1 final ranking score via the central weights. Pure. */
export function computeFinalRankingScore(signals: RankingSignals): number {
  let sum = 0;
  for (const key of Object.keys(RANKING_WEIGHTS) as RankingSignalKey[]) {
    sum += RANKING_WEIGHTS[key] * clamp01(signals[key]);
  }
  return clamp01(sum / TOTAL_RANKING_WEIGHT);
}

/**
 * Rank a scored candidate set by final score, descending. Deterministic: ties break by score then memoryId
 * (stable, total order). Pure — no IO. Returns each memory with its score + per-signal breakdown.
 */
export function rankMemoriesV2(
  scored: { memoryId: string; signals: RankingSignals }[],
): RankedMemory[] {
  return scored
    .map(({ memoryId, signals }) => ({
      memoryId,
      score: computeFinalRankingScore(signals),
      breakdown: {
        semantic: clamp01(signals.semantic),
        importance: clamp01(signals.importance),
        relationship: clamp01(signals.relationship),
        recency: clamp01(signals.recency),
        reinforcement: clamp01(signals.reinforcement),
        confidence: clamp01(signals.confidence),
      },
    }))
    .sort((a, b) => b.score - a.score || a.memoryId.localeCompare(b.memoryId));
}
