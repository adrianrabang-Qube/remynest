import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remy Connections (V2) — meaningful relationship DISCOVERY, not graph density.
 *
 *   Memory relationships (existing data) → diversity-ranked Connections
 *
 * V1 ranked by raw degree, so a dense single-theme clique read as "17 connected
 * memories" — true but redundant. V2 ranks by DIVERSITY: connections that span
 * multiple themes (categories) and/or multiple periods (decades) are promoted;
 * connections that only link memories within one theme are down-ranked and the
 * redundant same-theme hubs are collapsed to a single representative. The output
 * speaks in narrative, never "similarity"/"vector"/"embedding"/score.
 *
 * Read-only, best-effort, no AI, no migrations. Reuses memory `ai_category`
 * (theme) + effective dates (era) already fetched — no extra queries.
 */
export interface RemyConnection {
  /** Anchor memory id. */
  id: string;
  title: string;
  /** Narrative summary — the human headline (never a raw count). */
  summary: string;
  connectedCount: number;
  /** Distinct theme hints (categories) across the connected memories. */
  themes: string[];
  startYear: number | null;
  endYear: number | null;
  spansThemes: boolean;
  spansEras: boolean;
  /** 0–3; higher = more meaningful (cross-era weighted above cross-theme). */
  diversityScore: number;
  lastActiveAt: string | null;
}

export interface ConnectionMemory {
  id: string;
  title: string | null;
  ai_title: string | null;
  created_at: string;
  memory_date: string | null;
  memory_date_precision: string | null;
  ai_category: string | null;
}

interface RelationshipRow {
  memory_id: string | null;
  related_memory_id: string | null;
}

const MIN_CONNECTED = 2;
const MEMORY_SCAN_LIMIT = 400;
const GENERIC_CATEGORIES = new Set([
  "",
  "general",
  "uncategorized",
  "memory",
  "other",
]);

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

function themeLabel(m: ConnectionMemory): string | null {
  const c = clean(m.ai_category);
  if (!c || GENERIC_CATEGORIES.has(c.toLowerCase())) return null;
  return titleCase(c);
}

function connectionSummary(spansEras: boolean, spansThemes: boolean): string {
  if (spansEras && spansThemes)
    return "This story reaches across different periods and themes of life.";
  if (spansEras) return "This story spans multiple periods.";
  if (spansThemes) return "These memories may be part of the same story.";
  return "These memories share a common theme.";
}

/** Date span helper, e.g. "1965 → 2024" / "1980" / null. */
export function formatConnectionSpan(
  connection: Pick<RemyConnection, "startYear" | "endYear">
): string | null {
  const { startYear, endYear } = connection;
  if (startYear === null) return null;
  if (endYear === null || startYear === endYear) return String(startYear);
  return `${startYear} → ${endYear}`;
}

interface Diversity {
  themes: string[];
  startYear: number | null;
  endYear: number | null;
  spansThemes: boolean;
  spansEras: boolean;
  diversityScore: number;
}

/**
 * Distinct themes + eras across a set of memories (anchor + connected).
 * A theme must have >= 2 members to count toward "spanning" — a single stray
 * category shouldn't make a connection look cross-theme (the categories are
 * noisy). Era spanning uses coarse decades, which is robust + the strongest
 * "this reaches across periods" signal.
 */
function analyzeDiversity(memories: ConnectionMemory[]): Diversity {
  const themeCounts = new Map<string, { label: string; count: number }>();
  const decades = new Set<number>();
  let startYear: number | null = null;
  let endYear: number | null = null;

  for (const m of memories) {
    const label = themeLabel(m);
    if (label) {
      const key = slugify(label);
      const entry = themeCounts.get(key) ?? { label, count: 0 };
      entry.count += 1;
      themeCounts.set(key, entry);
    }
    const year = resolveEffectiveDate(m).getFullYear();
    if (!Number.isNaN(year)) {
      decades.add(Math.floor(year / 10) * 10);
      startYear = startYear === null ? year : Math.min(startYear, year);
      endYear = endYear === null ? year : Math.max(endYear, year);
    }
  }

  const orderedThemes = [...themeCounts.values()].sort(
    (a, b) => b.count - a.count
  );
  const strongThemes = orderedThemes.filter((t) => t.count >= 2).length;
  const spansThemes = strongThemes >= 2;
  const spansEras = decades.size >= 2;
  return {
    themes: orderedThemes.slice(0, 3).map((t) => t.label),
    startYear,
    endYear,
    spansThemes,
    spansEras,
    diversityScore: (spansEras ? 2 : 0) + (spansThemes ? 1 : 0),
  };
}

