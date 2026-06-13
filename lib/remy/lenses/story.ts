import { deriveLifeJourneySignals } from "../life-journey-signals";
import { deriveStorySignals } from "../story-signals";
import type { Lens, LensContext, UnderstandingFacet } from "./types";

/**
 * Story Lens — Remy as narrator. The canonical owner of narrative readiness:
 * how much of a story exists, whether it can be told, and whether Biography /
 * Memory Book / Story Mode have enough material.
 *
 * Deterministic (no AI): readiness is derived from chapter count + the life
 * journey span via deriveStorySignals — documentation-grounded, never
 * speculative, no personality inference. Emits one readiness facet sized to the
 * narrative's coverage so it doesn't crowd the other lenses.
 *
 * SEAM: deriveStorySignals (lib/remy/story-signals.ts) is the reusable input for
 * Story Mode (ordering), Biography (span/availability), Memory Book (assembly)
 * and Voice (narration) — see story-signals.ts.
 */
export const storyLens: Lens = {
  id: "story",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    const journey = deriveLifeJourneySignals(
      ctx.decades,
      ctx.birthYear,
      ctx.now,
    );
    const story = deriveStorySignals({
      chapterCount: ctx.chapterCount,
      strongestChapterTitle: journey.strongestDecade
        ? `The ${journey.strongestDecade.decade}s`
        : null,
      earliestYear: journey.earliestDecade,
      latestYear: journey.latestDecade,
    });

    if (story.narrativeCoverage === "developed") {
      return [
        {
          lensId: "story",
          kind: "story-ready",
          priority: 52,
          tone: "celebratory",
          role: "storyteller",
          label: `Enough chapters exist to tell ${ctx.subject.name}'s story`,
          detail: story.hasMemoryBook
            ? `${story.chapterCount} chapters · biography & memory book ready`
            : `${story.chapterCount} chapters documented`,
          lens: { label: "Story", href: "/library/story" },
        },
      ];
    }

    if (story.narrativeCoverage === "growing") {
      return [
        {
          lensId: "story",
          kind: "narrative-growth",
          priority: 44,
          tone: "encouraging",
          role: "storyteller",
          label:
            story.chapterCount === 1
              ? `${ctx.subject.name}'s story is just beginning`
              : `${ctx.subject.name}'s story is taking shape`,
          detail: `${story.chapterCount} ${
            story.chapterCount === 1 ? "chapter" : "chapters"
          } preserved`,
          lens: { label: "Story", href: "/library/story" },
        },
      ];
    }

    return [];
  },
};
