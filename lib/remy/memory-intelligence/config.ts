/**
 * Memory Intelligence Engine V2 (Phase 28) — THE SINGLE central configuration.
 *
 * Every V2 weight / threshold / taxonomy lives here — nothing is scattered through the codebase. Tune the
 * engine by editing this file only; all engines derive from these constants. Pure data (no logic, no IO).
 *
 * This subsystem is ADDITIVE: it introduces adaptive importance, relationship weighting, decay, reinforcement,
 * classification, clustering, forgotten-detection, and a combined ranking score. It does NOT modify the live
 * retrieval paths (Ask Remy / story pipeline / semantic search) — it is a reusable capability layer.
 */

/** The controlled memory classification taxonomy (V2). `ai_category` (free-form) maps into one of these. */
export const MEMORY_CATEGORIES = [
  "family",
  "friends",
  "medical",
  "health",
  "career",
  "education",
  "finance",
  "travel",
  "milestones",
  "childhood",
  "relationships",
  "preferences",
  "emergency",
  "routine",
  "miscellaneous",
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

/** Event-based cluster types (V2). Deterministic; a memory joins at most one by strongest keyword match. */
export const MEMORY_CLUSTER_TYPES = [
  "wedding",
  "hospital-stay",
  "university",
  "holiday",
  "moving-house",
  "employment",
  "school",
  "family-event",
  "birthday",
  "other",
] as const;
export type MemoryClusterType = (typeof MEMORY_CLUSTER_TYPES)[number];

/**
 * IMPORTANCE WEIGHTS — the relative contribution of each signal to a memory's importance score. Each signal is
 * normalised to 0..1 by the importance engine, multiplied by its weight, and the weighted sum is normalised by
 * the total weight → a final 0..1 importance score. Change the emphasis here (single source of truth).
 */
export const MEMORY_IMPORTANCE_WEIGHTS = {
  semanticRelevance: 0.18,
  recency: 0.08,
  retrievalFrequency: 0.08,
  conversationFrequency: 0.06,
  relationshipStrength: 0.14,
  emotionalImportance: 0.1,
  aiSignificance: 0.1,
  reminderAssociation: 0.04,
  milestoneAssociation: 0.06,
  manualPin: 0.06,
  favourite: 0.04,
  userReinforcement: 0.04,
  confidence: 0.02,
} as const;
export type ImportanceSignalKey = keyof typeof MEMORY_IMPORTANCE_WEIGHTS;

/**
 * RELATIONSHIP WEIGHTS — how much a linked person's relationship TYPE lifts related memories. A person's free-
 * text `people.role` is normalised (see relationship-weighting) to one of these tiers; the tier's numeric value
 * (0..1) is the relationship signal. Fully configurable.
 */
export const RELATIONSHIP_TIER_VALUE = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
  unknown: 0.5,
} as const;
export type RelationshipTier = keyof typeof RELATIONSHIP_TIER_VALUE;

/** Map a normalised relationship type → tier. Extend here; unknown types fall through to "unknown". */
export const RELATIONSHIP_WEIGHTS: Readonly<Record<string, RelationshipTier>> = {
  spouse: "high",
  husband: "high",
  wife: "high",
  partner: "high",
  parent: "high",
  mother: "high",
  father: "high",
  mom: "high",
  dad: "high",
  child: "high",
  son: "high",
  daughter: "high",
  sibling: "medium",
  brother: "medium",
  sister: "medium",
  friend: "medium",
  caregiver: "medium",
  carer: "medium",
  grandparent: "medium",
  grandchild: "medium",
  colleague: "low",
  acquaintance: "low",
  neighbour: "low",
  neighbor: "low",
};

/**
 * DECAY CONFIG — older memories slowly lose ranking, but protected classes never decay aggressively.
 * Deterministic: decay is a pure function of age + class + reinforcement (the engine is given `now`).
 */
export const DECAY_CONFIG = {
  /** Exponential half-life (days) for an ordinary memory's decay factor. Long, so life memories aren't buried. */
  baseHalfLifeDays: 1825, // 5 years
  /** Milestone memories decay VERY slowly. */
  milestoneHalfLifeDays: 18250, // 50 years
  /** The floor a decay factor can reach for an ordinary memory (never fully forgotten). */
  minDecayFactor: 0.2,
  /** Categories that NEVER decay (factor pinned at 1). */
  neverDecayCategories: ["medical", "emergency", "health"] as MemoryCategory[],
  /** Categories that decay very slowly (use `milestoneHalfLifeDays`). */
  slowDecayCategories: ["milestones", "childhood", "family"] as MemoryCategory[],
  /** Each reinforcement event effectively rewinds a memory's age by this many days (recall regains importance). */
  reinforcementRewindDaysPerEvent: 180,
  /** Cap on the total rewind from reinforcement (days). */
  maxReinforcementRewindDays: 3650,
} as const;

/**
 * REINFORCEMENT CONFIG — repeated successful retrieval increases confidence; down-ranking (future feedback)
 * reduces it. Deterministic pure math.
 */
export const REINFORCEMENT_CONFIG = {
  /** Confidence gained per successful retrieval (saturating). */
  perRetrieval: 0.08,
  /** Confidence lost per "this memory was wrong" down-rank event. */
  perDownRank: 0.25,
  /** Saturation constant for retrieval-count → 0..1 (n/(n+k)). */
  retrievalSaturationK: 8,
  /** Baseline confidence when nothing is known yet. */
  baseline: 0.5,
} as const;

/**
 * RANKING WEIGHTS — the FINAL combined ranking score = weighted blend of the six retrieval signals. This is the
 * configurable "retrieval improvements" algorithm (Semantic + Importance + Relationship + Recency +
 * Reinforcement + Confidence). Normalised by the total weight → 0..1. Semantic stays primary (recall leads).
 */
export const RANKING_WEIGHTS = {
  semantic: 0.4,
  importance: 0.2,
  relationship: 0.14,
  recency: 0.12,
  reinforcement: 0.08,
  confidence: 0.06,
} as const;
export type RankingSignalKey = keyof typeof RANKING_WEIGHTS;

/**
 * FORGOTTEN-MEMORY thresholds — internal detection of neglected memories worth resurfacing. Deterministic.
 */
export const FORGOTTEN_CONFIG = {
  /** Never recalled AND older than this many days → a "never recalled" candidate. */
  neverRecalledAgeDays: 365,
  /** Last recalled more than this many days ago → "stale". */
  staleAfterDays: 540,
  /** Importance below this (0..1) → "lost significance". */
  lostSignificanceBelow: 0.25,
  /** Max forgotten memories surfaced per pass (bounded). */
  maxResults: 25,
} as const;
