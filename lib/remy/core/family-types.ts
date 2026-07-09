/**
 * Remy Platform (v2) — LIVING RELATIONSHIP SYSTEM shared types (pure).
 *
 * The common vocabulary for the relationship / story / anniversary / favourite / legacy engines,
 * kept in one module so the engines never import one another circularly. Pure data only — no
 * React/DOM/DB. Every field maps to REAL stored data gathered by the relationship snapshot loader.
 */
import type { RemyBehavior } from "./behavior";

export type DatePrecision = "day" | "month" | "year" | "decade";

/** A memory with a real effective date (`memory_date` ?? `created_at`) — the story/anniversary unit. */
export interface DatedMemory {
  id: string;
  title: string;
  /** Effective date, ISO. */
  dateIso: string;
  precision: DatePrecision;
  /** ai_category if enriched, else null. */
  category: string | null;
  // --- Optional significance signals (present when the relationship snapshot enriches them) ---
  /** Number of media attachments. */
  attachmentCount?: number;
  /** ai_importance (0–100) if enriched. */
  importance?: number;
  /** Person ids linked to this memory (from memory_person_links). */
  peopleIds?: string[];
  /** True when the memory carries a real historical `memory_date` (not just its created_at). */
  historical?: boolean;
}

/** A person extracted from memories (the `people` table), with how many memories mention them. */
export interface FamilyPerson {
  id: string;
  name: string;
  memoryCount: number;
}

/** An automatically-inferred life chapter (a contiguous period of memories). */
export interface LifeChapter {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  memoryIds: string[];
  count: number;
}

/** A memory whose real anniversary is today. */
export interface Anniversary {
  memoryId: string;
  title: string;
  yearsAgo: number;
  dateIso: string;
}

/** A person ranked by how present they are in the family's remembering. */
export interface FavouritePerson {
  id: string;
  name: string;
  memoryCount: number;
  score: number;
}

/** The minimal shape the Priority Engine ranks + cooldown-gates. */
export interface RankableMoment {
  kind: string;
  importance: number;
  urgency: number;
  cooldownMs: number;
}

/** A long-term relationship observation Remy may surface. */
export interface RelationshipObservation extends RankableMoment {
  message: string;
  behavior: RemyBehavior;
}

/** A structured, non-AI life summary (consumed by future timeline screens + the legacy export). */
export interface LifeSummary {
  timeline: { startIso: string | null; endIso: string | null; memoryCount: number };
  chapters: LifeChapter[];
  keyPeople: FavouritePerson[];
  majorEvents: { memoryId: string; title: string; dateIso: string }[];
  importantMemories: DatedMemory[];
}

/** A memory ranked by emotional significance (not recency). `score` is INTERNAL — never shown. */
export interface SignificantMemory {
  id: string;
  title: string;
  dateIso: string;
  score: number;
}

/**
 * Remy's emotional understanding of a family. The named entities are surfaced as behaviours; the
 * 0–100 scores are INTERNAL signals only — never rendered raw (the relationship/personality engines
 * translate them to observations + traits).
 */
export interface EmotionalProfile {
  mostSignificantPerson: FavouritePerson | null;
  mostSignificantMemory: SignificantMemory | null;
  strongestChapter: LifeChapter | null;
  mostActiveRelationship: FavouritePerson | null;
  mostRevisitedMemory: SignificantMemory | null;
  mostEmotionalCategory: string | null;
  familyStrength: number;
  lifeContinuity: number;
  relationshipHealth: number;
  memoryPreservation: number;
}

/** Long-term behavioural traits Remy infers about the family. Exposed as behaviours, never scores. */
export type PersonalityTrait =
  | "family-historian"
  | "memory-guardian"
  | "story-teller"
  | "legacy-builder"
  | "care-champion"
  | "photo-collector"
  | "daily-rememberer"
  | "occasional-visitor";

/** Real signals the personality engine reasons over (all caller-derived; no clock/DB). */
export interface PersonalitySignals {
  memoryCount: number;
  chapterCount: number;
  peopleCount: number;
  /** 0–1: share of memories with at least one attachment. */
  attachmentRatio: number;
  /** 0–1: share of memories with a real historical date. */
  datedRatio: number;
  daysSinceLastVisit: number | null;
  isCareWorkspace: boolean;
  /** Internal 0–100 scores from the emotional profile. */
  memoryPreservation: number;
  lifeContinuity: number;
}