export async function getRemyConnections(
  supabase: DashboardSupabase,
  userId: string,
  opts: { limit?: number } = {}
): Promise<RemyConnection[]> {
  const memList = await fetchUserMemories(supabase, userId);
  if (memList.length < 2) return [];

  const memMap = new Map<string, ConnectionMemory>();
  for (const m of memList) memMap.set(m.id, m);
  const ids = memList.map((m) => m.id);

  const [outgoing, incoming] = await Promise.all([
    fetchRelationships(supabase, "memory_id", ids),
    fetchRelationships(supabase, "related_memory_id", ids),
  ]);

  const adjacency = new Map<string, Set<string>>();
  const link = (a: string | null, b: string | null) => {
    if (!a || !b || a === b) return;
    if (!memMap.has(a) || !memMap.has(b)) return;
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };
  for (const r of outgoing) link(r.memory_id, r.related_memory_id);
  for (const r of incoming) link(r.memory_id, r.related_memory_id);

  const raw: RemyConnection[] = [];
  for (const [id, set] of adjacency) {
    if (set.size < MIN_CONNECTED) continue;
    const anchor = memMap.get(id)!;
    const group: ConnectionMemory[] = [anchor];
    for (const neighborId of set) {
      const n = memMap.get(neighborId);
      if (n) group.push(n);
    }

    const d = analyzeDiversity(group);
    const diverse = d.diversityScore > 0;
    const title = diverse
      ? clean(anchor.ai_title) ||
        clean(anchor.title) ||
        "A connected memory"
      : d.themes[0] ||
        clean(anchor.ai_title) ||
        clean(anchor.title) ||
        "Connected memories";

    raw.push({
      id,
      title,
      summary: connectionSummary(d.spansEras, d.spansThemes),
      connectedCount: set.size,
      themes: d.themes,
      startYear: d.startYear,
      endYear: d.endYear,
      spansThemes: d.spansThemes,
      spansEras: d.spansEras,
      diversityScore: d.diversityScore,
      lastActiveAt: anchor.created_at,
    });
  }

  // Reduce redundancy: keep diverse connections individually, but collapse
  // single-theme hubs to one strongest representative per theme.
  const diverse = raw.filter((c) => c.diversityScore > 0);
  const byTheme = new Map<string, RemyConnection>();
  for (const c of raw) {
    if (c.diversityScore > 0) continue;
    const key = c.themes[0] ? slugify(c.themes[0]) : `anchor-${c.id}`;
    const existing = byTheme.get(key);
    if (!existing || c.connectedCount > existing.connectedCount) {
      byTheme.set(key, c);
    }
  }

  const connections = [...diverse, ...byTheme.values()];
  connections.sort(
    (a, b) =>
      b.diversityScore - a.diversityScore ||
      b.connectedCount - a.connectedCount ||
      new Date(b.lastActiveAt ?? 0).getTime() -
        new Date(a.lastActiveAt ?? 0).getTime()
  );

  return typeof opts.limit === "number"
    ? connections.slice(0, opts.limit)
    : connections;
}

export async function getRemyConnectionById(
  supabase: DashboardSupabase,
  userId: string,
  id: string
): Promise<{
  connection: RemyConnection;
  memories: ConnectionMemory[];
} | null> {
  const { data: anchorRow } = await supabase
    .from("memories")
    .select(
      "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category"
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!anchorRow) return null;
  const anchor = anchorRow as ConnectionMemory;

  const [outgoing, incoming] = await Promise.all([
    fetchRelationshipsEq(supabase, "memory_id", id),
    fetchRelationshipsEq(supabase, "related_memory_id", id),
  ]);

  const connectedIds = new Set<string>();
  for (const r of outgoing)
    if (r.related_memory_id) connectedIds.add(r.related_memory_id);
  for (const r of incoming) if (r.memory_id) connectedIds.add(r.memory_id);
  connectedIds.delete(id);

  let memories: ConnectionMemory[] = [];
  if (connectedIds.size > 0) {
    try {
      const { data } = await supabase
        .from("memories")
        .select(
          "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category"
        )
        .in("id", [...connectedIds].slice(0, 200))
        .eq("user_id", userId);
      memories = (data as ConnectionMemory[] | null) ?? [];
    } catch {
      memories = [];
    }
  }

  memories.sort(
    (a, b) =>
      resolveEffectiveDate(b).getTime() - resolveEffectiveDate(a).getTime()
  );

  const d = analyzeDiversity([anchor, ...memories]);
  const diverse = d.diversityScore > 0;
  const title = diverse
    ? clean(anchor.ai_title) || clean(anchor.title) || "A connected memory"
    : d.themes[0] ||
      clean(anchor.ai_title) ||
      clean(anchor.title) ||
      "Connected memories";

  return {
    connection: {
      id: anchor.id,
      title,
      summary: connectionSummary(d.spansEras, d.spansThemes),
      connectedCount: memories.length,
      themes: d.themes,
      startYear: d.startYear,
      endYear: d.endYear,
      spansThemes: d.spansThemes,
      spansEras: d.spansEras,
      diversityScore: d.diversityScore,
      lastActiveAt: anchor.created_at,
    },
    memories,
  };
}

// ── best-effort reads ───────────────────────────────────────────────────────
async function fetchUserMemories(
  supabase: DashboardSupabase,
  userId: string
): Promise<ConnectionMemory[]> {
  try {
    const { data } = await supabase
      .from("memories")
      .select(
        "id, title, ai_title, created_at, memory_date, memory_date_precision, ai_category"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MEMORY_SCAN_LIMIT);
    return (data as ConnectionMemory[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchRelationships(
  supabase: DashboardSupabase,
  column: "memory_id" | "related_memory_id",
  ids: string[]
): Promise<RelationshipRow[]> {
  if (ids.length === 0) return [];
  try {
    const { data } = await supabase
      .from("memory_relationships")
      .select("memory_id, related_memory_id")
      .in(column, ids);
    return (data as RelationshipRow[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchRelationshipsEq(
  supabase: DashboardSupabase,
  column: "memory_id" | "related_memory_id",
  id: string
): Promise<RelationshipRow[]> {
  try {
    const { data } = await supabase
      .from("memory_relationships")
      .select("memory_id, related_memory_id")
      .eq(column, id);
    return (data as RelationshipRow[] | null) ?? [];
  } catch {
    return [];
  }
}
