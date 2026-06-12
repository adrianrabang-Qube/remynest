import type { RemyLifeChapter } from "./life-chapters";
import type { RemyCollection } from "./collections";
import type { RemyConnection } from "./connections";
import type { FamilyIntelligence } from "./family";
import type { DateCoverage } from "./date-coverage";
import type { RemyStory } from "./story-mode";
import { formatChapterRange } from "./life-chapters";

/**
 * Remy Biography (V1) — a structured, readable life NARRATIVE.
 *
 *   Memory Intelligence → Story Mode / Timeline → Biography
 *
 * NOT AI writing, NOT an LLM, NOT a chatbot. A pure, read-only COMPOSITION that
 * assembles a long-form life document from intelligence already produced (Story
 * Mode, Life Chapters, Collections, Connections, Family Intelligence). It reuses
 * existing summaries verbatim and only templates plain facts (counts, spans) —
 * it never generates new narrative. No queries, no AI. Missing sections are
 * omitted; an empty account returns null.
 */
export interface RemyBiographySection {
  id: string;
  title: string;
  paragraphs: string[];
  href?: string;
}

export interface RemyBiography {
  title: string;
  subtitle: string | null;
  sections: RemyBiographySection[];
}

export interface RemyBiographyInput {
  stories?: RemyStory[];
  chapters?: RemyLifeChapter[];
  collections?: RemyCollection[];
  connections?: RemyConnection[];
  family?: FamilyIntelligence | null;
  coverage?: DateCoverage | null;
}

const MAX_THEMES = 4;
const MAX_CONNECTED = 3;

function listJoin(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function getRemyBiography(
  input: RemyBiographyInput
): RemyBiography | null {
  const stories = input.stories ?? [];
  const chapters = input.chapters ?? [];
  const collections = input.collections ?? [];
  const connections = (input.connections ?? []).filter(
    (c) => c.diversityScore > 0
  );
  const family = input.family ?? null;
  const coverage = input.coverage ?? null;

  const hasContent =
    chapters.length > 0 ||
    collections.length > 0 ||
    connections.length > 0 ||
    (family != null && family.totalMemories > 0);
  if (!hasContent) return null;

  const sections: RemyBiographySection[] = [];

  // ── Span (subtitle) ────────────────────────────────────────────────────────
  const years = chapters
    .flatMap((c) => [c.startYear, c.endYear])
    .filter((y): y is number => y != null);
  const spanStart = years.length ? Math.min(...years) : null;
  const spanEnd = years.length ? Math.max(...years) : null;
  const subtitle =
    spanStart != null
      ? spanStart === spanEnd
        ? `${spanStart}`
        : `${spanStart} – ${spanEnd}`
      : null;

  // ── Introduction (composed facts) ──────────────────────────────────────────
  const intro: string[] = [];
  const total = coverage?.total ?? null;
  intro.push(
    total != null && total > 0
      ? `This is a story told through ${total} ${
          total === 1 ? "memory" : "memories"
        } preserved so far.`
      : `This is a story told through the memories preserved so far.`
  );
  if (chapters.length > 0 && subtitle) {
    intro.push(
      `It spans ${subtitle}, across ${chapters.length} ${
        chapters.length === 1 ? "chapter" : "chapters"
      }.`
    );
  }
  sections.push({
    id: "introduction",
    title: "Introduction",
    paragraphs: [intro.join(" ")],
  });

  // ── Life Chapters (reuse Story Mode narratives, else chapter summaries) ─────
  if (stories.length > 0) {
    sections.push({
      id: "chapters",
      title: "Life Chapters",
      paragraphs: stories.map((s) => s.summary),
      href: "/chapters",
    });
  } else if (chapters.length > 0) {
    sections.push({
      id: "chapters",
      title: "Life Chapters",
      paragraphs: chapters.map((c) => {
        const range = formatChapterRange(c);
        return `${c.title}${range ? ` (${range})` : ""}. ${c.summary}`;
      }),
      href: "/chapters",
    });
  }

  // ── Important Themes (reuse collection summaries) ──────────────────────────
  if (collections.length > 0) {
    sections.push({
      id: "themes",
      title: "Important Themes",
      paragraphs: collections.slice(0, MAX_THEMES).map((c) => {
        const detail =
          c.summary ??
          `${c.memoryCount} ${
            c.memoryCount === 1 ? "memory" : "memories"
          } gathered under this theme.`;
        return `${c.title}: ${detail}`;
      }),
      href: "/collections",
    });
  }

  // ── Connected Stories (reuse connection summaries, deduped) ────────────────
  if (connections.length > 0) {
    const seen = new Set<string>();
    const paragraphs: string[] = [];
    for (const c of connections) {
      if (seen.has(c.summary)) continue;
      seen.add(c.summary);
      paragraphs.push(c.summary);
      if (paragraphs.length >= MAX_CONNECTED) break;
    }
    if (paragraphs.length > 0) {
      sections.push({
        id: "connections",
        title: "Connected Stories",
        paragraphs,
        href: "/connections",
      });
    }
  }

  // ── Family Impact (reuse family members + observations) ────────────────────
  if (family && family.totalMemories > 0 && family.profiles.length > 0) {
    const paragraphs: string[] = [];
    const names = family.profiles.map((p) => p.name);
    paragraphs.push(
      `${family.profiles.length} family ${
        family.profiles.length === 1 ? "member is" : "members are"
      } part of this story: ${listJoin(names)}.`
    );
    const shared = family.observations.find(
      (o) => o.id === "family-shared-theme"
    );
    if (shared) paragraphs.push(shared.text);
    sections.push({
      id: "family",
      title: "Family Impact",
      paragraphs,
    });
  }

  // ── Reflection (composed facts) ────────────────────────────────────────────
  sections.push({
    id: "reflection",
    title: "Reflection",
    paragraphs: [
      coverage && coverage.total > 0
        ? `Together, these moments form an unfolding story — ${coverage.dated} of ${coverage.total} ${
            coverage.total === 1 ? "memory has" : "memories have"
          } been placed in time so far.`
        : `Together, these moments form an unfolding story.`,
    ],
  });

  return {
    title: "A Life in Memories",
    subtitle,
    sections,
  };
}