/**
 * MEMORY UNDERSTANDING — the internal semantic understanding of a single memory, derived
 * deterministically from REAL stored data (no GPT, no prose, no fabrication). Structured data only;
 * this layer is not shown in the UI — it is the input for current + future engines.
 */
export type LifeStage =
  | "childhood"
  | "teen-years"
  | "early-adult"
  | "family-life"
  | "later-years"
  | "unknown";

export type MemoryImportance = "ordinary" | "important" | "major" | "legacy";

export type MemoryTheme =
  | "family"
  | "travel"
  | "celebration"
  | "achievement"
  | "health"
  | "pets"
  | "home"
  | "work"
  | "education"
  | "friendship"
  | "care"
  | "relationships"
  | "other";

export interface MemoryRelationship {
  /** The most corpus-significant person in the memory (else the first), or null. */
  primaryPerson: string | null;
  secondaryPeople: string[];
  participants: number;
  isFamilyMemory: boolean;
  isIndividualMemory: boolean;
}

export interface MemoryUnderstanding {
  id: string;
  timeSpan: { dateIso: string; year: number; precision: DatePrecision };
  /** True when the memory carries a real historical date. */
  historical: boolean;
  lifeStage: LifeStage;
  themes: MemoryTheme[];
  dominantCategories: string[];
  eventType: string | null;
  importance: MemoryImportance;
  /** Media richness (attachment count). */
  attachmentRichness: number;
  /** Emotional richness (0–100, from the AI importance signal). */
  emotionalRichness: number;
  /** Relationship richness (0–100, from the number of people involved). */
  relationshipRichness: number;
  relationship: MemoryRelationship;
  /** How much REAL signal backed this understanding (0–100). */
  confidence: number;
}

/**
 * MEMORY GRAPH — the semantic web of how memories connect. Built deterministically from the
 * `MemoryUnderstanding` layer (real shared attributes only — no GPT, no fabricated links). Internal;
 * the foundation for future related-memories / journeys / semantic-search / reasoning.
 */
export type MemoryEdgeType =
  | "same-person"
  | "same-family"
  | "same-theme"
  | "same-chapter"
  | "same-year"
  | "same-category"
  | "same-event"
  | "same-life-stage";

export type ConnectionStrength = "weak" | "moderate" | "strong";

export interface MemoryNode {
  id: string;
  year: number;
  primaryPerson: string | null;
  themes: MemoryTheme[];
  importance: MemoryImportance;
  lifeStage: LifeStage;
}

export interface MemoryEdge {
  source: string;
  target: string;
  /** Which real shared attributes connect the two memories. */
  types: MemoryEdgeType[];
  /** Deterministic connection weight (sum of shared-attribute weights). */
  weight: number;
  strength: ConnectionStrength;
}

export interface MemoryCluster {
  id: string;
  label: string;
  theme: MemoryTheme;
  memoryIds: string[];
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  clusters: MemoryCluster[];
}

/**
 * JOURNEYS — a Journey is a structured collection of connected memories representing ONE continuous
 * part of a life (School Years, Career, Family Holidays, Medical Journey, …). Built deterministically
 * from the understanding + graph layers (real shared theme / life-stage / people / chronology only —
 * no GPT, no fabricated years or transitions). Internal; the foundation for future intelligence.
 */
export type JourneyImportance = "minor" | "notable" | "major" | "defining";

/** A chronological point on a journey's timeline — the memories that fall in one year. */
export interface JourneyStage {
  year: number;
  memoryIds: string[];
}

/** The chronological structure of a journey (real years only; `0` when a memory is undated). */
export interface JourneyTimeline {
  startYear: number;
  endYear: number;
  stages: JourneyStage[];
}

export interface Journey {
  id: string;
  title: string;
  memoryIds: string[];
  dominantTheme: MemoryTheme;
  /** Person ids most present across the journey (most-frequent first, max 3). */
  dominantPeople: string[];
  lifeStage: LifeStage;
  startYear: number;
  endYear: number;
  /** 0–100 emotional weight of the journey (INTERNAL — never shown raw). */
  significance: number;
  /** 0–100 how chronologically continuous the journey is (fewer/smaller year gaps = higher). */
  continuity: number;
  importance: JourneyImportance;
  timeline: JourneyTimeline;
}

/** A real link between two journeys (shared people and/or the same dominant theme). */
export interface JourneyConnection {
  source: string;
  target: string;
  sharedPeople: string[];
  sharedTheme: boolean;
  /** Deterministic connection weight (shared people + shared theme). */
  strength: number;
}

