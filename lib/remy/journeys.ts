import type { StorySignals } from "./story-signals";
import type { LifeJourneySignals } from "./life-journey-signals";
import type { RemyUnderstanding } from "./understanding";

/**
 * Remy Journeys V1 — a presentation/composition layer at the end of the pipeline:
 *
 *   … → Actions → Journeys
 *
 * It creates nothing. A pure, deterministic SELECTION over existing story and
 * life-journey outputs: one journey per available narrative destination (Life
 * Journey, Story, Biography, Memory Book), each with a status derived from the
 * signals already computed. No generation, inference, new scoring or AI.
 */
export type JourneyStatus = "ready" | "growing";

export interface RemyJourney {
  title: string;
  description: string;
  href: string;
  status: JourneyStatus;
}

export interface RemyJourneys {
  journeys: RemyJourney[];
}

export interface RemyJourneysInput {
  story?: StorySignals;
  lifeJourney: LifeJourneySignals;
  /** Reserved — journeys derive from story/life-journey; understanding is
   *  accepted for caller symmetry and future theme/relationship journeys. */
  understanding: RemyUnderstanding;
}

export function buildRemyJourneys(input: RemyJourneysInput): RemyJourneys {
  const { story, lifeJourney } = input;
  const journeys: RemyJourney[] = [];

  // Life Journey — the documented span over time.
  if (
    lifeJourney.hasTimeline &&
    lifeJourney.earliestDecade != null &&
    lifeJourney.latestDecade != null
  ) {
    const span =
      lifeJourney.earliestDecade === lifeJourney.latestDecade
        ? `The ${lifeJourney.earliestDecade}s`
        : `The ${lifeJourney.earliestDecade}s–${lifeJourney.latestDecade}s`;
    journeys.push({
      title: "Life journey",
      description: span,
      href: "/timeline",
      status: lifeJourney.documentedDecadeCount >= 2 ? "ready" : "growing",
    });
  }

  // Story — the guided chapter journey.
  if (story?.hasStory) {
    journeys.push({
      title: "Your story",
      description: `${story.chapterCount} ${
        story.chapterCount === 1 ? "chapter" : "chapters"
      }`,
      href: "/library/story",
      status: story.narrativeCoverage === "developed" ? "ready" : "growing",
    });
  }

  // Biography — the readable life document.
  if (story?.hasBiography) {
    journeys.push({
      title: "Biography",
      description: "A readable life document",
      href: "/library/biography",
      status: "ready",
    });
  }

  // Memory Book — the keepsake to assemble.
  if (story?.hasMemoryBook) {
    journeys.push({
      title: "Memory book",
      description: "A keepsake of the story",
      href: "/library/memory-book",
      status: "ready",
    });
  }

  return { journeys };
}
