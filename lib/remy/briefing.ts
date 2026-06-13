import type { RemyMood } from "./types";
import type { RemyUnderstanding } from "./understanding";
import type { RemyVoiceLine } from "./voice-engine";
import type { StorySignals } from "./story-signals";
import type { LifeJourneySignals } from "./life-journey-signals";

/**
 * Remy Briefing V1 — a daily intelligence COMPOSITION layer. It sits at the very
 * end of the pipeline and creates nothing:
 *
 *   Signals → Lenses → Facets → Observations → Voice → Briefing → Home
 *
 * A pure, deterministic SELECTION over already-produced outputs — no generation,
 * rewriting, summarization, inference or AI. It picks the lead line, the next
 * highlights, the top actionable CTA, and the lead mood from the (already ranked)
 * voice stream, with the understanding summary as the only empty-state fallback.
 */
export interface RemyBriefing {
  /** The lead — the highest-ranked voice line (or the understanding summary). */
  headline: string | null;
  /** The next-ranked observations after the headline. */
  highlights: RemyVoiceLine[];
  /** The highest-ranked voice line that carries a CTA. */
  nextAction: RemyVoiceLine | null;
  /** The lead voice mood (drives the avatar expression). */
  mood: RemyMood;
}

export interface RemyBriefingInput {
  understanding: RemyUnderstanding;
  /** Ranked voice lines (already sorted by priority, descending). */
  voiceLines: RemyVoiceLine[];
  /**
   * Optional context — reserved. The voice lines already encode the story and
   * life-journey facets (via the observation bridge), so V1 selection operates
   * on the single ranked voice stream; these are accepted for caller symmetry
   * and future briefing facets.
   */
  story?: StorySignals;
  lifeJourney?: LifeJourneySignals;
}

const MAX_HIGHLIGHTS = 3;
const DEFAULT_MOOD: RemyMood = "calm";

export function buildRemyBriefing(input: RemyBriefingInput): RemyBriefing {
  const lines = input.voiceLines;

  const headline = lines[0]?.text ?? input.understanding.summary ?? null;
  const mood = lines[0]?.mood ?? DEFAULT_MOOD;
  const highlights = lines.slice(1, 1 + MAX_HIGHLIGHTS);
  const nextAction = lines.find((line) => line.cta) ?? null;

  return { headline, highlights, nextAction, mood };
}
