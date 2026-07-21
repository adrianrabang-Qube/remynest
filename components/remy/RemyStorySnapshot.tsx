import { BookMarked, CalendarRange, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { StorySignals } from "@/lib/remy/story-signals";
import type { LifeJourneySignals } from "@/lib/remy/life-journey-signals";

/**
 * RemyStorySnapshot — a deterministic "Family Story" snapshot rendered entirely
 * from canonical StorySignals + LifeJourneySignals. No prose generation, no AI,
 * no signal derivation — it only formats facts the signals already carry (span,
 * richest decade, narrative readiness).
 */
export default function RemyStorySnapshot({
  story,
  lifeJourney,
}: {
  story: StorySignals;
  lifeJourney: LifeJourneySignals;
}) {
  const facts: { icon: LucideIcon; text: string }[] = [];

  if (story.chapterCount > 0) {
    facts.push({
      icon: BookMarked,
      text: `Stories span ${story.chapterCount} life ${
        story.chapterCount === 1 ? "chapter" : "chapters"
      }`,
    });
  }

  if (lifeJourney.strongestDecade) {
    facts.push({
      icon: CalendarRange,
      text: `The ${lifeJourney.strongestDecade.decade}s are the richest documented decade`,
    });
  }

  facts.push({
    icon: ScrollText,
    text: story.hasMemoryBook
      ? "A memory book can be assembled"
      : story.hasBiography
        ? "A biography can be generated"
        : story.narrativeCoverage === "growing"
          ? "The story is still taking shape"
          : "The story is just beginning",
  });

  return (
    <section
      aria-label="Family story snapshot"
      className="rounded-3xl border border-sand-deep/70 bg-white p-4 shadow-soft md:p-6"
    >
      <h2 className="text-lg font-semibold text-charcoal">Family story</h2>
      <ul className="mt-3 space-y-2">
        {facts.map((fact) => (
          <li key={fact.text} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <fact.icon className="h-4 w-4" aria-hidden />
            </div>
            <span className="text-sm text-charcoal-soft">{fact.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
