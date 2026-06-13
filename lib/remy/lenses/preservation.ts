import type { Lens, LensContext, UnderstandingFacet } from "./types";
import { cap, coverageLevel, findGapDecade, monthsSince } from "./shared";

/**
 * Preservation Lens — Remy as guide and memory-keeper. Understands how complete
 * the record is and what's missing: coverage level, the earliest gap (or undated
 * memories), and how recently the story has grown. Missing-knowledge copy is
 * invitational, never judgmental.
 */
export const preservationLens: Lens = {
  id: "preservation",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    const out: UnderstandingFacet[] = [];
    const { memoryCount, datedCount } = ctx;

    // Missing knowledge — a real gap decade, or "not placed in time yet".
    if (datedCount >= 2) {
      const gap = findGapDecade(ctx.decades, ctx.birthYear, ctx.now);
      if (gap != null) {
        const birthDecade =
          ctx.birthYear != null ? Math.floor(ctx.birthYear / 10) * 10 : null;
        const isEarlyYears = birthDecade != null && gap <= birthDecade + 10;
        out.push({
          lensId: "preservation",
          kind: "missing-knowledge",
          priority: 55,
          tone: "gentle",
          role: "guide",
          label: isEarlyYears
            ? `Remy knows little about ${ctx.subject.name}'s early years`
            : `Little preserved from the ${gap}s`,
          detail: "Add a memory to fill this in",
          lens: { label: "Add a memory", href: "/memories/new" },
        });
      }
    } else if (memoryCount >= 3 && datedCount < Math.ceil(memoryCount / 2)) {
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
