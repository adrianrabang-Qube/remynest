import type { Lens, LensContext, UnderstandingFacet } from "./types";
import { cap, coverageLevel, monthsSince } from "./shared";

/**
 * Preservation Lens — Remy as guide and memory-keeper. Understands how complete
 * the record is: coverage level, undated memories, and how recently the story
 * has grown. The era-gap facet ("the 1990s remain lightly documented") is owned
 * by the Life Journey lens — Preservation keeps only the dating-completeness
 * nudge. Copy is invitational, never judgmental.
 */
export const preservationLens: Lens = {
  id: "preservation",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    const out: UnderstandingFacet[] = [];
    const { memoryCount, datedCount } = ctx;

    // Memories not yet placed in time — Life Journey can't see them until dated.
    if (datedCount < 2 && memoryCount >= 3) {
      out.push({
        lensId: "preservation",
        kind: "missing-knowledge",
        priority: 55,
        tone: "gentle",
        role: "guide",
        label: `Most of ${ctx.subject.name}'s memories aren't placed in time yet`,
        detail: "Add dates so Remy can build the timeline",
        lens: { label: "Add dates", href: "/memory-dates" },
      });
    }

    // Coverage level — how complete Remy's understanding is.
    const level = coverageLevel(memoryCount, ctx.coveragePercentage);
    out.push({
      lensId: "preservation",
      kind: "coverage",
      priority: 40,
      tone: "informative",
      role: "guide",
      label: `Life story coverage: ${cap(level)}`,
      detail: `${datedCount} of ${memoryCount} memories dated`,
      lens: { label: "Story", href: "/library/story" },
    });

    // Recency — how actively the story is growing.
    if (ctx.lastActivityAt) {
      const months = monthsSince(ctx.lastActivityAt, ctx.now);
      out.push({
        lensId: "preservation",
        kind: "recency",
        priority: 30,
        tone: months <= 1 ? "encouraging" : "informative",
        role: "memory-keeper",
        label:
          months < 1
            ? "Added to this month"
            : `Last added ${months} ${months === 1 ? "month" : "months"} ago`,
        lens: { label: "Memories", href: "/memories" },
      });
    }

    return out;
  },
};
