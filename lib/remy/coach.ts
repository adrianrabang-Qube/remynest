import type { DateCoverage } from "./date-coverage";
import type { LifeJourneySignals } from "./life-journey-signals";
import type { StorySignals } from "./story-signals";

/**
 * Remy Memory Coach V1 — a deterministic guidance layer at the end of the
 * pipeline:
 *
 *   … → Journeys → Coach
 *
 * It creates nothing. A pure SELECTION over existing coverage / maturity facts,
 * each turned into a health status via simple, documented thresholds. No AI,
 * LLM, embeddings, inference, new signals/observations/lenses, new queries, or
 * new ranking. A coach item appears only when its supporting data exists.
 */
export type CoachStatus = "healthy" | "growing" | "attention";

export interface RemyCoachItem {
  title: string;
  detail: string;
  status: CoachStatus;
  href: string;
}

export interface RemyCoach {
  items: RemyCoachItem[];
}

export interface RemyCoachInput {
  coverage: DateCoverage;
  lifeJourney: LifeJourneySignals;
  story?: StorySignals;
}

// Documented thresholds (no other scoring is applied).
const COVERAGE_HEALTHY = 80; // dated % ≥ 80 → healthy
const COVERAGE_GROWING = 50; // dated % 50–79 → growing; < 50 → attention
const TIMELINE_HEALTHY_DECADES = 3; // ≥ 3 documented decades → healthy; 1–2 → growing

export function buildRemyCoach(input: RemyCoachInput): RemyCoach {
  const { coverage, lifeJourney, story } = input;
  const items: RemyCoachItem[] = [];

  // Memory dating — only when there are memories to date.
  if (coverage.total > 0) {
    const pct = coverage.percentage;
    const status: CoachStatus =
      pct >= COVERAGE_HEALTHY
        ? "healthy"
        : pct >= COVERAGE_GROWING
          ? "growing"
          : "attention";
    items.push({
      title: "Memory dating",
      detail: `${pct}% dated · ${coverage.dated} of ${coverage.total}`,
      status,
      href: "/memory-dates",
    });
  }

  // Life timeline — only when a documented timeline exists.
  if (lifeJourney.hasTimeline) {
    const decades = lifeJourney.documentedDecadeCount;
    const status: CoachStatus =
      decades >= TIMELINE_HEALTHY_DECADES ? "healthy" : "growing";
    items.push({
      title: "Life timeline",
      detail: `${decades} ${decades === 1 ? "decade" : "decades"} documented`,
      status,
      href: "/timeline",
    });
  }

  // Life story — only when a story exists.
  if (story?.hasStory) {
    const status: CoachStatus =
      story.narrativeCoverage === "developed" ? "healthy" : "growing";
    items.push({
      title: "Life story",
      detail: `${story.chapterCount} ${
        story.chapterCount === 1 ? "chapter" : "chapters"
      }`,
      status,
      href: "/library/story",
    });
  }

  return { items };
}