/** A structured overview of all journeys (no prose). */
export interface JourneySummary {
  journeyCount: number;
  totalJourneyMemories: number;
  /** The highest-significance journey id, or null when none formed. */
  dominantJourneyId: string | null;
  themes: MemoryTheme[];
}

/** The Journey Engine's complete output. */
export interface JourneyAnalysis {
  journeys: Journey[];
  connections: JourneyConnection[];
  summary: JourneySummary;
}

/**
 * LIFE STORY — the canonical, structured chronological representation of a life, assembled ONLY from
 * real journeys (`JourneyAnalysis`). A chapter is a run of chronologically-continuous, connected
 * journeys; the timeline / milestones / summary are structured references to EXISTING journeys, years,
 * and memories — never generated prose, never invented chronology, never merged disconnected journeys.
 * Internal; the canonical source for future AI conversation / biography / timeline UI / story-book
 * export / memory reconstruction / reasoning.
 */
export interface LifeStoryChapter {
  id: string;
  /** Reuses a real constituent journey title — no generated prose. */
  title: string;
  journeyIds: string[];
  memoryIds: string[];
  dominantTheme: MemoryTheme;
  lifeStage: LifeStage;
  startYear: number;
  endYear: number;
  /** 0–100 how chronologically continuous the chapter's journeys are. */
  continuity: number;
  /** 0–100 how central this chapter is to the whole life story (share of the story + continuity). */
  centrality: number;
}

/** A real anchoring point in the story (a chapter's start, or its most significant real memory). */
export interface LifeStoryMilestone {
  id: string;
  year: number;
  journeyId: string;
  chapterId: string;
  /** A real anchoring memory when one is available, else null. */
  memoryId: string | null;
  kind: "chapter-start" | "significant-memory";
  /** Reuses a real chapter/journey title — no generated prose. */
  label: string;
}

/** One chronological entry on the story timeline — a reference to an existing journey. */
export interface LifeStoryTimelineEntry {
  journeyId: string;
  chapterId: string;
  startYear: number;
  endYear: number;
}

/** The structured story timeline — existing journeys + existing years only (no narration). */
export interface LifeStoryTimeline {
  startYear: number;
  endYear: number;
  entries: LifeStoryTimelineEntry[];
}

export interface LifeStory {
  id: string;
  /** A factual label built from real span metadata — never narration. */
  title: string;
  /** Journey ids in chronological order. */
  journeys: string[];
  startYear: number;
  endYear: number;
  dominantTheme: MemoryTheme;
  /** 0–100 overall chronological continuity of the story. */
  continuity: number;
}

/** Structured metadata about the whole story (no prose). */
export interface LifeStorySummary {
  dominantTheme: MemoryTheme;
  firstJourneyId: string | null;
  latestJourneyId: string | null;
  journeyCount: number;
  chapterCount: number;
  /** Count of distinct real years the story's journeys cover. */
  coveredYears: number;
  /** Journeys per life stage that actually appears in the story. */
  lifeStageCoverage: Partial<Record<LifeStage, number>>;
  continuityScore: number;
}

/** The Life Story Engine's complete output. */
export interface LifeStoryAnalysis {
  story: LifeStory;
  chapters: LifeStoryChapter[];
  timeline: LifeStoryTimeline;
  milestones: LifeStoryMilestone[];
  summary: LifeStorySummary;
}

/**
 * REASONING — Remy's structural understanding OF a life, reasoned deterministically from the real
 * journey / life-story / graph / understanding layers. It surfaces the dominant structural anchors,
 * lifetime themes, most-influential people, structured relationship importance, and FACTUAL gaps —
 * all as structured data (never prose, never AI, never fabricated/inferred content). Internal; the
 * foundation for future reasoning / conversation / biography surfaces.
 */
export interface LifeAnchor {
  id: string;
  theme: MemoryTheme;
  journeyIds: string[];
  memoryIds: string[];
  /** 0–100 structural strength of this anchor across the whole life. */
  strength: number;
  /** 0–100 how much REAL signal (dated / documented / peopled memories) backs it. */
  confidence: number;
}

/** A dominant lifetime theme, from the real journey distribution (no prose). */
export interface LifeTheme {
  theme: MemoryTheme;
  memoryCount: number;
  journeyCount: number;
  /** 0–100 share of the life's journey-memories. */
  share: number;
}

/** A person with real lifetime influence, derived from journeys + understandings + graph. */
export interface LifeInfluence {
  personId: string;
  memoryCount: number;
  journeyCount: number;
  /** Total memory-graph degree across the person's memories. */
  graphConnections: number;
  /** 0–100 composite lifetime influence. */
  influence: number;
}

