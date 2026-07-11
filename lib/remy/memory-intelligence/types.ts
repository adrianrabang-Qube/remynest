/**
 * Memory Intelligence Engine V2 (Phase 28) — shared types. Pure (type-only). Deterministic engines consume
 * and produce these; the data layer (store) persists the mutable subset (MemoryIntelligenceState).
 */
import type { MemoryCategory, MemoryClusterType, RelationshipTier } from "./config";

/** Raw, real per-memory inputs the engines read (from `memories` + `people`/links + the state table). */
export interface MemoryIntelligenceInput {
  id: string;
  /** ISO effective date (memory_date ?? created_at). */
  dateIso: string | null;
  /** Free-form `ai_category` (mapped to the controlled taxonomy by the classification engine). */
  aiCategory?: string | null;
  aiTags?: string[] | null;
  title?: string | null;
  content?: string | null;
  /** `ai_confidence` (0..100) — the enrichment confidence, if present. */
  aiConfidence?: number | null;
  /** `ai_importance` — the categorical enrichment label ("Low"/"Medium"/"High"); revived as a real signal. */
  aiImportance?: string | null;
  /** `ai_emotional_weight` / `ai_sentiment` textual signals (mapped to 0..1 emotional importance). */
  aiEmotionalWeight?: string | null;
  aiSentiment?: string | null;
  /** People linked to the memory + their (normalised) relationship roles. */
  people?: { id: string; role?: string | null; relationshipStrength?: number | null }[];
  /** Number of reminders that reference this memory (0 if none). */
  reminderCount?: number;
  /** Semantic similarity (0..1) for the current query, when ranking a retrieval set (0 otherwise). */
  semanticSimilarity?: number;
}

/** The MUTABLE per-memory intelligence state (persisted in `memory_intelligence`; all optional → lazy defaults). */
export interface MemoryIntelligenceState {
  memoryId: string;
  retrievalCount: number;
  /** ISO of the last successful retrieval, or null. */
  lastRecalledAt: string | null;
  /** Accumulated reinforcement events (successful recalls beyond the first). */
  reinforcementEvents: number;
  /** Accumulated down-rank events (future user "this is wrong" feedback). */
  downRankEvents: number;
  /** Times this memory appeared in a Remy conversation. */
  conversationCount: number;
  pinned: boolean;
  favourite: boolean;
  /** Cached controlled classification (deterministic; recomputed if null). */
  classification: MemoryCategory | null;
  /** Cached event cluster key (deterministic; recomputed if null). */
  clusterType: MemoryClusterType | null;
}

/** Deterministic classification result. */
export interface MemoryClassification {
  category: MemoryCategory;
  /** True for medical/emergency/health — protected from aggressive decay. */
  protectedFromDecay: boolean;
  /** True for milestone/childhood/family — decays very slowly. */
  slowDecay: boolean;
  /** 0..1 confidence in the mapping (keyword-strength based). */
  confidence: number;
}

/** Relationship weighting result for a memory (max over its linked people). */
export interface RelationshipWeighting {
  tier: RelationshipTier;
  /** 0..1 numeric weight (from RELATIONSHIP_TIER_VALUE), boosted by linked-people strength. */
  weight: number;
  /** The dominant person id driving the weight (or null). */
  dominantPersonId: string | null;
}

/** The normalised 0..1 signals fed to the importance engine. */
export interface ImportanceSignals {
  semanticRelevance: number;
  recency: number;
  retrievalFrequency: number;
  conversationFrequency: number;
  relationshipStrength: number;
  emotionalImportance: number;
  aiSignificance: number;
  reminderAssociation: number;
  milestoneAssociation: number;
  manualPin: number;
  favourite: number;
  userReinforcement: number;
  confidence: number;
}

/** Full V2 intelligence for one memory (deterministic; derived from input + state). */
export interface MemoryIntelligence {
  memoryId: string;
  classification: MemoryClassification;
  relationship: RelationshipWeighting;
  /** 0..1 adaptive importance score. */
  importance: number;
  /** 0..1 decay factor (1 = no decay). */
  decayFactor: number;
  /** 0..1 confidence from reinforcement. */
  confidence: number;
  clusterType: MemoryClusterType;
}

/** A memory ranked by the final combined score. */
export interface RankedMemory {
  memoryId: string;
  /** 0..1 final combined ranking score. */
  score: number;
  /** The per-signal 0..1 contributions (for explainability / debugging). */
  breakdown: {
    semantic: number;
    importance: number;
    relationship: number;
    recency: number;
    reinforcement: number;
    confidence: number;
  };
}

/** An internally-detected forgotten memory (never surfaced in the UI this phase). */
export interface ForgottenMemory {
  memoryId: string;
  reasons: ("never_recalled" | "stale" | "lost_significance")[];
  ageDays: number;
  importance: number;
}

/** A deterministic event cluster of memories. */
export interface MemoryClusterV2 {
  type: MemoryClusterType;
  memoryIds: string[];
  size: number;
}
