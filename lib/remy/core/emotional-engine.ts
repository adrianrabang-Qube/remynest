/**
 * Remy Platform (v2) — EMOTIONAL INTELLIGENCE ENGINE (pure).
 *
 * Remy understands memories; this makes it understand PEOPLE and emotional SIGNIFICANCE rather than
 * quantity. From real relationship data it derives an `EmotionalProfile`: the most significant
 * person / memory, the strongest chapter, the most active relationship, the most revisited memory,
 * the most emotional category, and four internal 0–100 scores (family strength, life continuity,
 * relationship health, memory preservation). Pure: no React/DOM/DB/timers/clock. The scores are
 * INTERNAL — never rendered raw; the relationship + personality engines translate them to behaviour.
 */
import type {
  DatedMemory,
  EmotionalProfile,
  FavouritePerson,
  LifeChapter,
  LifeSummary,
  SignificantMemory,
} from "./family-types";

export interface EmotionalInput {
  memoryCount: number;
  peopleTotal: number;
  daysSinceLastVisit: number | null;
  summary: LifeSummary;
  favourites: FavouritePerson[];
  chapters: LifeChapter[];
  significant: SignificantMemory[];
  revisited: SignificantMemory[];
  memories: DatedMemory[];
  /** 0–1: share of memories with at least one attachment (caller-computed, reused across engines). */
  attachmentRatio: number;
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function buildEmotionalProfile(input: EmotionalInput): EmotionalProfile {
  const familyStrength = clamp(input.peopleTotal * 8 + Math.min(60, input.memoryCount / 2));
  const lifeContinuity = clamp(input.chapters.length * 16 + spanBonus(input.chapters));
  const relationshipHealth = clamp(relationshipHealthScore(input.daysSinceLastVisit, input.memoryCount));
  const memoryPreservation = clamp(Math.min(70, input.memoryCount) + input.attachmentRatio * 30);

  return {
    mostSignificantPerson: input.favourites[0] ?? null,
    mostSignificantMemory: input.significant[0] ?? null,
    strongestChapter: pickStrongestChapter(input.chapters),
    // "Most active" = the person the family remembers most (top favourite); distinct field kept for
    // future recency-weighted activity data.
    mostActiveRelationship: input.favourites[0] ?? null,
    mostRevisitedMemory: input.revisited[0] ?? null,
    mostEmotionalCategory: pickTopCategory(input.memories),
    familyStrength,
    lifeContinuity,
    relationshipHealth,
    memoryPreservation,
  };
}

/** The chapter with the most memories (tiebreak: the longest span). */
function pickStrongestChapter(chapters: LifeChapter[]): LifeChapter | null {
  let best: LifeChapter | null = null;
  let bestScore = -1;
  for (const c of chapters) {
    const span = Math.max(0, Date.parse(c.endIso) - Date.parse(c.startIso));
    const score = c.count * 10 + (Number.isNaN(span) ? 0 : span / (365 * 24 * 60 * 60 * 1000));
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** The category shared by the most memories. */
function pickTopCategory(memories: DatedMemory[]): string | null {
  const counts = new Map<string, number>();
  for (const m of memories) {
    if (m.category) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

/** More decades of continuous chapters → higher continuity. */
function spanBonus(chapters: LifeChapter[]): number {
  if (chapters.length < 2) return 0;
  const first = Date.parse(chapters[0].startIso);
  const last = Date.parse(chapters[chapters.length - 1].endIso);
  if (Number.isNaN(first) || Number.isNaN(last)) return 0;
  const years = (last - first) / (365 * 24 * 60 * 60 * 1000);
  return Math.min(40, years);
}

/** Recent + frequent engagement → healthier. */
function relationshipHealthScore(daysSinceLastVisit: number | null, memoryCount: number): number {
  const recency =
    daysSinceLastVisit == null
      ? 60
      : daysSinceLastVisit <= 1
        ? 90
        : daysSinceLastVisit <= 3
          ? 75
          : daysSinceLastVisit <= 7
            ? 55
            : daysSinceLastVisit <= 21
              ? 35
              : 20;
  const depth = Math.min(20, memoryCount / 5);
  return recency * 0.8 + depth;
}
