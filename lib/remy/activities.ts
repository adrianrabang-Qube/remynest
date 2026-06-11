import type { createClient } from "@/utils/supabase/server";
import type { RemyActivity } from "./types";
import {
  isHistoricalMemory,
  formatMemoryDateLabel,
} from "@/lib/memories/memory-date";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remy Activity model — Remy's EVIDENCE layer.
 *
 * Separate from observation generation by design:
 *   Remy Signals → Remy Observations   (what Remy concludes)
 *   Remy Signals → Remy Activities     (what Remy noticed, item by item)
 *
 * Both read the same existing dashboard data. This module is read-only,
 * deterministic, and human-first: every activity carries an icon + plain title
 * + plain description, and never exposes internal system language. Built for
 * reuse by future notifications / digests / push / family updates.
 */

// ── Source row shapes (minimal slices of existing tables) ───────────────────
export interface ActivityMemory {
  id: string;
  title?: string | null;
  ai_title?: string | null;
  created_at: string;
  memory_date?: string | null;
  memory_date_precision?: string | null;
}

export interface ActivityReminder {
  id: string;
  title?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
}

export interface ActivityCluster {
  id: string;
  title?: string | null;
  category?: string | null;
  created_at?: string | null;
}

export interface RemyActivitySources {
  memories: ActivityMemory[];
  reminders: ActivityReminder[];
  clusters: ActivityCluster[];
}

const DEFAULT_LIMIT = 8;

function memoryTitle(m: ActivityMemory): string {
  return (
    m.ai_title?.trim() ||
    m.title?.trim() ||
    "Untitled memory"
  );
}

function validTime(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

/**
 * Turn existing source rows into a human-readable activity feed (newest first).
 * Pure + deterministic. Only the activity types derivable from existing data
 * are produced; anything unsupported is simply absent (graceful).
 */
export function buildRemyActivities(
  sources: RemyActivitySources,
  limit: number = DEFAULT_LIMIT
): RemyActivity[] {
  const items: RemyActivity[] = [];

  // 1 + 2 — Historical memory preserved / Memory added (one per memory).
  for (const m of sources.memories) {
    if (!validTime(m.created_at)) continue;
    if (isHistoricalMemory(m)) {
      items.push({
        id: `historical-${m.id}`,
        kind: "historical-preserved",
        icon: "🕰",
        title: "Historical memory preserved",
        description: formatMemoryDateLabel({
          created_at: m.created_at,
          memory_date: m.memory_date,
          memory_date_precision: m.memory_date_precision,
        }),
        timestamp: m.created_at,
        href: `/memories/${m.id}`,
      });
    } else {
      items.push({
        id: `memory-${m.id}`,
        kind: "memory-added",
        icon: "✏️",
        title: "Memory added",
        description: memoryTitle(m),
        timestamp: m.created_at,
        href: `/memories/${m.id}`,
      });
    }
  }

  // 4 — Reminder completed (existing reminder telemetry).
  for (const r of sources.reminders) {
    if (!r.completed || !validTime(r.completed_at)) continue;
    items.push({
      id: `reminder-${r.id}`,
      kind: "reminder-completed",
      icon: "🔔",
      title: "Reminder completed",
      description: r.title?.trim() || "Reminder",
      timestamp: r.completed_at as string,
      href: "/reminders",
    });
  }

  // 5 — Collection discovery (existing grouping data only; human language).
  for (const c of sources.clusters) {
    if (!validTime(c.created_at)) continue;
    const rawLabel = c.title?.trim() || c.category?.trim() || "";
    const label =
      rawLabel && !/cluster/i.test(rawLabel)
        ? rawLabel
        : "Memory Collection";
    items.push({
      id: `collection-${c.id}`,
      kind: "collection-discovered",
      icon: "🧠",
      title: "New collection discovered",
      description: label,
      timestamp: c.created_at as string,
      href: "/collections",
    });
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    )
    .slice(0, limit);
}

/**
 * Fetch the activity source rows from existing tables — read-only, best-effort
 * (each query degrades to [] on failure, so the feed never breaks the dashboard
 * or invents data). Reminders are passed in from the dashboard's existing fetch
 * to avoid a duplicate read.
 */
export async function fetchRemyActivitySources(
  supabase: DashboardSupabase,
  args: { memoryProfileId: string | null; userId: string }
): Promise<{ memories: ActivityMemory[]; clusters: ActivityCluster[] }> {
  const [memories, clusters] = await Promise.all([
    fetchRecentMemories(supabase, args.memoryProfileId),
    fetchRecentClusters(supabase, args.userId),
  ]);
  return { memories, clusters };
}

async function fetchRecentMemories(
  supabase: DashboardSupabase,
  memoryProfileId: string | null
): Promise<ActivityMemory[]> {
  try {
    let q = supabase
      .from("memories")
      .select(
        "id, title, ai_title, created_at, memory_date, memory_date_precision"
      )
      .order("created_at", { ascending: false })
      .limit(15);
    q = memoryProfileId
      ? q.eq("memory_profile_id", memoryProfileId)
      : q.is("memory_profile_id", null);
    const { data } = await q;
    return (data as ActivityMemory[] | null) ?? [];
  } catch {
    return [];
  }
}

async function fetchRecentClusters(
  supabase: DashboardSupabase,
  userId: string
): Promise<ActivityCluster[]> {
  try {
    const { data } = await supabase
      .from("memory_clusters")
      .select("id, title, category, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    return (data as ActivityCluster[] | null) ?? [];
  } catch {
    return [];
  }
}
