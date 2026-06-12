import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Life Chapters (V2) — Remy's narrative layer, the top of the stack
 * (Memories → Collections → Connections → Life Chapters).
 *
 * V1 grouped by `ai_category`, which produced topical, present-dated pseudo
 * chapters ("Cognition 2026") — technical groupings, not a life. V2 builds
 * chapters from TIME: memories with a real historical `memory_date` are grouped
 * into life PERIODS (decades) using the shared effective-date helper. Within a
 * period, the dominant THEMES reuse the Collections V2 category model, and the
 * "spans multiple periods" framing is the counterpart to Connections V2.
 *
 * Read-only, best-effort, no AI, no migrations, existing fields only. Gated on
 * dated-memory sufficiency so it never fabricates a chapter — it grows as Memory
 * Date Adoption fills in dates.
 */
export interface RemyLifeChapter {
  /** Decade slug — stable id for routing, e.g. "1980s". */
  id: string;
  title: string;
  /** One-line human narrative for the period. */
  summary: string;
  startYear: number | null;
  endYear: number | null;
  memoryCount: number;
  /** Dominant human themes in the period (categories). */
  themes: string[];
  /** Distinct collections (themes) represented in this period. */
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

// A life narrative needs at least a couple of placed-in-time memories.
const MIN_TOTAL_DATED = 2;
const MEMORY_LIMIT = 600;

function clean(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function themeOf(m: ChapterMemory): string | null {
  const c = clean(m.ai_category);
  if (!c || GENERIC_CATEGORIES.has(c.toLowerCase())) return null;
  return titleCase(c);
}

function dominantThemes(memories: ChapterMemory[]): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const m of memories) {
    const label = themeOf(m);
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => e.label);
}

function chapterSummary(themes: string[]): string {
  if (themes.length === 0) {
    return "A period of life captured in memories.";
  }
  if (themes.length === 1) {
    return `A period centered on ${themes[0]}.`;
  }
  const [first, second] = themes;
  return `A period spanning ${first} and ${second}${
    themes.length > 2 ? " and more" : ""
  }.`;
}

function buildChapter(
  decadeStart: number,
  memories: ChapterMemory[]
): RemyLifeChapter {
  let startYear: number | null = null;
  let endYear: number | null = null;
  let lastActiveAt: string | null = null;
  let lastMs = -Infinity;

  for (const m of memories) {
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

  const themes = dominantThemes(memories);
  return {
    id: `${decadeStart}s`,
    title: `The ${decadeStart}s`,
    summary: chapterSummary(themes),
    startYear,
    endYear,
    memoryCount: memories.length,
    themes: themes.slice(0, 3),
    connectedCollections: themes.length,
    lastActiveAt,
  };
}

export async function getRemyLifeChapters(
  supabase: DashboardSupabase,
  userId: string,
  opts: { sort?: "chronological" | "count"; limit?: number } = {}
): Promise<RemyLifeChapter[]> {
  const dated = await fetchDatedMemories(supabase, userId);
  if (dated.length < MIN_TOTAL_DATED) return [];

  const byDecade = new Map<number, ChapterMemory[]>();
  for (const m of dated) {
    const year = resolveEffectiveDate(m).getFullYear();
    if (Number.isNaN(year)) continue;
    const decadeStart = Math.floor(year / 10) * 10;
    const list = byDecade.get(decadeStart) ?? [];
    list.push(m);
    byDecade.set(decadeStart, list);
  }

  const chapters = [...byDecade.entries()].map(([decadeStart, memories]) =>
    buildChapter(decadeStart, memories)
  );

  if (opts.sort === "count") {
    chapters.sort(
      (a, b) =>
        b.memoryCount - a.memoryCount ||
        (b.startYear ?? 0) - (a.startYear ?? 0)
    );
  } else {
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
  const decadeStart = parseInt(id, 10);
  if (Number.isNaN(decadeStart)) return null;

  const dated = await fetchDatedMemories(supabase, userId);
  const matched = dated.filter((m) => {
    const year = resolveEffectiveDate(m).getFullYear();
    return (
      !Number.isNaN(year) && Math.floor(year / 10) * 10 === decadeStart
    );
  });
  if (matched.length === 0) return null;

  // Oldest → newest, so the chapter reads as a story unfolding.
  matched.sort(
    (a, b) =>
      resolveEffectiveDate(a).getTime() - resolveEffectiveDate(b).getTime()
  );

  return {
    chapter: buildChapter(decadeStart, matched),
    memories: matched,
  };
}

/** Human "1975 → 1988" / "1980" / null. */
export function formatChapterRange(
  chapter: Pick<RemyLifeChapter, "startYear" | "endYear">
): string | null {
  const { startYear, endYear } = chapter;
  if (startYear === null) return null;
  if (endYear === null || startYear === endYear) return String(startYear);
  return `${startYear} → ${endYear}`;
}

// ── best-effort read ─────────────────────────────────────────────────────────
async function fetchDatedMemories(
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
      .not("memory_date", "is", null)
      .order("memory_date", { ascending: true })
      .limit(MEMORY_LIMIT);
    return (data as ChapterMemory[] | null) ?? [];
  } catch {
    return [];
  }
}
