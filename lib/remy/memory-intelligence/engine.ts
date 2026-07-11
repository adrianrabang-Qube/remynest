/**
 * Memory Intelligence Engine V2 (Phase 28) — the pure ORCHESTRATOR.
 *
 * Runs the deterministic pipeline over a candidate set the caller has loaded (memories + their persisted
 * intelligence state): classify → relationship weighting → importance signals → importance score → decay →
 * reinforcement confidence → cluster, then produces the final combined ranking + forgotten detection. Pure: no
 * IO, no clock, no randomness (the caller passes `now`). The DATA LAYER (store.ts) loads the state and persists
 * reinforcement; this engine only computes. It is ADDITIVE — it does not touch the live retrieval paths.
 */
import { DECAY_CONFIG, REINFORCEMENT_CONFIG } from "./config";
import { clamp01, saturate, ageDaysOf, halfLifeDecay } from "./math";
import { classifyMemory } from "./classification-engine";
import { computeRelationshipWeighting } from "./relationship-weighting";
import { deriveImportanceSignals, computeImportanceScore } from "./importance-engine";
import { computeDecayFactor } from "./decay-engine";
import { computeConfidence, defaultState } from "./reinforcement-engine";
import { clusterTypeForMemory, deriveMemoryClusters } from "./clustering-engine";
import { detectForgottenMemories, type ForgottenCandidate } from "./forgotten-engine";
import { rankMemoriesV2, type RankingSignals } from "./ranking-engine";
import type {
  ForgottenMemory,
  MemoryClusterV2,
  MemoryIntelligence,
  MemoryIntelligenceInput,
  MemoryIntelligenceState,
  RankedMemory,
} from "./types";

/** Compute the full V2 intelligence for a single memory. Pure. */
export function analyzeMemory(
  input: MemoryIntelligenceInput,
  state: MemoryIntelligenceState,
  now: number,
): MemoryIntelligence {
  const classification = state.classification
    ? classifyMemory({ ...input, aiCategory: state.classification })
    : classifyMemory(input);
  const relationship = computeRelationshipWeighting(input.people);

  const signals = deriveImportanceSignals(input, state, classification, relationship, now);
  const importance = computeImportanceScore(signals);

  const decayFactor = computeDecayFactor(
    { dateIso: input.dateIso, classification, pinned: state.pinned, reinforcementEvents: state.reinforcementEvents },
    now,
  );
  const confidence = computeConfidence(state);
  const clusterType = state.clusterType ?? clusterTypeForMemory(input);

  return { memoryId: input.id, classification, relationship, importance, decayFactor, confidence, clusterType };
}

/** The final ranking signals for one memory (importance dampened by decay; reinforcement net of down-ranks). */
function rankingSignalsFor(
  input: MemoryIntelligenceInput,
  state: MemoryIntelligenceState,
  intel: MemoryIntelligence,
  now: number,
): RankingSignals {
  const ageDays = ageDaysOf(input.dateIso, now);
  const netReinforcement = state.retrievalCount + state.reinforcementEvents - state.downRankEvents;
  return {
    semantic: clamp01(input.semanticSimilarity ?? 0),
    importance: clamp01(intel.importance * intel.decayFactor),
    relationship: clamp01(intel.relationship.weight),
    recency: halfLifeDecay(ageDays, DECAY_CONFIG.baseHalfLifeDays),
    reinforcement: saturate(Math.max(0, netReinforcement), REINFORCEMENT_CONFIG.retrievalSaturationK),
    confidence: intel.confidence,
  };
}

export interface ScoreMemoriesInput {
  /** The candidate memories (real fields) + their persisted intelligence state (or default when absent). */
  items: { input: MemoryIntelligenceInput; state?: MemoryIntelligenceState | null }[];
  /** Current time (ms) — supplied so the engine stays clock-free/deterministic. */
  now: number;
}

export interface ScoreMemoriesResult {
  intelligence: Map<string, MemoryIntelligence>;
  ranked: RankedMemory[];
  clusters: MemoryClusterV2[];
  forgotten: ForgottenMemory[];
}

/**
 * The full V2 pipeline over a candidate set: per-memory intelligence + final combined ranking + event clusters
 * + forgotten detection. Deterministic. This is the reusable entry point; it neither reads nor writes the DB.
 */
export function scoreMemoriesV2(args: ScoreMemoriesInput): ScoreMemoriesResult {
  const { items, now } = args;
  const intelligence = new Map<string, MemoryIntelligence>();
  const rankInputs: { memoryId: string; signals: RankingSignals }[] = [];
  const forgottenCandidates: ForgottenCandidate[] = [];

  for (const { input, state } of items) {
    const st = state ?? defaultState(input.id);
    const intel = analyzeMemory(input, st, now);
    intelligence.set(input.id, intel);
    rankInputs.push({ memoryId: input.id, signals: rankingSignalsFor(input, st, intel, now) });
    forgottenCandidates.push({
      memoryId: input.id,
      dateIso: input.dateIso,
      state: st,
      importance: clamp01(intel.importance * intel.decayFactor),
    });
  }

  return {
    intelligence,
    ranked: rankMemoriesV2(rankInputs),
    clusters: deriveMemoryClusters(items.map((i) => i.input)),
    forgotten: detectForgottenMemories(forgottenCandidates, now),
  };
}
