import type { Lens, LensContext, UnderstandingFacet } from "./types";

/**
 * Life Journey Lens — Remy as storyteller of time. Understands the journey
 * through decades: the strongest documented period today; turning points and
 * transitions are future deterministic extensions (no AI).
 */
export const lifeJourneyLens: Lens = {
  id: "life-journey",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    if (ctx.decades.length === 0) return [];
    const top = [...ctx.decades].sort((a, b) => b.count - a.count)[0];
    if (!top || top.count < 2) return [];
    return [
      {
        lensId: "life-journey",
        kind: "strongest-period",
        priority: 60,
        tone: "celebratory",
        role: "storyteller",
        label: `Richest memories from the ${top.decade}s`,
        detail: `${top.count} ${top.count === 1 ? "memory" : "memories"}`,
        lens: { label: "Life Journey", href: "/timeline" },
      },
    ];
  },
};
