import type { RemyObservation, RemySurface } from "./types";
import type { UnderstandingFacet } from "./lenses/types";
import type { RemyUnderstanding } from "./understanding";
import { TONE_MOOD, type RemyVoice } from "./persona";

/**
 * Facet → Observation bridge — the deterministic link that completes the unified
 * Remy pipeline:
 *
 *   Signals → Lenses → Facets → Observations → Remy
 *
 * Lenses produce *understanding* (facets); this bridge turns each facet into
 * Remy's *voice* (an observation) using template phrasing only. No AI, no LLM,
 * no embeddings. A facet already carries everything an observation needs —
 * lensId (ownership), tone (→ avatar mood), priority (ranking) and an optional
 * lens deep-link (→ cta) — so the mapping is total and lossless.
 *
 * PHASE 5 SEAM — Lenses → Observations → Voice:
 * Voice Engine V1 should consume RemyObservation[] directly (from this bridge
 * and/or generateRemyObservations). Each observation exposes `mood` (via
 * TONE_MOOD) for avatar expression, `text` for speech, `lensId` for context and
 * `cta` for an optional action — everything the voice layer needs without any
 * new pipeline. This module is that seam; it is intentionally not yet wired into
 * any renderer (architecture only).
 */

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** Template-only voicing of a facet in Remy's first-person companion voice. */
function voiceFacet(facet: UnderstandingFacet, voice: RemyVoice): string {
  const poss = voice.possessive;
  switch (facet.kind) {
    case "life-areas":
      return `Looking across ${poss} memories, ${lowerFirst(facet.label)}.`;
    case "strongest-period":
      return `${facet.label} — ${poss} story is especially rich there.`;
    case "coverage":
      return facet.detail ? `${facet.label} (${facet.detail}).` : `${facet.label}.`;
    case "missing-knowledge":
    case "recency":
    case "relationship":
    default:
      return `${facet.label}.`;
  }
}

/** Bridge one lens facet into a voiced, lens-owned observation. */
export function facetToObservation(
  facet: UnderstandingFacet,
  voice: RemyVoice,
  surface: RemySurface = "dashboard",
): RemyObservation {
  return {
    id: `lens-${facet.lensId}-${facet.kind}`,
    surface,
    lensId: facet.lensId,
    tone: facet.tone,
    mood: TONE_MOOD[facet.tone],
    priority: facet.priority,
    text: voiceFacet(facet, voice),
    cta: facet.lens
      ? { label: facet.lens.label, href: facet.lens.href }
      : undefined,
  };
}

/**
 * Bridge a whole understanding into ranked, lens-owned observations — Remy
 * describing what the lenses understand. Ready for Remy Home / Voice to consume
 * alongside signal-derived observations (both are RemyObservation, both ranked
 * by priority).
 */
export function understandingToObservations(
  understanding: RemyUnderstanding,
  voice: RemyVoice,
  surface: RemySurface = "dashboard",
): RemyObservation[] {
  return understanding.facets
    .map((facet) => facetToObservation(facet, voice, surface))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Observation fusion — merge understanding-derived observations (from the
 * lenses, via this bridge) with signal-derived observations (from
 * generateRemyObservations) into one ranked stream. Deterministic, dedup by id.
 * This is the seam Remy Home (and later Voice) consumes so a surface can speak
 * from both intelligence sources at once — without changing how RemyCompanion
 * renders signal observations today.
 */
export function fuseObservations(
  understanding: RemyUnderstanding,
  voice: RemyVoice,
  signalObservations: RemyObservation[] = [],
  surface: RemySurface = "dashboard",
): RemyObservation[] {
  const fromUnderstanding = understandingToObservations(
    understanding,
    voice,
    surface,
  );
  const seen = new Set(fromUnderstanding.map((o) => o.id));
  return [
    ...fromUnderstanding,
    ...signalObservations.filter((o) => !seen.has(o.id)),
  ].sort((a, b) => b.priority - a.priority);
}
