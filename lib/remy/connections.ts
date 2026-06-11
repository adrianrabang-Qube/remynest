import type { createClient } from "@/utils/supabase/server";
import { resolveEffectiveDate } from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remy Connections — Remy's "find related moments" capability.
 *
 * The human face of the existing stored memory-relationship data. This model is
 * the ONLY place that reads the underlying relationship table; everything above
 * speaks in human terms (Connection / Connected Moments / Shared Story) and
 * never exposes "similarity", "vector", "embedding", or a score.
 *
 *   Memory relationships (existing data) → Remy Connections
 *
 * Read-only, best-effort, no AI, no recompute. Degrades to an empty list when
 * the relationship data is missing or unreadable.
 */
export interface RemyConnection {
  /** Anchor memory id — the moment other memories connect to. */
  id: string;
  title: string;
  /** Human theme (anchor's category), e.g. "Family", "Childhood". */
  theme: string | null;
  /** How many other memories are connected to this one. */
  connectedCount: number;
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

/** A connection only reads as a "shared story" with 2+ connected moments. */
const MIN_CONNECTED = 2;
const MEMORY_SCAN_LIMIT = 400;

function clean(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function connectionTitle(m: ConnectionMemory): string {
  return (
    clean(m.ai_title) ||
    clean(m.title) ||
    clean(m.ai_category) ||
    "Connected memories"
  );
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

  // Undirected adjacency among the user's accessible memories.
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

  const connections: RemyConnection[] = [];
  for (const [id, set] of adjacency) {
    if (set.size < MIN_CONNECTED) continue;
    const m = memMap.get(id)!;
    connections.push({
      id,
      title: connectionTitle(m),
      theme: clean(m.ai_category),
      connectedCount: set.size,
      lastActiveAt: m.created_at,
    });
  }

  connections.sort(
    (a, b) =>
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
  for (const r of outgoing) if (r.related_memory_id) connectedIds.add(r.related_memory_id);
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

  return {
    connection: {
      id: anchor.id,
      title: connectionTitle(anchor),
      theme: clean(anchor.ai_category),
      connectedCount: memories.length,
      lastActiveAt: anchor.created_at,
    },
    memories,
  };
}

// ── Best-effort reads ───────────────────────────────────────────────────────
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
