/**
 * Remy Platform (v2) — FAMILY STORY ENGINE (pure).
 *
 * Automatically groups memories into life CHAPTERS from their real dates + category metadata — no
 * hardcoded chapter names, no fabricated data. A chapter is a contiguous decade of dated memories,
 * titled by the dominant category when one clearly leads (e.g. "Family Holidays"), else by its era
 * ("The 1990s"). Pure: no React/DOM/DB/timers. Consumed by the legacy engine + future timeline
 * screens.
 */
import type { DatedMemory, LifeChapter } from "./family-types";

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** The category shared by a clear majority of a chapter's memories, else null. */
function dominantCategory(memories: DatedMemory[]): string | null {
  const counts = new Map<string, number>();
  for (const m of memories) {
    if (m.category) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  }
  const threshold = Math.max(2, Math.ceil(memories.length * 0.4));
  let best: string | null = null;
  let bestCount = 0;
  for (const [category, count] of counts) {
    if (count > bestCount && count >= threshold) {
      best = category;
      bestCount = count;
    }
  }
  return best ? titleCase(best) : null;
}

/** Group dated memories into ordered life chapters (by decade). */
export function buildChapters(memories: DatedMemory[]): LifeChapter[] {
  const dated = memories.filter((m) => m.dateIso && !Number.isNaN(Date.parse(m.dateIso)));
  if (dated.length === 0) return [];

  const sorted = [...dated].sort((a, b) => Date.parse(a.dateIso) - Date.parse(b.dateIso));

  const byDecade = new Map<number, DatedMemory[]>();
  for (const m of sorted) {
    const decade = Math.floor(new Date(m.dateIso).getFullYear() / 10) * 10;
    const bucket = byDecade.get(decade);
    if (bucket) bucket.push(m);
    else byDecade.set(decade, [m]);
  }

  const chapters: LifeChapter[] = [];
  for (const [decade, mems] of Array.from(byDecade.entries()).sort((a, b) => a[0] - b[0])) {
    chapters.push({
      id: `decade-${decade}`,
      title: dominantCategory(mems) ?? `The ${decade}s`,
      startIso: mems[0].dateIso,
      endIso: mems[mems.length - 1].dateIso,
      memoryIds: mems.map((m) => m.id),
      count: mems.length,
    });
  }
  return chapters;
}
