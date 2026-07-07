import type { createClient } from "@/utils/supabase/server";

/**
 * Milestone B — Memory Intelligence Graph (AGGREGATE, SERVER ONLY, read-only).
 *
 * Deterministic temporal/theme intelligence over the workspace's memories — recurring themes,
 * yearly/seasonal activity, busiest years, decade clusters, density — computed with PURE
 * derivations from a single owner+workspace-scoped metadata read. NO new AI, NO embeddings, NO
 * semantic/vector search, NO new retrieval engine; it only aggregates EXISTING columns
 * (memory_date, ai_category, ai_tags). Nothing is inferred beyond the recorded data, so it
 * cannot hallucinate. Complements the person graph (relationship-intelligence.ts).
 */
type RemySupabase = Awaited<ReturnType<typeof createClient>>;

const MEMORY_STATS_CAP = 3000;

export interface MemoryStat {
  id: string;
  date: string | null;
  title: string | null;
  category: string | null;
  tags: string[];
}

/** One owner+workspace-scoped read of memory metadata for aggregate stats (no search, no AI). */
export async function getMemoryStats(
  supabase: RemySupabase,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<MemoryStat[]> {
  let q = supabase
    .from("memories")
    .select("id, memory_date, title, ai_title, ai_category, ai_tags")
    .eq("user_id", ownerAccountId)
    .order("memory_date", { ascending: false, nullsFirst: false })
    .limit(MEMORY_STATS_CAP);
  q = memoryProfileId ? q.eq("memory_profile_id", memoryProfileId) : q.is("memory_profile_id", null);
  const { data } = await q;
  return ((data ?? []) as {
    id: string;
    memory_date: string | null;
    title: string | null;
    ai_title: string | null;
    ai_category: string | null;
    ai_tags: string[] | null;
  }[]).map((r) => ({
    id: r.id,
    date: r.memory_date ?? null,
    title: r.ai_title || r.title || null,
    category: r.ai_category ?? null,
    tags: Array.isArray(r.ai_tags) ? r.ai_tags : [],
  }));
}

function yearOf(date: string | null): number | null {
  if (!date) return null;
  const y = new Date(date).getFullYear();
  return Number.isNaN(y) ? null : y;
}
function monthOf(date: string | null): number | null {
  if (!date) return null;
  const m = new Date(date).getMonth() + 1;
  return Number.isNaN(m) ? null : m;
}

// ---------------------------------------------------------------------------
// Pure derivations
// ---------------------------------------------------------------------------
export interface ThemeCount {
  theme: string;
  count: number;
}
export interface YearCount {
  year: number;
  count: number;
}

/** Recurring themes = categories + tags ranked by how many memories carry them. Pure. */
export function themeRanking(stats: MemoryStat[], limit = 8): ThemeCount[] {
  const counts = new Map<string, number>();
  for (const s of stats) {
    const cat = (s.category ?? "").trim();
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    for (const raw of s.tags) {
      const t = (raw ?? "").trim();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([theme, count]) => ({ theme, count }));
}

/** Memories per calendar year, ascending by year. Pure. */
export function yearlyActivity(stats: MemoryStat[]): YearCount[] {
  const counts = new Map<number, number>();
  for (const s of stats) {
    const y = yearOf(s.date);
    if (y != null) counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
}

/** The busiest years by memory count. Pure. */
export function busiestYears(stats: MemoryStat[], limit = 3): YearCount[] {
  return [...yearlyActivity(stats)]
    .sort((a, b) => b.count - a.count || b.year - a.year)
    .slice(0, limit);
}

/** Memories per month (1–12). Pure. */
export function monthlyActivity(stats: MemoryStat[]): { month: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const s of stats) {
    const m = monthOf(s.date);
    if (m != null) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([month, count]) => ({ month, count }));
}

export interface MemoryGraphSummary {
  total: number;
  datedCount: number;
  themes: ThemeCount[];
  busiest: YearCount[];
  yearly: YearCount[];
  fromYear: number | null;
  toYear: number | null;
}

export function buildMemoryGraphSummary(stats: MemoryStat[]): MemoryGraphSummary {
  const yearly = yearlyActivity(stats);
  const datedCount = yearly.reduce((n, y) => n + y.count, 0);
  return {
    total: stats.length,
    datedCount,
    themes: themeRanking(stats),
    busiest: busiestYears(stats),
    yearly,
    fromYear: yearly.length ? yearly[0].year : null,
    toYear: yearly.length ? yearly[yearly.length - 1].year : null,
  };
}

// ---------------------------------------------------------------------------
// "Around an event / season" — grounded month + keyword filter (no inference)
// ---------------------------------------------------------------------------
const EVENT_MONTH: Record<string, number> = {
  christmas: 12,
  "new year": 1,
  valentine: 2,
  "valentine's": 2,
  easter: 4,
  halloween: 10,
  thanksgiving: 11,
};
const SEASON_MONTHS: Record<string, number[]> = {
  summer: [6, 7, 8],
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  autumn: [9, 10, 11],
  fall: [9, 10, 11],
};

/**
 * ALL memories that fall in the term's month(s) OR name the term in title/category/tags. Pure.
 * Returns the full matched set (caller slices for display) so the reported total is accurate.
 */
export function memoriesAround(stats: MemoryStat[], term: string): MemoryStat[] {
  const key = term.toLowerCase().trim();
  const months = new Set<number>(
    EVENT_MONTH[key] != null ? [EVENT_MONTH[key]] : (SEASON_MONTHS[key] ?? []),
  );
  const matches = stats.filter((s) => {
    const m = monthOf(s.date);
    if (m != null && months.has(m)) return true;
    const hay = [s.title ?? "", s.category ?? "", ...s.tags].join(" ").toLowerCase();
    return hay.includes(key);
  });
  matches.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
  return matches;
}

// ---------------------------------------------------------------------------
// Intent + grounded answers
// ---------------------------------------------------------------------------
export type MemoryGraphIntent =
  | { kind: "themes" }
  | { kind: "busiest-years" }
  | { kind: "around"; term: string }
  | null;

const RE_THEMES =
  /\bwhat (are (my|the) )?(top |main |common |recurring )?(themes|categories|topics)\b|\bwhat themes\b|\b(themes|categories) (appear|come up)\b/;
const RE_BUSIEST =
  /\b(what|which) years?.*(busiest|most active|most memories)\b|\b(busiest|most active) years?\b/;
const RE_AROUND = /\baround (?:the )?([a-z' ]+?)(?:\?|$| time| holidays?)/;

export function detectMemoryGraphIntent(query: string): MemoryGraphIntent {
  const q = (query ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!q) return null;
  if (RE_BUSIEST.test(q)) return { kind: "busiest-years" };
  if (RE_THEMES.test(q)) return { kind: "themes" };
  const around = q.match(RE_AROUND);
  if (around) {
    const term = around[1].trim();
    if (EVENT_MONTH[term] != null || SEASON_MONTHS[term] != null || term === "holidays") {
      return { kind: "around", term: term === "holidays" ? "christmas" : term };
    }
  }
  return null;
}

export interface MemoryGraphAnswer {
  text: string;
  count: number;
  memories: { memoryId: string; title: string | null; memoryDate: string | null }[];
  summary?: MemoryGraphSummary;
}

const NO_DATA = "I don't have enough dated or categorised memories yet to answer that.";

/** Deterministic, grounded answer for an aggregate memory-graph question. Read-only. */
export async function answerMemoryGraph(
  supabase: RemySupabase,
  intent: NonNullable<MemoryGraphIntent>,
  ownerAccountId: string,
  memoryProfileId: string | null,
): Promise<MemoryGraphAnswer> {
  const stats = await getMemoryStats(supabase, ownerAccountId, memoryProfileId);
  const summary = buildMemoryGraphSummary(stats);

  if (intent.kind === "themes") {
    if (summary.themes.length === 0) return { text: NO_DATA, count: 0, memories: [] };
    const list = summary.themes
      .slice(0, 6)
      .map((t) => `${t.theme} (${t.count})`)
      .join(", ");
    return {
      // count 0: aggregate answer (not a small retrieved memory set) — suppresses the
      // "based on N memories" footnote; the card conveys the figures.
      text: `The themes that appear most across your recorded memories: ${list}.`,
      count: 0,
      memories: [],
      summary,
    };
  }

  if (intent.kind === "busiest-years") {
    if (summary.busiest.length === 0) return { text: NO_DATA, count: 0, memories: [] };
    const list = summary.busiest
      .map((y) => `${y.year} (${y.count} ${y.count === 1 ? "memory" : "memories"})`)
      .join(", ");
    return {
      text: `Your busiest years for recorded memories: ${list}.`,
      count: 0,
      memories: [],
      summary,
    };
  }

  // around — report the TRUE match count; show up to 10; NO workspace-wide summary card (it
  // would not match this seasonal answer).
  const found = memoriesAround(stats, intent.term);
  if (found.length === 0) {
    return { text: `I couldn't find recorded memories around ${intent.term}.`, count: 0, memories: [] };
  }
  const shown = found.slice(0, 10);
  const examples = shown
    .slice(0, 3)
    .map((m) => `"${m.title ?? "Untitled memory"}"`)
    .join(", ");
  return {
    text: `I found ${found.length} recorded ${
      found.length === 1 ? "memory" : "memories"
    } around ${intent.term} — for example ${examples}.`,
    count: found.length,
    memories: shown.map((m) => ({ memoryId: m.id, title: m.title, memoryDate: m.date })),
  };
}