/** Structured relationship importance (counts only — no emotional interpretation). */
export interface RelationshipStrength {
  personId: string;
  memoryCount: number;
  journeyCount: number;
  /** Number of distinct other people who share a memory with this person. */
  coAppearances: number;
  /** 0–100 structural strength. */
  strength: number;
}

export type MemoryGapKind =
  | "year-gap"
  | "sparse-life-stage"
  | "missing-life-stage"
  | "weak-documentation";

/** A FACTUAL documentation gap — structured only; Remy never guesses WHY it exists. */
export interface MemoryGap {
  id: string;
  kind: MemoryGapKind;
  /** For a year-gap: the bounding real years; 0 when not applicable. */
  startYear: number;
  endYear: number;
  /** For a life-stage gap: the stage; null when not applicable. */
  lifeStage: LifeStage | null;
  /** Factual magnitude — a gap length in years, or the (low) memory count. Never a reason. */
  magnitude: number;
}

/** Structured metadata about the reasoning pass (no prose). */
export interface ReasoningSummary {
  dominantAnchor: string | null;
  dominantTheme: MemoryTheme;
  strongestRelationship: string | null;
  /** 0–100 how much real structure the reasoning could derive. */
  reasoningDepth: number;
  /** 0–100 aggregate confidence in the reasoning. */
  confidence: number;
  /** 0–100 how much of the life is covered / documented. */
  lifeCoverage: number;
}

/** The Reasoning Engine's complete output. */
export interface ReasoningAnalysis {
  anchors: LifeAnchor[];
  themes: LifeTheme[];
  influences: LifeInfluence[];
  relationshipStrengths: RelationshipStrength[];
  gaps: MemoryGap[];
  summary: ReasoningSummary;
}

/**
 * BIOGRAPHY — a structured representation of a life, assembled ONLY from the real journey / life-story
 * / reasoning / graph / understanding layers. It is NOT generated prose: every section / period /
 * reference points at REAL journeys / chapters / anchors / themes / people / memories, and every metric
 * is a structured number. No paragraphs, no narration, no fabrication. Internal; the foundation for a
 * future biography / story-book renderer that resolves these references to real data.
 */
export interface BiographySection {
  id: string;
  /** Reuses a real life-story chapter title — no generated prose. */
  title: string;
  journeyIds: string[];
  chapterIds: string[];
  memoryIds: string[];
  theme: MemoryTheme;
  lifeStage: LifeStage;
  /** 0–100 how much of the documented life this section covers (breadth). */
  coverage: number;
  /** 0–100 how well-backed by real signal the section is (dated / media / peopled). */
  confidence: number;
}

/** A real chronological period (grouped by life stage); years come only from real memory dates. */
export interface BiographyPeriod {
  id: string;
  startYear: number;
  endYear: number;
  sectionIds: string[];
  lifeStage: LifeStage;
  memoryCount: number;
}

export type BiographyReferenceKind =
  | "journey"
  | "chapter"
  | "anchor"
  | "theme"
  | "person"
  | "memory";

/** A pointer to a REAL referenced entity (never fabricated), and the section it belongs to (if any). */
export interface BiographyReference {
  kind: BiographyReferenceKind;
  refId: string;
  sectionId: string | null;
}

/** Structured coverage metrics for the whole biography (no prose). */
export interface BiographyCoverage {
  memoryCoverage: number;
  journeyCoverage: number;
  chapterCoverage: number;
  lifeStageCoverage: number;
  timelineCoverage: number;
  confidence: number;
}

/** Structured biography metadata (no prose). */
export interface BiographySummary {
  dominantTheme: MemoryTheme;
  dominantAnchor: string | null;
  coveredYears: number;
  coverage: number;
  confidence: number;
}

/** The Biography Engine's complete output. */
export interface BiographyAnalysis {
  sections: BiographySection[];
  periods: BiographyPeriod[];
  references: BiographyReference[];
  coverage: BiographyCoverage;
  summary: BiographySummary;
}

/** A structured export object a future generator (PDF/book) will consume. No rendering here. */
export interface LegacyExport {
  title: string;
  timeline: LifeSummary["timeline"];
  chapters: {
    title: string;
    period: string;
    memories: { title: string; dateIso: string }[];
  }[];
  keyPeople: { name: string; memoryCount: number }[];
  majorEvents: { title: string; dateIso: string }[];
}
