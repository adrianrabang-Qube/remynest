import type { RemyLifeChapter } from "./life-chapters";
import type { RemyCollection } from "./collections";
import type { RemyConnection } from "./connections";

/**
 * Remy Story Mode (V1) — a guided narrative JOURNEY.
 *
 *   Memory Intelligence → Timeline (backbone) → Stories → (future) Story Mode V2
 *
 * NOT AI generation, NOT a biography writer, NOT chat. A pure, read-only
 * COMPOSITION: each story is anchored on a Life Chapter (a period of life) and
 * walks the user through that period's themes (Collections) and connected
 * stories (Connections), with a human narrative built from existing summaries.
 * No queries, no LLM, no duplicated intelligence. Sparse data still yields a
 * story; empty data returns [].
 */
export type RemyStorySectionKind = "theme" | "connection";

export interface RemyStorySection {
  id: string;
  title: string;
  description?: string;
  href?: string;
  kind: RemyStorySectionKind;
}

export interface RemyStory {
  /** Anchor chapter id (e.g. "1980s"). */
  id: string;
  title: string;
  /** Human narrative, composed from existing themes/summaries. */
  summary: string;
  startYear: number | null;
  endYear: number | null;
  sections: RemyStorySection[];
  /** Navigation target — the chapter this story belongs to. */
  href: string;
}

export interface RemyStoryInput {
  chapters?: RemyLifeChapter[];
  collections?: RemyCollection[];
  connections?: RemyConnection[];
}

const MAX_STORIES = 8;
const MAX_THEME_SECTIONS = 3;
const MAX_CONNECTION_SECTIONS = 2;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function storyNarrative(
  title: string,
  themes: string[],
  chapter: RemyLifeChapter
): string {
  if (themes.length >= 2) {
    return `${title} was a period shaped by ${themes[0]} and ${themes[1]}${
      themes.length > 2 ? ", and more" : ""
    }.`;
  }
  if (themes.length === 1) {
    return `${title} was a period centered on ${themes[0]}.`;
  }
  if (chapter.summary) return chapter.summary;
  return `${title} holds ${chapter.memoryCount} ${
    chapter.memoryCount === 1 ? "memory" : "memories"
  }.`;
}

/** Connections whose span overlaps the chapter's years (most diverse first). */
function relatedConnections(
  chapter: RemyLifeChapter,
  connections: RemyConnection[]
): RemyConnection[] {
  if (chapter.startYear === null || chapter.endYear === null) return [];
  return connections
    .filter(
      (c) =>
        c.startYear !== null &&
        c.endYear !== null &&
        c.diversityScore > 0 &&
        c.startYear <= (chapter.endYear as number) &&
        c.endYear >= (chapter.startYear as number)
    )
    .sort((a, b) => b.diversityScore - a.diversityScore)
    .slice(0, MAX_CONNECTION_SECTIONS);
}

export function getRemyStories(
  input: RemyStoryInput
): RemyStory[] {
  const chapters = input.chapters ?? [];
  if (chapters.length === 0) return [];

  const collectionBySlug = new Map(
    (input.collections ?? []).map((c) => [c.id, c])
  );
  const connections = input.connections ?? [];

  const stories: RemyStory[] = chapters.map((chapter) => {
    const themes = chapter.themes.slice(0, MAX_THEME_SECTIONS);

    const sections: RemyStorySection[] = [];

    for (const theme of themes) {
      const match = collectionBySlug.get(slugify(theme));
      sections.push({
        id: `theme-${chapter.id}-${slugify(theme)}`,
        title: theme,
        description: match?.summary ?? undefined,
        href: match ? `/collections/${match.id}` : undefined,
        kind: "theme",
      });
    }

    for (const connection of relatedConnections(chapter, connections)) {
      sections.push({
        id: `connection-${connection.id}`,
        title: "A connected story",
        description: connection.summary,
        href: `/connections/${connection.id}`,
        kind: "connection",
      });
    }

    return {
      id: chapter.id,
      title: chapter.title,
      summary: storyNarrative(chapter.title, themes, chapter),
      startYear: chapter.startYear,
      endYear: chapter.endYear,
      sections,
      href: `/chapters/${chapter.id}`,
    };
  });

  // Chronological — travel forward through the life story.
  stories.sort(
    (a, b) => (a.startYear ?? Infinity) - (b.startYear ?? Infinity)
  );

  return stories.slice(0, MAX_STORIES);
}
