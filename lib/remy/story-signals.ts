/**
 * Story signals — the deterministic narrative-readiness of a life: how much of a
 * story exists, whether it can be told, and whether Biography / Memory Book /
 * Story Mode have enough material. No AI, no queries: a pure reduction over
 * already-known chapter/story/biography facts.
 *
 * This is the canonical narrative-signal source. The Story lens consumes it for
 * person/workspace understanding; Story Mode / Biography / Memory Book / Voice
 * can consume it next (see SEAMS in lib/remy/life-journey-signals.ts and the
 * Story lens) instead of re-deriving readiness.
 */

export interface StorySignals {
  chapterCount: number;
  storyCount: number;
  hasStory: boolean;
  hasBiography: boolean;
  hasMemoryBook: boolean;
  narrativeReady: boolean;
  strongestChapterTitle: string | null;
  earliestYear: number | null;
  latestYear: number | null;
  narrativeCoverage: "nascent" | "growing" | "developed";
}

export interface StorySignalsInput {
  /** Life chapters (decades with enough dated memories) — the readiness driver. */
  chapterCount: number;
  /** Guided stories (one per chapter in Story Mode). Defaults to chapterCount. */
  storyCount?: number;
  /** Title of the most-documented chapter, if known. */
  strongestChapterTitle?: string | null;
  /** Span of the documented life, if known. */
  earliestYear?: number | null;
  latestYear?: number | null;
  /** Real artifact availability (from the synthesizers); defaults derive from chapterCount. */
  hasStory?: boolean;
  hasBiography?: boolean;
  hasMemoryBook?: boolean;
}

/** A memory book needs more than one chapter to be a "book". */
const MEMORY_BOOK_MIN_CHAPTERS = 2;
/** A developed narrative has several documented chapters. */
const DEVELOPED_MIN_CHAPTERS = 3;

export function deriveStorySignals(input: StorySignalsInput): StorySignals {
  const chapterCount = Math.max(0, Math.floor(input.chapterCount));
  const storyCount = input.storyCount ?? chapterCount;
  const hasStory = input.hasStory ?? chapterCount >= 1;
  const hasBiography = input.hasBiography ?? chapterCount >= 1;
  const hasMemoryBook =
    input.hasMemoryBook ?? chapterCount >= MEMORY_BOOK_MIN_CHAPTERS;
  const narrativeReady = hasStory;
  const narrativeCoverage: StorySignals["narrativeCoverage"] =
    chapterCount === 0
      ? "nascent"
      : chapterCount >= DEVELOPED_MIN_CHAPTERS
        ? "developed"
        : "growing";

  return {
    chapterCount,
    storyCount,
    hasStory,
    hasBiography,
    hasMemoryBook,
    narrativeReady,
    strongestChapterTitle: input.strongestChapterTitle ?? null,
    earliestYear: input.earliestYear ?? null,
    latestYear: input.latestYear ?? null,
    narrativeCoverage,
  };
}
