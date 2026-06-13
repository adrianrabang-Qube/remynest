import type { Lens, LensContext, UnderstandingFacet } from "./types";

/**
 * Themes Lens — Remy as curator. Describes what is *documented*, never a
 * personality. Output is documentation-grounded only ("Family is the most
 * documented theme"), never an inferred trait ("Family-oriented").
 */
export const themesLens: Lens = {
  id: "themes",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    if (ctx.memoryCount < 3 || ctx.themes.length === 0) return [];
    const [first, second] = ctx.themes;
    const detail = second
      ? `${second.label} also appears frequently`
      : `${first.memoryCount} ${
          first.memoryCount === 1 ? "memory" : "memories"
        } preserved`;
    return [
      {
        lensId: "themes",
        kind: "life-areas",
        priority: 70,
        tone: "informative",
        role: "curator",
        label: `${first.label} is the most documented theme`,
        detail,
        lens: { label: "Themes", href: "/collections" },
      },
    ];
  },
};
