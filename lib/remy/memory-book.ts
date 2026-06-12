import type { RemyBiography } from "./biography";
import type { RemyStory } from "./story-mode";

/**
 * Remy Memory Books (V1) — the structured BOOK model.
 *
 *   Memory Intelligence → Biography → Memory Book
 *
 * NOT PDF export, NOT printing, NOT sharing, NOT AI writing. This is the
 * read-only, deterministic book structure that future export/print/share will
 * consume. It is a pure COMPOSITION of Biography V1 (and Story Mode chapter
 * titles) into a cover + table of contents + navigable sections/chapters. It
 * reuses existing prose verbatim, generates no new narrative, runs no queries.
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
}

export function getRemyMemoryBook(
  input: MemoryBookInput
): MemoryBook | null {
  const biography = input.biography;
  if (!biography || biography.sections.length === 0) return null;

  const stories = input.stories ?? [];

  const sections: MemoryBookSection[] = biography.sections.map((s) => {
    // The Life Chapters section becomes titled chapter entries (from Story
    // Mode) when available; otherwise it keeps the biography's prose.
    if (s.id === "chapters" && stories.length > 0) {
      return {
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
      };
    }
    return {
      id: s.id,
      title: s.title,
      paragraphs: s.paragraphs,
      href: s.href,
    };
  });

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
