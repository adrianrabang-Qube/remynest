import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remy Collections (V2) — Remy's "Organize" capability.
 *
 * A Collection is the human face of an existing stored memory grouping, but V2
 * surfaces meaningful THEMES rather than one-collection-per-memory.
 *
 *   Memory groupings (existing data) → consolidate by theme → Remy Collections
 *
 * Dedup strategy: the underlying groupings are created one-per-memory, so near
 * identical groupings repeat (e.g. three "…Gym Workout" groupings all of
 * category "Fitness"). V2 collapses groupings that share the same `category`
 * (the existing thematic field) into a single collection whose membership is the
 * UNION of their members. This is linear — O(clusters + items), no pairwise
 * O(clusters²) overlap scan — and directly produces themes ("Fitness").
 *
 * Read-only and best-effort: no creation, no regrouping, no AI, no migrations.
 * Degrades to an empty list when meaningful themes can't be derived.
 */
export interface RemyCollection {
  /** Stable id — a category slug (e.g. "fitness"). */
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
  created_at: string | null;
}

interface ItemRow {
  cluster_id: string | null;
  memory_id: string | null;
}

// A theme is meaningless without a real category or enough memories.
const GENERIC_CATEGORIES = new Set([
  "",
  "general",
  "uncategorized",
  "memory",
  "other",
]);
const MIN_COLLECTION_MEMORIES = 3;
// Scalability bound — only the most recent groupings are considered, so reads
// never grow unbounded with total memory volume.
const CLUSTER_LIMIT = 500;
const MEMBER_FETCH_CAP = 1000;
const TECHNICAL = /cluster/i;

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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** A usable thematic category — non-empty, non-generic, non-technical. */
function themeOf(c: ClusterRow): string | null {
  const category = clean(c.category);
  if (!category) return null;
  if (GENERIC_CATEGORIES.has(category.toLowerCase())) return null;
  if (TECHNICAL.test(category)) return null;
  return category;
}

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

/** One consolidated theme: the clusters that share a category + their members. */
interface ThemeGroup {
  slug: string;
  label: string;
  clusters: ClusterRow[];
  members: Set<string>;
}

function groupClustersByTheme(
  clusters: ClusterRow[],
  membersByCluster: Map<string, Set<string>>
): Map<string, ThemeGroup> {
  const groups = new Map<string, ThemeGroup>();
  for (const c of clusters) {
    const theme = themeOf(c);
    if (!theme) continue;
    const slug = slugify(theme);
    if (!slug) continue;
    let group = groups.get(slug);
    if (!group) {
      group = { slug, label: titleCase(theme), clusters: [], members: new Set() };
      groups.set(slug, group);
    }
    group.clusters.push(c);
    const set = membersByCluster.get(c.id);
    if (set) for (const id of set) group.members.add(id);
  }
  return groups;
}

/** Representative summary = from the grouping with the most members. */
function representativeSummary(group: ThemeGroup): string | null {
  const ordered = [...group.clusters].sort((a, b) => {
    const sa = clean(a.summary) ? 1 : 0;
    const sb = clean(b.summary) ? 1 : 0;
    return sb - sa;
  });
  for (const c of ordered) {
    const s = clean(c.summary);
    if (s) return s;
  }
  return null;
}

function representativeEmotion(group: ThemeGroup): string | null {
  for (const c of group.clusters) {
    const e = clean(c.emotional_theme);
    if (e) return e;
  }
  return null;
}

export async function getRemyCollections(
  supabase: DashboardSupabase,
  userId: string,
  opts: { limit?: number; includeDetails?: boolean } = {}
): Promise<RemyCollection[]> {
  const clusters = await fetchClusters(supabase, userId);
  if (clusters.length === 0) return [];

  const items = await fetchItems(
    supabase,
    clusters.map((c) => c.id)
  );
  const membersByCluster = membershipMap(items);
  const groups = groupClustersByTheme(clusters, membersByCluster);

  // Member details (date range + moods) — one bounded fetch for all themes.
  const memberMap = new Map<string, CollectionMemory>();
  if (opts.includeDetails) {
    const allIds = new Set<string>();
    for (const g of groups.values())
      for (const id of g.members) allIds.add(id);
    if (allIds.size > 0) {
      const members = await fetchMembers(
        supabase,
        userId,
        [...allIds].slice(0, MEMBER_FETCH_CAP)
      );
      for (const m of members) memberMap.set(m.id, m);
    }
  }

  const collections: RemyCollection[] = [];
  for (const group of groups.values()) {
    if (group.members.size < MIN_COLLECTION_MEMORIES) continue;

    let startYear: number | null = null;
    let endYear: number | null = null;
    let lastActiveAt: string | null = null;
    const moods: (string | null)[] = [];

    if (opts.includeDetails) {
      let lastMs = -Infinity;
      for (const id of group.members) {
        const m = memberMap.get(id);
        if (!m) continue;
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
        moods.push(m.ai_mood);
      }
    }

    const emotion = representativeEmotion(group);
    collections.push({
      id: group.slug,
      title: group.label,
      summary: representativeSummary(group),
      category: group.label,
      memoryCount: group.members.size,
      emotionalThemes: opts.includeDetails
        ? deriveThemes(moods, emotion)
        : emotion
          ? [capitalize(emotion)]
          : [],
      startYear,
      endYear,
      lastActiveAt,
    });
  }

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
  const clusters = await fetchClusters(supabase, userId);
  const matching = clusters.filter((c) => {
    const theme = themeOf(c);
    return theme !== null && slugify(theme) === id;
  });
  if (matching.length === 0) return null;

  const items = await fetchItems(
    supabase,
    matching.map((c) => c.id)
  );
  const memberIds = [
    ...new Set(
      items.map((it) => it.memory_id).filter(Boolean) as string[]
    ),
  ];
  if (memberIds.length === 0) return null;

  let memories: CollectionMemory[] = [];
  try {
    const { data } = await supabase
      .from("memories")
      .select(
        "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category, ai_mood"
      )
      .in("id", memberIds.slice(0, MEMBER_FETCH_CAP))
      .eq("user_id", userId);
    memories = (data as CollectionMemory[] | null) ?? [];
  } catch {
    memories = [];
  }

  memories.sort(
    (a, b) =>
      resolveEffectiveDate(b).getTime() - resolveEffectiveDate(a).getTime()
  );

  const group: ThemeGroup = {
    slug: id,
    label: titleCase(themeOf(matching[0]) as string),
    clusters: matching,
    members: new Set(memberIds),
  };

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

  return {
    collection: {
      id,
      title: group.label,
      summary: representativeSummary(group),
      category: group.label,
      memoryCount: memories.length,
      emotionalThemes: deriveThemes(
        memories.map((m) => m.ai_mood),
        representativeEmotion(group)
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

// ── helpers ────────────────────────────────────────────────────────────────
function membershipMap(items: ItemRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.cluster_id || !it.memory_id) continue;
    let set = map.get(it.cluster_id);
    if (!set) {
      set = new Set();
      map.set(it.cluster_id, set);
    }
    set.add(it.memory_id);
  }
  return map;
}

// ── best-effort reads (each degrades to [] so a page never breaks) ───────────
async function fetchClusters(
  supabase: DashboardSupabase,
  userId: string
): Promise<ClusterRow[]> {
  try {
    const { data } = await supabase
      .from("memory_clusters")
      .select("id, title, summary, category, emotional_theme, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(CLUSTER_LIMIT);
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
