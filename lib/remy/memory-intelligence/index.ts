/**
 * Memory Intelligence Engine V2 (Phase 28) — public surface.
 *
 * An ADDITIVE subsystem: adaptive importance scoring, relationship weighting, deterministic decay,
 * reinforcement + confidence, cached classification, event clustering, forgotten detection, and a configurable
 * combined ranking. The pure engines have NO IO/clock; the data layer (`store`) persists mutable state via the
 * service role. It does NOT modify the live retrieval paths (Ask Remy / story pipeline / semantic search) —
 * it is the reusable capability a future phase can activate. Everything derives from `config.ts`.
 */

// Central configuration (the SINGLE source of every weight/threshold/taxonomy).
export {
  MEMORY_IMPORTANCE_WEIGHTS,
  RELATIONSHIP_WEIGHTS,
  RELATIONSHIP_TIER_VALUE,
  DECAY_CONFIG,
  REINFORCEMENT_CONFIG,
  RANKING_WEIGHTS,
  FORGOTTEN_CONFIG,
  MEMORY_CATEGORIES,
  MEMORY_CLUSTER_TYPES,
} from "./config";
export type {
  MemoryCategory,
  MemoryClusterType,
  RelationshipTier,
  ImportanceSignalKey,
  RankingSignalKey,
} from "./config";

// Shared types.
export type {
  MemoryIntelligenceInput,
  MemoryIntelligenceState,
  MemoryClassification,
  RelationshipWeighting,
  ImportanceSignals,
  MemoryIntelligence,
  RankedMemory,
  ForgottenMemory,
  MemoryClusterV2,
} from "./types";

// Pure engines.
export { computeImportanceScore, deriveImportanceSignals, aiImportanceValue, emotionalValue } from "./importance-engine";
export { computeRelationshipWeighting, relationshipTierForRole, normalizeRole } from "./relationship-weighting";
export { computeDecayFactor } from "./decay-engine";
export { computeConfidence, reinforce, downRank, defaultState } from "./reinforcement-engine";
export { classifyMemory } from "./classification-engine";
export { clusterTypeForMemory, deriveMemoryClusters } from "./clustering-engine";
export { detectForgottenMemories } from "./forgotten-engine";
export { computeFinalRankingScore, rankMemoriesV2, type RankingSignals } from "./ranking-engine";
export { analyzeMemory, scoreMemoriesV2, type ScoreMemoriesInput, type ScoreMemoriesResult } from "./engine";

// Data layer (service-role; never throws).
export {
  getMemoryIntelligenceStates,
  reinforceMemory,
  setMemoryPinned,
  setMemoryFavourite,
  cacheMemoryClassification,
  backfillMemoryIntelligence,
} from "./store";
