import { findGapDecade } from "./lenses/shared";
import type { DecadeBucket } from "./lenses/types";

/**
 * Life Journey signals — the deterministic time-shape of a life, derived from
 * decade buckets (from bucketDecades) + an optional birth year. No AI, no
 * queries: pure reduction over already-loaded dated-memory decades.
 *
 * This is the canonical time-signal source for every surface that reasons about
 * time. The Life Journey lens consumes it today; Story / Biography / Memory Book
 * / Voice can consume it next (see SEAMS below) instead of re-deriving spans:
 *
 *   • Story      → order chapters by strongestDecade / span; flag missingDecade.
 *   • Biography  → replace ad-hoc spanStart/spanEnd with earliest/latestDecade.
 *   • MemoryBook → chapter ordering + "gaps to fill" prompts from missingDecade.
 *   • Voice      → narrate the span/strongest/missing as spoken understanding.
 */
export interface LifeJourneySignals {
  /** Decade with the most memories, or null when there's no timeline. */
  strongestDecade: { decade: number; count: number } | null;
  /** Earliest / latest decade with any memories. */
  earliestDecade: number | null;
  latestDecade: number | null;
  /** Distinct decades with ≥1 memory. */
  documentedDecadeCount: number;
  /** Decades from earliest to latest inclusive (the span breadth). */
  spanDecadeCount: number;
  /** Earliest empty decade within the plausible lifespan, or null. */
  missingDecade: number | null;
  /** The missing decade falls in the subject's early years (needs birthYear). */
  missingIsEarlyYears: boolean;
  /** Any dated memories at all. */
  hasTimeline: boolean;
}

export function deriveLifeJourneySignals(
  decades: DecadeBucket[],
  birthYear: number | null,
  now: Date = new Date(),
): LifeJourneySignals {
  if (decades.length === 0) {
    return {
      strongestDecade: null,
      earliestDecade: null,
      latestDecade: null,
      documentedDecadeCount: 0,
      spanDecadeCount: 0,
      missingDecade: null,
      missingIsEarlyYears: false,
      hasTimeline: false,
    };
  }

  const byDecade = [...decades].sort((a, b) => a.decade - b.decade);
  const earliestDecade = byDecade[0].decade;
  const latestDecade = byDecade[byDecade.length - 1].decade;
  const strongest = [...decades].sort((a, b) => b.count - a.count)[0];
  const missingDecade = findGapDecade(decades, birthYear, now);
  const birthDecade =
    birthYear != null ? Math.floor(birthYear / 10) * 10 : null;
  const missingIsEarlyYears =
    birthDecade != null &&
    missingDecade != null &&
    missingDecade <= birthDecade + 10;

  return {
    strongestDecade: { decade: strongest.decade, count: strongest.count },
    earliestDecade,
    latestDecade,
    documentedDecadeCount: decades.length,
    spanDecadeCount: (latestDecade - earliestDecade) / 10 + 1,
    missingDecade,
    missingIsEarlyYears,
    hasTimeline: true,
  };
}
