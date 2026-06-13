import { LENSES } from "./lenses";
import { coverageLevel } from "./lenses/shared";
import type {
  CoverageLevel,
  DecadeBucket,
  LensContext,
  UnderstandingFacet,
} from "./lenses/types";

/**
 * Remy's Understanding Engine — the orchestrator of the lens architecture.
 *
 *   Signals → Lenses → Facets → (future) Observations → (future) Voice
 *
 * This module gathers a subject's normalized signals into a LensContext, runs
 * the deterministic lens registry (lib/remy/lenses/*), then merges, ranks and
 * summarizes the facets into a RemyUnderstanding. It is renderer-agnostic and
 * has NO AI / model calls. New perspectives are added as lenses, not as rules
 * here — the orchestrator never needs to change.
 *
 * Public API (buildPersonUnderstanding, bucketDecades, the exported types) is
 * stable; the only consumers are Profile Detail and the RemyUnderstanding
 * renderer, both of which keep working unchanged.
 */

// Re-export the lens/facet contract so existing imports
// (`@/lib/remy/understanding`) keep resolving.
export type {
  CoverageLevel,
  DecadeBucket,
  LensId,
  RemyRole,
  UnderstandingFacet,
  UnderstandingFacetKind,
  UnderstandingLens,
} from "./lenses/types";

export interface RemyUnderstanding {
  subject: { id: string; name: string };
  level: CoverageLevel;
  /** Too little evidence to characterize the subject yet. */
  isNascent: boolean;
  /** Condensed one-liner for compact renderers (rows, search hits). */
  summary: string;
  /** Ranked, gated facets (empty when there's nothing to say yet). */
  facets: UnderstandingFacet[];
}

export interface UnderstandingInput {
  subject: { id: string; name: string };
  memoryCount: number;
  datedCount: number;
  /** Life chapters (decades with enough dated memories); drives narrative readiness. */
  chapterCount?: number;
  /** Top themes (from getFamilyIntelligence), most-documented first. */
  themes: { label: string; memoryCount: number }[];
  coveragePercentage: number;
  /** Per-decade dated-memory counts (from bucketDecades). */
  decades: DecadeBucket[];
  birthYear: number | null;
  relationshipLabel: string | null;
  /** Themes the wider family shares (≥2 profiles); optional. */
  sharedFamilyThemes?: { label: string }[];
  lastActivityAt: string | null;
  /** Injectable for deterministic output (tests). */
  now?: Date;
}

const MAX_FACETS = 6;

/** Bucket raw memory dates into per-decade counts (ascending by decade). */
export function bucketDecades(
  dates: (string | null | undefined)[],
): DecadeBucket[] {
  const counts = new Map<number, number>();
  for (const value of dates) {
    if (!value) continue;
    const year = new Date(value).getFullYear();
    if (Number.isNaN(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade - b.decade);
}

/**
 * Build Remy's understanding of one person by running the lens registry over a
 * normalized LensContext. Every facet is gated by minimum evidence inside its
 * lens, so Remy never overclaims.
 */
export function buildPersonUnderstanding(
  input: UnderstandingInput,
): RemyUnderstanding {
  const now = input.now ?? new Date();
  const { subject, memoryCount } = input;
  const level = coverageLevel(memoryCount, input.coveragePercentage);
  const isNascent = memoryCount < 3;

  if (memoryCount === 0) {
    return {
      subject,
      level,
      isNascent: true,
      summary: `Just getting to know ${subject.name}.`,
      facets: [],
    };
  }

  const context: LensContext = {
    subject,
    memoryCount,
    datedCount: input.datedCount,
    chapterCount: input.chapterCount ?? 0,
    themes: input.themes,
    coveragePercentage: input.coveragePercentage,
    decades: input.decades,
    birthYear: input.birthYear,
    relationshipLabel: input.relationshipLabel,
    sharedFamilyThemes: input.sharedFamilyThemes,
    lastActivityAt: input.lastActivityAt,
    now,
  };

  const facets = LENSES.flatMap((lens) => lens.deriveFacets(context))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_FACETS);

  const summary = isNascent
    ? `Just getting to know ${subject.name}.`
    : facets
        .slice(0, 2)
        .map((f) => f.label)
        .join(" · ");

  return { subject, level, isNascent, summary, facets };
}
