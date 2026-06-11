import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remy Collections — Remy's "Organize" capability.
 *
 * A Collection is the human face of an existing stored memory grouping. This
 * model is the ONLY place that reads the underlying grouping tables; everything
 * above it speaks in human terms (Collection / Theme), never internal language.
 *
 *   Memory groupings (existing data) → Remy Collections
 *
 * Read-only and best-effort: no creation, no regrouping, no AI. If the grouping
 * data is missing or unreadable, this degrades to an empty list and the UI
 * simply doesn't show collections.
 */
export interface RemyCollection {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  memoryCount: number;
  /** Human emotional themes, e.g. ["Warmth", "Joy", "Connection"]. */
  emotionalThemes: string[];
  startYear: number | null;
  endYear: number | null;
  /** Most recent member memory — used for "recently active" sorting. */
  lastActiveAt: string | null;
}

export interface CollectionMemory {
  id: string;
  title: string | null;
  ai_title: string | null;
  created_at: string;
  memory_date: string | null;
  memory_date_precision: string | null;
  ai_category: string | null;
  ai_mood: string | null;
}

interface ClusterRow {
  id: string;
  title: string | null;
  summary: string | null;
  category: string | null;
  emotional_theme: string | null;
}

interface ItemRow {
  cluster_id: string | null;
  memory_id: string | null;
}

const TECHNICAL = /cluster/i;

function clean(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Human title — never surfaces internal grouping language. */
function collectionTitle(c: ClusterRow): string {
  const title = clean(c.title);
  if (title && !TECHNICAL.test(title)) return title;
  const category = clean(c.category);
  if (category && !TECHNICAL.test(category)) return category;
  return "Memory Collection";
}

/** Up to three human emotional themes from member moods, with a fallback. */
function deriveThemes(
  moods: (string | null)[],
  fallback: string | null
): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const raw of moods) {
    const label = raw?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  const top = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((e) => capitalize(e.label));
  if (top.length > 0) return top;
  const fb = clean(fallback);
  return fb ? [capitalize(fb)] : [];
}

export async function getRemyCollections(
  supabase: DashboardSupabase,
  userId: string,
  opts: { limit?: number; includeDetails?: boolean } = {}
): Promise<RemyCollection[]> {
  const clusters = await fetchClusters(supabase, userId);
  if (clusters.length === 0) return [];

  const clusterIds = clusters.map((c) => c.id);
  const items = await fetchItems(supabase, clusterIds);

  // Distinct member memory ids per grouping.
  const byCollection = new Map<string, Set<string>>();
  const allMemberIds = new Set<string>();
  for (const it of items) {
    if (!it.cluster_id || !it.memory_id) continue;
    let set = byCollection.get(it.cluster_id);
    if (!set) {
      set = new Set();
      byCollection.set(it.cluster_id, set);
    }
    set.add(it.memory_id);
    allMemberIds.add(it.memory_id);
  }

  const memberMap = new Map<string, CollectionMemory>();
  if (opts.includeDetails && allMemberIds.size > 0) {
    const members = await fetchMembers(
      supabase,
      userId,
      [...allMemberIds].slice(0, 1000)
    );
    for (const m of members) memberMap.set(m.id, m);
  }

  const collections = clusters
    .map((c) => {
      const ids = byCollection.get(c.id) ?? new Set<string>();
      let startYear: number | null = null;
      let endYear: number | null = null;
      let lastActiveAt: string | null = null;
      const moods: (string | null)[] = [];

      if (opts.includeDetails) {
        let minYear = Infinity;
        let maxYear = -Infinity;
        let lastMs = -Infinity;
        for (const id of ids) {
          const m = memberMap.get(id);
          if (!m) continue;
          const year = resolveEffectiveDate(m).getFullYear();
          if (!Number.isNaN(year)) {
            if (year < minYear) minYear = year;
            if (year > maxYear) maxYear = year;
          }
          const createdMs = new Date(m.created_at).getTime();
          if (!Number.isNaN(createdMs) && createdMs > lastMs) {
            lastMs = createdMs;
            lastActiveAt = m.created_at;
          }
          moods.push(m.ai_mood);
        }
        if (minYear !== Infinity) {
          startYear = minYear;
          endYear = maxYear;
        }
      }

      return {
        id: c.id,
        title: collectionTitle(c),
        summary: clean(c.summary),
        category: clean(c.category),
        memoryCount: ids.size,
        emotionalThemes: deriveThemes(moods, c.emotional_theme),
        startYear,
        endYear,
        lastActiveAt,
      };
    })
    .filter((col) => col.memoryCount > 0);

  collections.sort(
    (a, b) =>
      b.memoryCount - a.memoryCount ||
      new Date(b.lastActiveAt ?? 0).getTime() -
        new Date(a.lastActiveAt ?? 0).getTime()
  );

  return typeof opts.limit === "number"
    ? collections.slice(0, opts.limit)
    : collections;
}

