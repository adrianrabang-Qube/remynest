import type { Lens, LensContext, UnderstandingFacet } from "./types";

/**
 * Relationships Lens — Remy as connector. Understands how a life is connected:
 * the relationship label and any themes the wider family shares. Relationship
 * strength and recurring-people graphs are future deterministic extensions.
 */
export const relationshipsLens: Lens = {
  id: "relationships",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    const sharedTheme = ctx.sharedFamilyThemes?.[0]?.label;
    if (!ctx.relationshipLabel && !sharedTheme) return [];
    const base = ctx.relationshipLabel
      ? `Your ${ctx.relationshipLabel.toLowerCase()}`
      : "Part of your family";
    return [
      {
        lensId: "relationships",
        kind: "relationship",
        priority: 50,
        tone: "reassuring",
        role: "connector",
        label: sharedTheme
          ? `${base} · shares ${sharedTheme} with the family`
          : base,
        lens: { label: "Relationships", href: "/connections" },
      },
    ];
  },
};
