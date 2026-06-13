import type { RemyBiography } from "./biography";
import type { RemyStory } from "./story-mode";
import type { LifeJourneySignals } from "./life-journey-signals";
import type { StorySignals } from "./story-signals";

/**
 * Remy Memory Books (V2) — the structured BOOK model, now a pure
 * presentation/assembly CONSUMER of canonical intelligence:
 *
 *   Signals → Biography → Memory Book → Voice
 *
 * NOT PDF export, NOT printing, NOT sharing, NOT AI writing. It composes
 * Biography V1 prose (verbatim) + Story Mode chapter titles into a cover + table
 * of contents + navigable sections. V2 additionally consumes LifeJourneySignals
 * and StorySignals (when provided) for availability and a deterministic,
 * documentation-grounded "Life Overview" — it no longer derives narrative
 * readiness or span reasoning itself. No prose generation, no queries, no AI.
 * Returns null when there is no story to bind.
 */
export interface MemoryBookChapter {
  id: string;
  number: number;
  title: string;
  paragraphs: string[];
  href?: string;
}

export interface MemoryBookSection {
  id: string;
  title: string;
  paragraphs: string[];
  /** Present on the "Life Chapters" section — titled chapter entries. */
  chapters?: MemoryBookChapter[];
  href?: string;
}

export interface MemoryBookTocEntry {
  number: number;
  title: string;
  /** Section id this entry navigates to. */
  anchor: string;
}

export interface MemoryBook {
  title: string;
  subtitle: string | null;
  cover: { title: string; subtitle: string | null };
  tableOfContents: MemoryBookTocEntry[];
  sections: MemoryBookSection[];
}

export interface MemoryBookInput {
  biography: RemyBiography | null;
  stories?: RemyStory[];
  /** Canonical time signals (consumed for the Life Overview); optional. */
  lifeJourney?: LifeJourneySignals;
  /** Canonical narrative readiness (consumed for availability + overview); optional. */
  story?: StorySignals;
}

export function getRemyMemoryBook(
  input: MemoryBookInput
): MemoryBook | null {
  const biography = input.biography;
  if (!biography || biography.sections.length === 0) return null;

  // Availability is canonical narrative readiness when provided — Memory Book
  // consumes StorySignals instead of deciding its own readiness. (Backward
  // compatible: callers that don't pass signals keep the biography-only gate.)
  if (input.story && !input.story.hasMemoryBook) return null;

  const stories = input.stories ?? [];

  const sections: MemoryBookSection[] = [];

  // Life Overview — a deterministic, documentation-grounded opening assembled
  // from canonical signals (span · richest era · story readiness). No prose
  // generation; appears only when signals are supplied.
  const overview = buildLifeOverview(input.lifeJourney, input.story);
  if (overview) sections.push(overview);

  for (const s of biography.sections) {
    // The Life Chapters section becomes titled chapter entries (from Story
    // Mode) when available; otherwise it keeps the biography's prose.
    if (s.id === "chapters" && stories.length > 0) {
      sections.push({
        id: s.id,
        title: s.title,
        paragraphs: [],
        chapters: stories.map((story, index) => ({
          id: story.id,
          number: index + 1,
          title: story.title,
          paragraphs: [story.summary],
          href: story.href,
        })),
        href: s.href,
      });
    } else {
      sections.push({
        id: s.id,
        title: s.title,
        paragraphs: s.paragraphs,
        href: s.href,
      });
    }
  }

  const tableOfContents: MemoryBookTocEntry[] = sections.map((s, index) => ({
    number: index + 1,
    title: s.title,
    anchor: s.id,
  }));

  return {
    title: biography.title,
    subtitle: biography.subtitle,
    cover: { title: biography.title, subtitle: biography.subtitle },
    tableOfContents,
    sections,
  };
}

/**
 * Build the deterministic "Life Overview" section from canonical signals. Pure
 * templating of documented facts — no generated prose, no inference. Returns
 * null when neither signal yields anything to say.
 */
function buildLifeOverview(
  lifeJourney: LifeJourneySignals | undefined,
  story: StorySignals | undefined
): MemoryBookSection | null {
  const paragraphs: string[] = [];

  if (
    lifeJourney &&
    lifeJourney.hasTimeline &&
    lifeJourney.earliestDecade != null &&
    lifeJourney.latestDecade != null
  ) {
    const span =
      lifeJourney.earliestDecade === lifeJourney.latestDecade
        ? `the ${lifeJourney.earliestDecade}s`
        : `the ${lifeJourney.earliestDecade}s–${lifeJourney.latestDecade}s`;
    paragraphs.push(
      `This story spans ${span}, across ${lifeJourney.documentedDecadeCount} documented ${
        lifeJourney.documentedDecadeCount === 1 ? "decade" : "decades"
      }.`
    );
    if (lifeJourney.strongestDecade) {
      paragraphs.push(
        `The ${lifeJourney.strongestDecade.decade}s are the most documented period.`
      );
    }
  }

  if (story) {
    paragraphs.push(
      story.narrativeCoverage === "developed"
        ? "A full life story is ready to read."
        : story.narrativeCoverage === "growing"
          ? "The story is still taking shape — more chapters will deepen it."
          : "The story is just beginning."
    );
  }

  if (paragraphs.length === 0) return null;
  return { id: "life-overview", title: "Life Overview", paragraphs };
}
