import type { RemyLifeChapter } from "./life-chapters";
import type { RemyCollection } from "./collections";
import type { RemyConnection } from "./connections";

/**
 * Remy Timeline (V1) — the visual NARRATIVE layer.
 *
 *   Memory Intelligence → Timeline Events → Dashboard → (future) Story Mode
 *
 * NOT a calendar, NOT a list of memories, NOT a new intelligence engine. It is a
 * pure, read-only SYNTHESIZER that turns intelligence already produced by Life
 * Chapters V2, Collections V2, and Connections V2 into year-anchored story
 * events so a user can visually travel through their life. No queries, no AI, no
 * duplicated business logic. Best-effort + graceful: missing inputs yield fewer
 * events; an empty result hides the timeline.
 */
export type RemyTimelineCategory =
  | "chapter"
  | "collection"
  | "connection"
  | "memory"
  | "family";

export interface RemyTimelineEvent {
  id: string;
  title: string;
  description: string;
  /** The anchor year on the timeline. */
  year: number;
  category: RemyTimelineCategory;
  href: string;
  priority: number;
}

export interface RemyTimelineInput {
  chapters?: RemyLifeChapter[];
  collections?: RemyCollection[];
  connections?: RemyConnection[];
}

// Same-year ordering: a chapter forming outranks a story spanning, outranks a
// collection emerging.
const PRIORITY = {
  CHAPTER: 90,
  CONNECTION: 75,
  COLLECTION: 70,
} as const;

const MAX_EVENTS = 24;

export function getRemyTimeline(
  input: RemyTimelineInput
): RemyTimelineEvent[] {
  const events: RemyTimelineEvent[] = [];

  // ── Life chapters — each is a period marker ────────────────────────────────
  for (const c of input.chapters ?? []) {
    const decade = parseInt(c.id, 10);
    const year = Number.isNaN(decade) ? c.startYear : decade;
    if (year === null) continue;
    events.push({
      id: `chapter-${c.id}`,
      title: `${c.title} became a chapter`,
      description: c.summary,
      year,
      category: "chapter",
      href: `/chapters/${c.id}`,
      priority: PRIORITY.CHAPTER,
    });
  }

  // ── Connections that span periods — cross-era stories only ─────────────────
  for (const c of input.connections ?? []) {
    if (!c.spansEras || c.startYear === null) continue;
    events.push({
      id: `connection-${c.id}`,
      title: "A connected story spans these years",
      description: c.summary,
      year: c.startYear,
      category: "connection",
      href: `/connections/${c.id}`,
      priority: PRIORITY.CONNECTION,
    });
  }

  // ── Collections — a theme begins appearing (needs a year) ──────────────────
  for (const c of input.collections ?? []) {
    if (c.startYear === null) continue;
    events.push({
      id: `collection-${c.id}`,
      title: `${c.title} memories begin appearing`,
      description:
        c.summary ??
        `${c.memoryCount} ${
          c.memoryCount === 1 ? "memory" : "memories"
        } gathered under this theme.`,
      year: c.startYear,
      category: "collection",
      href: `/collections/${c.id}`,
      priority: PRIORITY.COLLECTION,
    });
  }

  // Chronological — travel forward through the story. Ties → priority desc.
  events.sort(
    (a, b) => a.year - b.year || b.priority - a.priority
  );

  return events.slice(0, MAX_EVENTS);
}

/** Group events by year for a year → events rendering. Preserves order. */
export function groupTimelineByYear(
  events: RemyTimelineEvent[]
): { year: number; events: RemyTimelineEvent[] }[] {
  const groups: { year: number; events: RemyTimelineEvent[] }[] = [];
  let current: { year: number; events: RemyTimelineEvent[] } | null = null;
  for (const e of events) {
    if (!current || current.year !== e.year) {
      current = { year: e.year, events: [] };
      groups.push(current);
    }
    current.events.push(e);
  }
  return groups;
}