export async function getRemyCollectionById(
  supabase: DashboardSupabase,
  userId: string,
  id: string
): Promise<{
  collection: RemyCollection;
  memories: CollectionMemory[];
} | null> {
  const { data: cluster } = await supabase
    .from("memory_clusters")
    .select("id, title, summary, category, emotional_theme")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!cluster) return null;
  const c = cluster as ClusterRow;

  const items = await fetchItems(supabase, [id]);
  const memberIds = [
    ...new Set(
      items.map((it) => it.memory_id).filter(Boolean) as string[]
    ),
  ];

  let memories: CollectionMemory[] = [];
  if (memberIds.length > 0) {
    try {
      const { data } = await supabase
        .from("memories")
        .select(
          "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category, ai_mood"
        )
        .in("id", memberIds.slice(0, 1000))
        .eq("user_id", userId);
      memories = (data as CollectionMemory[] | null) ?? [];
    } catch {
      memories = [];
    }
  }

  memories.sort(
    (a, b) =>
      resolveEffectiveDate(b).getTime() - resolveEffectiveDate(a).getTime()
  );

  let startYear: number | null = null;
  let endYear: number | null = null;
  let lastActiveAt: string | null = null;
  let lastMs = -Infinity;
  for (const m of memories) {
    const year = resolveEffectiveDate(m).getFullYear();
    if (!Number.isNaN(year)) {
      startYear =
        startYear === null ? year : Math.min(startYear, year);
      endYear = endYear === null ? year : Math.max(endYear, year);
    }
    const createdMs = new Date(m.created_at).getTime();
    if (!Number.isNaN(createdMs) && createdMs > lastMs) {
      lastMs = createdMs;
      lastActiveAt = m.created_at;
    }
  }

  return {
    collection: {
      id: c.id,
      title: collectionTitle(c),
      summary: clean(c.summary),
      category: clean(c.category),
      memoryCount: memories.length,
      emotionalThemes: deriveThemes(
        memories.map((m) => m.ai_mood),
        c.emotional_theme
      ),
      startYear,
      endYear,
      lastActiveAt,
    },
    memories,
  };
}

/** Human "1965 → 2024" / "1980" / null. */
export function formatCollectionRange(
  collection: Pick<RemyCollection, "startYear" | "endYear">
): string | null {
  const { startYear, endYear } = collection;
  if (startYear === null) return null;
  if (endYear === null || startYear === endYear) return String(startYear);
  return `${startYear} → ${endYear}`;
}

// ── Best-effort reads (each degrades to [] so collections never break a page) ─
async function fetchClusters(
  supabase: DashboardSupabase,
  userId: string
): Promise<ClusterRow[]> {
  try {
    const { data } = await supabase
      .from("memory_clusters")
      .select("id, title, summary, category, emotional_theme")
      .eq("user_id", userId)
      .limit(200);
    return (data as ClusterRow[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchItems(
  supabase: DashboardSupabase,
  clusterIds: string[]
): Promise<ItemRow[]> {
  if (clusterIds.length === 0) return [];
  try {
    const { data } = await supabase
      .from("memory_cluster_items")
      .select("cluster_id, memory_id")
      .in("cluster_id", clusterIds);
    return (data as ItemRow[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchMembers(
  supabase: DashboardSupabase,
  userId: string,
  memoryIds: string[]
): Promise<CollectionMemory[]> {
  try {
    const { data } = await supabase
      .from("memories")
      .select(
        "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category, ai_mood"
      )
      .in("id", memoryIds)
      .eq("user_id", userId);
    return (data as CollectionMemory[] | null) ?? [];
  } catch {
    return [];
  }
}
