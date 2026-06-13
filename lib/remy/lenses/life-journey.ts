import { deriveLifeJourneySignals } from "../life-journey-signals";
import type { Lens, LensContext, UnderstandingFacet } from "./types";

/**
 * Life Journey Lens — Remy understanding the shape of a life through time.
 * Deterministic facets derived from the decade signals (no AI): the documented
 * span, the best-documented period, and the earliest lightly-documented era.
 * This lens owns the time dimension (the era-gap moved here from Preservation,
 * which keeps only "memories aren't dated yet").
 */
export const lifeJourneyLens: Lens = {
  id: "life-journey",
  deriveFacets(ctx: LensContext): UnderstandingFacet[] {
    const signals = deriveLifeJourneySignals(ctx.decades, ctx.birthYear, ctx.now);
    if (!signals.hasTimeline) return [];

    const out: UnderstandingFacet[] = [];

    // Chapter span — the overall shape of the documented life.
    if (
      signals.earliestDecade != null &&
      signals.latestDecade != null &&
      signals.documentedDecadeCount >= 2
    ) {
      out.push({
        lensId: "life-journey",
        kind: "chapter-span",
        priority: 62,
        tone: "informative",
        role: "storyteller",
        label: `Memories span the ${signals.earliestDecade}s–${signals.latestDecade}s`,
        detail: `${signals.documentedDecadeCount} ${
          signals.documentedDecadeCount === 1 ? "decade" : "decades"
        } documented`,
        lens: { label: "Life Journey", href: "/timeline" },
      });
    }

    // Strongest period — the best-documented decade.
    if (signals.strongestDecade && signals.strongestDecade.count >= 2) {
      out.push({
        lensId: "life-journey",
        kind: "strongest-period",
        priority: 60,
        tone: "celebratory",
        role: "storyteller",
        label: `Richest memories from the ${signals.strongestDecade.decade}s`,
        detail: `${signals.strongestDecade.count} ${
          signals.strongestDecade.count === 1 ? "memory" : "memories"
        }`,
        lens: { label: "Life Journey", href: "/timeline" },
      });
    }

    // Missing era — the earliest lightly-documented period (needs a real timeline).
    if (ctx.datedCount >= 2 && signals.missingDecade != null) {
      out.push({
        lensId: "life-journey",
        kind: "missing-knowledge",
        priority: 48,
        tone: "gentle",
        role: "guide",
        label: signals.missingIsEarlyYears
          ? `Remy knows little about ${ctx.subject.name}'s early years`
          : `The ${signals.missingDecade}s remain lightly documented`,
        detail: "Add a memory to fill this in",
        lens: { label: "Add a memory", href: "/memories/new" },
      });
    }

    return out;
  },
};
