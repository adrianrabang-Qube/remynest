import type { Lens, UnderstandingFacet } from "./types";

/**
 * Story Lens — Remy as narrator. Owns narrative-readiness understanding (Story /
 * Biography / Memory Book): is there enough to tell a story, and how far along
 * is it.
 *
 * It is the canonical owner and the single wiring point for that domain, but it
 * emits nothing yet: the current LensContext carries no narrative-readiness
 * signals (the Story/Biography/Memory Book synthesizers aren't fed in). When
 * those signals are added to LensContext, the deterministic facet logic lands
 * here — no renderer or page change required. Returning an empty list keeps
 * today's Profile Detail output unchanged.
 */
export const storyLens: Lens = {
  id: "story",
  deriveFacets(): UnderstandingFacet[] {
    return [];
  },
};
