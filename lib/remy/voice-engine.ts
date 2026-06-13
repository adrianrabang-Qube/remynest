import type { RemyObservation, RemyMood } from "./types";
import type { LensId } from "./lens-id";

/**
 * Voice Engine V1 — the presentation layer at the end of the pipeline:
 *
 *   Signals → Lenses → Facets → Observations → Voice → UI
 *
 * Voice is NOT a new intelligence system. It is a pure, deterministic transform
 * of RemyObservation[] (from generateRemyObservations and/or the
 * observation-bridge) into speakable RemyVoiceLine[]. It adds NO reasoning, NO
 * scoring, NO prose, NO AI — it preserves the observation's text, mood, lens
 * ownership, priority and CTA verbatim, and preserves observation ranking.
 */
export interface RemyVoiceLine {
  id: string;
  text: string;
  mood: RemyMood;
  lensId?: LensId;
  priority: number;
  cta?: { label: string; href: string };
}

/** Present a single observation as a voice line (verbatim — no rewriting). */
export function observationToVoiceLine(
  observation: RemyObservation,
): RemyVoiceLine {
  return {
    id: observation.id,
    text: observation.text,
    mood: observation.mood,
    lensId: observation.lensId,
    priority: observation.priority,
    cta: observation.cta,
  };
}

/**
 * Present a ranked observation stream as voice lines. Ranking is preserved
 * (sorted by priority, descending — the same order observations already use).
 */
export function observationsToVoiceLines(
  observations: RemyObservation[],
): RemyVoiceLine[] {
  return [...observations]
    .sort((a, b) => b.priority - a.priority)
    .map(observationToVoiceLine);
}
