import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Life Chapters — Remy's narrative layer.
 *
 * The top of the Remy stack:
 *   Memories → Collections → Connections → Life Chapters
 *
 * A chapter is a meaningful period of a life, derived deterministically from
 * EXISTING data — the memory's own category (already assigned at capture; no new
 * AI) becomes the chapter, with a date range from effective memory dates, themes
 * from moods, and a count of related collections. Read-only, best-effort, human
 * language only (never "cluster"/"vector"/"similarity"). Degrades to empty.
 */
export interface RemyLifeChapter {
  /** Category slug — stable id for routing. */
  id: string;
  title: string;
  startYear: number | null;
  endYear: number | null;
  memoryCount: number;
  /** Dominant human emotional themes. */
  themes: string[];
  /** Collections that share this chapter's theme. */
  connectedCollections: number;
  lastActiveAt: string | null;
}

export interface ChapterMemory {
  id: string;
  title: string | null;
  ai_title: string | null;
  created_at: string;
  memory_date: string | null;
  memory_date_precision: string | null;
  ai_category: string | null;
  ai_mood: string | null;
}

const GENERIC_CATEGORIES = new Set([
  "",
  "general",
  "uncategorized",
  "memory",
  "other",
]);

const MEMORY_LIMIT = 600;

function clean(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isNarrativeCategory(category: string | null): category is string {
  if (!category) return false;
  return !GENERIC_CATEGORIES.has(category.toLowerCase());
}

function deriveThemes(moods: (string | null)[]): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of moods) {
    const label = raw?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => e.label.charAt(0).toUpperCase() + e.label.slice(1));
}

function summarize(mems: ChapterMemory[]): {
  startYear: number | null;
  endYear: number | null;
  lastActiveAt: string | null;
} {
  let startYear: number | null = null;
  let endYear: number | null = null;
  let lastActiveAt: string | null = null;
  let lastMs = -Infinity;

  for (const m of mems) {
    const year = resolveEffectiveDate(m).getFullYear();
    if (!Number.isNaN(year)) {
      startYear = startYear === null ? year : Math.min(startYear, year);
      endYear = endYear === null ? year : Math.max(endYear, year);
    }
    const createdMs = new Date(m.created_at).getTime();
    if (!Number.isNaN(createdMs) && createdMs > lastMs) {
      lastMs = createdMs;
      lastActiveAt = m.created_at;
    }
  }
  return { startYear, endYear, lastActiveAt };
}

export async function getRemyLifeChapters(
  supabase: DashboardSupabase,
  userId: string,
  opts: { sort?: "chronological" | "count"; limit?: number } = {}
): Promise<RemyLifeChapter[]> {
  const [memories, collectionCategoryCounts] = await Promise.all([
    fetchUserMemories(supabase, userId),
    fetchCollectionCategoryCounts(supabase, userId),
  ]);
  if (memories.length === 0) return [];

  const groups = new Map<string, { title: string; mems: ChapterMemory[] }>();
  for (const m of memories) {
    const category = clean(m.ai_category);
    if (!isNarrativeCategory(category)) continue;
    const slug = slugify(category);
    if (!slug) continue;
    let group = groups.get(slug);
    if (!group) {
      group = { title: titleCase(category), mems: [] };
      groups.set(slug, group);
    }
    group.mems.push(m);
  }

  const chapters: RemyLifeChapter[] = [];
  for (const [slug, group] of groups) {
    const { startYear, endYear, lastActiveAt } = summarize(group.mems);
    chapters.push({
      id: slug,
      title: group.title,
      startYear,
      endYear,
      memoryCount: group.mems.length,
      themes: deriveThemes(group.mems.map((m) => m.ai_mood)),
      connectedCollections: collectionCategoryCounts.get(slug) ?? 0,
      lastActiveAt,
    });
  }

  if (opts.sort === "count") {
    chapters.sort(
      (a, b) =>
        b.memoryCount - a.memoryCount ||
        (b.endYear ?? 0) - (a.endYear ?? 0)
    );
  } else {
    // Chronological — the narrative order. Undated chapters sort last.
    chapters.sort(
      (a, b) =>
        (a.startYear ?? Infinity) - (b.startYear ?? Infinity) ||
        (a.endYear ?? Infinity) - (b.endYear ?? Infinity)
    );
  }

  return typeof opts.limit === "number"
    ? chapters.slice(0, opts.limit)
    : chapters;
}

export async function getRemyLifeChapterById(
  supabase: DashboardSupabase,
  userId: string,
  id: string
): Promise<{
  chapter: RemyLifeChapter;
  memories: ChapterMemory[];
} | null> {
  const [memories, collectionCategoryCounts] = await Promise.all([
    fetchUserMemories(supabase, userId),
    fetchCollectionCategoryCounts(supabase, userId),
  ]);

  const matched = memories.filter((m) => {
    const category = clean(m.ai_category);
    return isNarrativeCategory(category) && slugify(category) === id;
  });
  if (matched.length === 0) return null;

  const title = titleCase(clean(matched[0].ai_category) as string);
  const { startYear, endYear, lastActiveAt } = summarize(matched);

  // Oldest → newest, so the chapter reads as a story unfolding.
  matched.sort(
    (a, b) =>
      resolveEffectiveDate(a).getTime() - resolveEffectiveDate(b).getTime()
  );

  return {
    chapter: {
      id,
      title,
      startYear,
      endYear,
      memoryCount: matched.length,
      themes: deriveThemes(matched.map((m) => m.ai_mood)),
      connectedCollections: collectionCategoryCounts.get(id) ?? 0,
      lastActiveAt,
    },
    memories: matched,
  };
}

/** Human "1975 → 1988" / "2016 → Present" / "1990". */
export function formatChapterRange(
  chapter: Pick<RemyLifeChapter, "startYear" | "endYear">
): string | null {
  const { startYear } = chapter;
  if (startYear === null) return null;
  const end = chapter.endYear ?? startYear;
  if (startYear === end) return String(startYear);
  const currentYear = new Date().getFullYear();
  const endLabel = end >= currentYear ? "Present" : String(end);
  return `${startYear} → ${endLabel}`;
}

// ── Best-effort reads ───────────────────────────────────────────────────────
async function fetchUserMemories(
  supabase: DashboardSupabase,
  userId: string
): Promise<ChapterMemory[]> {
  try {
    const { data } = await supabase
      .from("memories")
      .select(
        "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category, ai_mood"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MEMORY_LIMIT);
    return (data as ChapterMemory[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchCollectionCategoryCounts(
  supabase: DashboardSupabase,
  userId: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const { data } = await supabase
      .from("memory_clusters")
      .select("category")
      .eq("user_id", userId)
      .limit(500);
    for (const row of (data as { category: string | null }[] | null) ?? []) {
      const category = clean(row.category);
      if (!isNarrativeCategory(category)) continue;
      const slug = slugify(category);
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  } catch {
    // best-effort
    return counts;
  }
  return counts;
}
