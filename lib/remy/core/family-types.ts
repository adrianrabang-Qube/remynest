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
